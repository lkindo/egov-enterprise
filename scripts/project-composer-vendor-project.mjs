/**
 * 생성물 소스를 벤더 값으로 투영한다(ADR-0047 D-11, 설계서 §8).
 *
 * PostgreSQL 번들은 번역의 근거이자 권한·하네스 대조의 입력이라 생성물에 그대로 둔다. 번역한 기준선은 벤더 폴더에 두고 Flyway 가 그 폴더만 본다.
 * 드라이버·방언·Flyway 플러그인·접속 기본값은 벤더 값으로 바꾼다. 문자열을 바꿀 자리가 없으면 멈춘다 — 원본이 바뀌어 조용히 PostgreSQL 설정이
 * 남는 일을 막는다.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { artifactTextSha256, vendorBaselinePaths } from './reusable-governance-integrity.mjs';
import { VENDOR_SCHEMA_SCOPE, vendorInputPath } from './verify-reusable-artifact.mjs';
import { buildVendorModel } from './project-composer-vendor-model.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';
import { readVendorAssetLedger } from './reusable-vendor-assets.mjs';
import { ARTIFACT_COMMAND } from './reusable-artifact-entrypoints-contract.mjs';
import { VENDOR_SOURCE } from './project-composer-vendor-source.mjs';

export { VENDOR_SOURCE };

const RESOURCES = 'api-server/src/main/resources';
/** classpath 접두사를 뺀 Flyway 위치. 경로의 정본은 거버넌스가 대조하는 vendorBaselinePaths 다. */
export const vendorMigrationLocation = vendorId => vendorBaselinePaths(vendorId).location.replace('classpath:', '');

export const VENDOR_SCHEMA_ALIAS = 'verify:vendor-schema';

function replaceRequired(text, pattern, replacement, label) {
  const replaced = text.replace(pattern, replacement);
  if (replaced === text) throw new Error(`벤더 투영 자리를 찾지 못했다: ${label}`);
  return replaced;
}

/**
 * 어댑터 문장을 Flyway SQL 파일로 쓴다. 일반 문장은 세미콜론으로, 블록 문장은 슬래시 줄로 끝낸다.
 * 문장 안의 세미콜론은 Flyway 파서가 문자열로 건너뛴다.
 */
export function renderFlywayMigration(statements) {
  return `${statements.map(({ sql, raw }) => (raw ? `${sql}\n/` : `${sql};`)).join('\n')}\n`;
}

/** 스키마·시드·다음 값 맞춤을 문장 한 벌로 잇는다. 적용 순서가 곧 이 순서다. */
export function vendorMigrationStatements(vendorId, input) {
  const adapter = VENDOR_ADAPTERS[vendorId];
  if (!adapter) throw new Error(`어댑터가 없는 벤더: ${vendorId}`);
  const model = buildVendorModel({ snapshot: input.snapshot, extras: input.extras });
  return [...adapter.emitSchema(model).statements,
    ...adapter.emitSeed(model, input.rows).map(sql => ({ sql })),
    ...adapter.emitSequenceSync(model, input.rows).map(sql => ({ sql }))];
}

/** 빌드 파일의 드라이버와 Flyway 플러그인을 바꾼다. 시험용 Oracle 드라이버 줄은 런타임 드라이버와 겹치므로 뺀다. */
export function projectVendorBuild(text, vendorId) {
  const source = VENDOR_SOURCE[vendorId];
  let projected = replaceRequired(text, /implementation 'org\.flywaydb:flyway-database-postgresql'/, `implementation '${source.flywayPlugin}'`, 'Flyway 플러그인');
  projected = replaceRequired(projected, /implementation libs\.postgresql\b/, `runtimeOnly '${source.driverCoordinate}'`, 'JDBC 드라이버');
  return projected.replace(/^[ \t]*\/\/ vendorIntegrationTest 가 벤더 DB 에 붙는 드라이버.*\r?\n[ \t]*testRuntimeOnly 'com\.oracle\.database\.jdbc:ojdbc11:[^']*'\r?\n/m, '');
}

/** 프로필별 설정의 PostgreSQL 값을 바꾼다. 개발용 추가 시드는 PostgreSQL 문장이라 Flyway 위치에서 함께 빠진다. */
export function projectVendorProfile(text, vendorId) {
  const source = VENDOR_SOURCE[vendorId];
  return text
    .replace(/jdbc:postgresql:\/\/[^}\s"']*/g, source.url)
    .replace(/driver-class-name: org\.postgresql\.Driver/g, `driver-class-name: ${source.driverClass}`)
    .replace(/^(\s*locations:\s*).*classpath:db\/migration.*$/gm, `$1classpath:${vendorMigrationLocation(vendorId)}`);
}

/** 공통 설정 뒤에 붙는 벤더 문서. 뒤 문서가 앞 문서의 같은 키를 이긴다. 시드에 `${` 가 있을 수 있어 Flyway 치환을 끈다. */
export function vendorApplicationDocument(vendorId) {
  const { dialect } = VENDOR_SOURCE[vendorId];
  return ['---', '# 생성기가 벤더 값으로 투영했다(ADR-0047).', 'app:', '  database:', `    vendor: ${vendorId}`, 'spring:', '  flyway:',
    `    locations: classpath:${vendorMigrationLocation(vendorId)}`, '    placeholder-replacement: false', '  jpa:', '    properties:', '      hibernate:', `        dialect: ${dialect}`, ''].join('\n');
}

/** 개발 스택의 DB 서비스와 앱 접속값을 벤더로 바꾼다. */
export function projectVendorCompose(text, vendorId) {
  const source = VENDOR_SOURCE[vendorId];
  const service = replaceRequired(text, /^ {2}db:\n[\s\S]*?(?=^ {2}api:\n)/m, source.composeService, 'compose db 서비스');
  const urls = replaceRequired(service, /jdbc:postgresql:\/\/db:5432\/egovdb/g, source.composeUrl, 'compose 접속 주소');
  const volume = replaceRequired(urls, /\bpostgres_data\b/g, source.composeVolume, 'compose 볼륨');
  // 환경 변수가 설정 파일을 이긴다. 두면 Oracle 에 PostgreSQL 번들을 적용한다.
  const flyway = replaceRequired(volume, /classpath:db\/migration(?:,classpath:db\/seed-dev)?/g, vendorBaselinePaths(vendorId).location, 'compose Flyway 위치');
  // 개발 시드가 없어 webmaster 는 로그인 불가 상태로 시작한다. 알려진 비밀번호를 산출물에 늘리지 않고 값은 바깥에서 받는다.
  return replaceRequired(flyway, /^( {6})SPRING_FLYWAY_LOCATIONS:/m, '$1ADMIN_INITIAL_PASSWORD: ${ADMIN_INITIAL_PASSWORD:-}\n$1SPRING_FLYWAY_LOCATIONS:', 'compose 관리자 비밀번호');
}

/** 운영 오버레이의 DB 자격을 벤더 이미지의 환경 변수로 바꾼다. */
export function projectVendorComposeProd(text, vendorId) {
  const credentials = VENDOR_SOURCE[vendorId].composeProd.reduce((projected, [pattern, replacement]) => replaceRequired(projected, pattern, replacement, 'compose 운영 자격'), text);
  return replaceRequired(credentials, /classpath:db\/migration/g, vendorBaselinePaths(vendorId).location, 'compose 운영 Flyway 위치');
}

/** 배포 스크립트가 받는 번들 DB 주소를 바꾼다. */
export function projectVendorDeploy(text, vendorId) {
  const { composeUrl } = VENDOR_SOURCE[vendorId];
  const required = replaceRequired(text, /^(for v in [^\n]*\bDB_PASSWORD\b)/m, '$1 DB_ADMIN_PASSWORD', '배포 스크립트 필수 변수');
  const guarded = replaceRequired(required, /jdbc:postgresql:\/\/db:5432\/egovdb\|jdbc:postgresql:\/\/db:5432\/egovdb\\\?\*\)/, `${composeUrl})`, '배포 스크립트 주소 검사');
  return replaceRequired(guarded, /jdbc:postgresql:\/\/db:5432\/egovdb/g, composeUrl, '배포 스크립트 안내');
}

/** 이관 모듈을 빌드 입력에서 뺀다. 없는 경로를 COPY 하면 이미지 빌드가 멈춘다. */
export function projectVendorDockerfile(text) {
  return replaceRequired(text, /^COPY migration-tool\/build\.gradle [^\n]*\r?\n/m, '', 'Dockerfile 이관 모듈');
}

export function projectVendorSettings(text) {
  return replaceRequired(text, /^include 'migration-tool'\r?\n/m, '', 'settings.gradle 이관 모듈');
}

/** 예시 환경 파일의 접속 주소를 바꾼다. */
export function projectVendorEnvironment(text, vendorId) {
  const url = replaceRequired(text, /^DB_URL=jdbc:postgresql:[^\n]*$/m, `DB_URL=${VENDOR_SOURCE[vendorId].url}`, '.env.example 접속 주소');
  return replaceRequired(url, /^(DB_PASSWORD=[^\n]*)$/m, '$1\n# 운영 번들 DB 의 SYS 비밀번호. 앱 비밀번호와 다르게 둔다.\nDB_ADMIN_PASSWORD=change-me\n# 최초 관리자(webmaster) 비밀번호. 개발 시드가 없어 값을 정해야 로그인할 수 있다.\n# ADMIN_INITIAL_PASSWORD=', '.env.example 비밀번호');
}

export const vendorReadme = vendorId => `
## 데이터베이스

이 프로젝트는 ${vendorId} 로 생성했다. Flyway 는 \`${vendorBaselinePaths(vendorId).location.replace('classpath:', '')}\` 폴더만 적용한다(생성 시점에는 번역 기준선 하나). \`db/migration\` 의 PostgreSQL 파일은 번역의 근거이고 실행되지 않는다.

\`docker-compose.yml\` 의 DB 이미지는 개발용이다. 운영 라이선스는 도입 기관이 확보한다.

이 프로젝트에는 PostgreSQL 개발 시드(\`db/seed-dev\`)가 적용되지 않아 \`webmaster\` 는 로그인할 수 없는 상태로 시작한다. 개발 스택을 올리기 전에 \`.env\` 의 \`ADMIN_INITIAL_PASSWORD\` 에 비밀번호를 정하면 첫 기동 때 한 번 설정된다. 이미 정한 비밀번호는 덮어쓰지 않는다.

PostgreSQL 에서만 동작하는 도구는 이 프로젝트에 없다: 레거시 이관 도구, 백업·복원 훈련, 무중단 마이그레이션 린터, 엔티티·스키마 정적 린터(아래 카탈로그 시험이 대신한다), 릴리스 스모크, 화면 기준선 실행기. 목록과 사유는 \`config/governance/vendor-removed-assets.json\` 에 있다. \`docs/\` 의 운영 문서는 원본 기준이라 PostgreSQL 절차를 그대로 담고 있다. 백업·복원은 기관이 이 DB 에 맞게 준비한다. 격리 E2E 실행기는 대표 묶음만 돌린다: \`node scripts/run-isolated-e2e.mjs --representative\`. 시험 목록은 \`config/governance/vendor-test-ledger.json\` 이 고정하고, 원장의 기능을 모두 고른 멀티모듈 생성물이 아니면 시작 전에 멈춘다.

### 생성 뒤 스키마 변경

1. 벤더 문법으로 \`${RESOURCES}/db/vendor/${vendorId}\` 에 \`V1_1__설명.sql\` 처럼 기준선(\`V1_0\`)보다 높은 버전의 파일을 더한다. 번역 기준선(\`V1_0__vendor_baseline.sql\`)은 고치지 않는다. 반복 마이그레이션(\`R__\`)은 지원하지 않는다.
2. \`npm run verify:vendor-schema\` 로 검사한다. 하네스를 돌린 뒤 일회용 DB 에 기준선만 적용해 번역 결과와 정확히 대조하고, 나머지 마이그레이션을 적용해 카탈로그 시험과 시나리오 시험을 돌린다. 컨테이너가 필요해 시간이 걸린다.
3. \`db/migration\` 은 고치지 않는다. 실행되지 않는 번역 근거이고, 명명·유니크 미러 린터는 이 입력만 본다.

카탈로그 시험은 적용된 DB 를 읽는다. 카탈로그 전체에서 PK 전략·숫자 변환·길이 초과를, 기준선 뒤에 생긴 객체에서 표·제약·인덱스·시퀀스 이름(\`tb_\`·\`pk_\`·\`fk_\`·\`uk_\`·\`ck_\`·\`ix_\`·\`sq_\`), 새 표의 감사 컬럼, 새 컬럼의 고정 문자형을, 기준선 뒤에 생기거나 다시 만든 유니크의 엔티티 미러(기본키 제외)를, 뷰 이름(\`vw_\`)을 본다. 표·컬럼 부재와 타입 계열은 시나리오 시험을 띄울 때 Hibernate validate 가 본다.

기존 권한의 기본 그룹을 바꾸려면 \`config/governance/permission-catalog.json\` 과 벤더 DB 의 부여를 함께 맞춘다. \`npm run regen\` 은 \`db/migration\` 의 시드만 고치므로 벤더 마이그레이션에 부여 변경을 직접 넣는다. 둘이 어긋나면 카탈로그 시험이 붉다.

이 명령은 인증이 아니다. 생성물 전체 검증(\`npm run verify\`)은 소스가 바뀌면 인증 증거가 낡았다고 첫 단계에서 멈추는 것이 정상이고, 이 명령은 그 단계를 지나지 않는다.

지원하지 않는 것:

- 파괴적 DDL 검사: 무중단 마이그레이션 린터가 없다. 컬럼 삭제·타입 축소·이름 변경의 무중단 여부는 사람이 판단한다.
- 명명 예외: 카탈로그 시험에는 예외를 적을 자리가 없다. 표준 밖의 이름은 붉다.
- 이름 없이 만든 제약: DB 가 지은 이름(Oracle 의 \`SYS_C\`)은 조회에서 빠져 이름 규칙이 보지 않는다. 제약에는 이름을 붙인다. 이름 없는 유니크는 엔티티가 매핑된 표일 때만 미러 규칙이 본다.
- 뷰의 정의: 뷰는 이름만 본다. 컬럼과 정의는 시험을 직접 더한다.
- 도입자가 더한 CHECK·트리거의 의미: 차등 시험은 번역 입력만 보므로 PostgreSQL 과 같은 값으로 대조되지 않는다. 시험을 직접 더한다.
- 같은 이름의 컬럼 타입 변경: 새 객체가 아니어서 고정 문자형 규칙이 보지 않는다. Oracle 은 Hibernate validate 가 \`VARCHAR2\` 와 CLOB 을 구분하지 못하므로 짧은 컬럼을 CLOB 으로 바꾸지 않았는지 사람이 확인한다.
- 새 권한 코드: 권한 코드는 구성과 정확히 일치해야 해 \`npm run regen\` 이 멈춘다. PostgreSQL 프로젝트와 같다.
- 새 Java 소스: 생성물의 소스 모집단은 투영 기록과 정확히 일치해야 해 새 엔티티·서비스를 더하면 하네스가 붉다. PostgreSQL 프로젝트와 같다. 기존 엔티티의 필드 변경은 된다.
- \`scripts/domain-registration-doctor.mjs\` 는 \`db/migration\` 만 읽으므로 벤더 폴더의 새 표를 보지 못한다.
`;

/** 생성물 트리를 벤더로 투영한다. 소스 생성기가 PostgreSQL 번들을 설치한 뒤 부른다. */
export function projectVendorSources(output, { vendorId, input, inputText, layout }) {
  if (!VENDOR_SOURCE[vendorId]) throw new Error(`소스 투영이 없는 벤더: ${vendorId}`);
  const { location, migration } = vendorBaselinePaths(vendorId);
  mkdirSync(join(output, RESOURCES, vendorMigrationLocation(vendorId)), { recursive: true });
  const statements = vendorMigrationStatements(vendorId, input);
  writeFileSync(join(output, migration), renderFlywayMigration(statements), 'utf8');
  // 생성물 검증이 같은 입력으로 벤더 DB 를 올린다. 잠금이 번들과 이 파일을 묶는다.
  const inputPath = vendorInputPath(vendorId);
  mkdirSync(join(output, dirname(inputPath)), { recursive: true });
  writeFileSync(join(output, inputPath), inputText, 'utf8');

  // 단일모듈은 의존성을 루트 빌드 파일로 합친다.
  const buildFile = layout === 'single-module' ? 'build.gradle' : 'api-server/build.gradle';
  writeFileSync(join(output, buildFile), projectVendorBuild(readFileSync(join(output, buildFile), 'utf8'), vendorId), 'utf8');

  const resources = join(output, RESOURCES);
  const profiles = readdirSync(resources).filter(name => /^application(-[\w-]+)?\.yml$/.test(name)).sort();
  for (const name of profiles) writeFileSync(join(resources, name), projectVendorProfile(readFileSync(join(resources, name), 'utf8'), vendorId), 'utf8');
  const common = join(resources, 'application.yml');
  writeFileSync(common, `${readFileSync(common, 'utf8').replace(/\s*$/, '\n')}${vendorApplicationDocument(vendorId)}`, 'utf8');

  const dockerfile = join(output, 'api-server/Dockerfile');
  writeFileSync(dockerfile, projectVendorDockerfile(readFileSync(dockerfile, 'utf8')), 'utf8');
  // 단일모듈은 조립할 때 include 를 이미 지웠다.
  if (layout !== 'single-module') {
    const settings = join(output, 'settings.gradle');
    writeFileSync(settings, projectVendorSettings(readFileSync(settings, 'utf8')), 'utf8');
  }

  const compose = join(output, 'docker-compose.yml');
  writeFileSync(compose, projectVendorCompose(readFileSync(compose, 'utf8').replace(/\r\n/g, '\n'), vendorId), 'utf8');
  const composeProd = join(output, 'docker-compose.prod.yml');
  writeFileSync(composeProd, projectVendorComposeProd(readFileSync(composeProd, 'utf8').replace(/\r\n/g, '\n'), vendorId), 'utf8');
  const deploy = join(output, 'scripts/deploy.sh');
  writeFileSync(deploy, projectVendorDeploy(readFileSync(deploy, 'utf8').replace(/\r\n/g, '\n'), vendorId), 'utf8');
  const environment = join(output, '.env.example');
  writeFileSync(environment, projectVendorEnvironment(readFileSync(environment, 'utf8').replace(/\r\n/g, '\n'), vendorId), 'utf8');
  // 생성 뒤 스키마 변경을 검사하는 별칭. 전체 검증과 달리 인증 단계를 지나지 않는다.
  const packagePath = join(output, 'package.json');
  const pkg = JSON.parse(readFileSync(packagePath, 'utf8'));
  pkg.scripts[VENDOR_SCHEMA_ALIAS] = `${ARTIFACT_COMMAND} --scope ${VENDOR_SCHEMA_SCOPE}`;
  writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`, 'utf8');
  const readme = join(output, 'README.md');
  writeFileSync(readme, `${readFileSync(readme, 'utf8').replace(/\s*$/, '\n')}${vendorReadme(vendorId)}`, 'utf8');

  return { vendor: vendorId, location, migration, migrationSha256: artifactTextSha256(output, migration), input: inputPath,
    inputSha256: artifactTextSha256(output, inputPath), statements: statements.length, buildFile, profiles, removedAssets: readVendorAssetLedger(output).assets };
}
