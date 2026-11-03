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
import { VENDOR_ADAPTERS, loadVendorLedger, unshownDegradations } from './project-composer-vendors.mjs';
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
 * 블록 문장(PL/SQL·트리거)의 끝. Oracle 은 슬래시 줄이다. MySQL 계열은 본문의 세미콜론이 문장을 끊지 않게 DELIMITER 로 감싼다 — Flyway 의 MySQL 파서가 받는
 * 형식이고, 대상 DB 대조가 쓰는 클라이언트 배치(mysqlBatch)와 같은 구분자다.
 */
const FLYWAY_BLOCK_END = Object.freeze({
  oracle: sql => `${sql}\n/`,
  mysql: sql => `DELIMITER $$\n${sql}$$\nDELIMITER ;`,
  mariadb: sql => `DELIMITER $$\n${sql}$$\nDELIMITER ;`,
});

/**
 * 어댑터 문장을 Flyway SQL 파일로 쓴다. 일반 문장은 세미콜론으로, 블록 문장은 벤더의 블록 끝으로 끝낸다.
 * 문장 안의 세미콜론은 Flyway 파서가 문자열로 건너뛴다.
 */
export function renderFlywayMigration(statements, vendorId) {
  const block = FLYWAY_BLOCK_END[vendorId];
  if (!block) throw new Error(`블록 문장을 끝낼 형식이 없는 벤더: ${vendorId}`);
  return `${statements.map(({ sql, raw }) => (raw ? block(sql) : `${sql};`)).join('\n')}\n`;
}

/**
 * 스키마·시드·다음 값 맞춤을 문장 한 벌로 잇는다. 적용 순서가 곧 이 순서다.
 * 모델 유래 저하는 실제 모델이 있어야 전부 보인다. 화면과 README 가 말하지 않는 저하를 담은 문장은 내지 않는다 — 쓰는 문장과 같은 번역 결과로 대조한다.
 */
export function vendorMigrationStatements(vendorId, input, ledger) {
  const adapter = VENDOR_ADAPTERS[vendorId];
  if (!adapter) throw new Error(`어댑터가 없는 벤더: ${vendorId}`);
  const model = buildVendorModel({ snapshot: input.snapshot, extras: input.extras });
  const schema = adapter.emitSchema(model);
  const unshown = unshownDegradations(ledger.vendors.find(vendor => vendor.id === vendorId), schema.degradations);
  if (unshown.length) throw new Error(`표시 문장이 없는 벤더 저하: ${unshown.join(', ')}. config/db-vendors.json 의 notices 에 더한다.`);
  return [...schema.statements,
    ...adapter.emitSeed(model, input.rows).map(sql => ({ sql })),
    ...adapter.emitSequenceSync(model, input.rows).map(sql => ({ sql }))];
}

const escapeRegExp = value => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** 원본의 통합 시험용 드라이버 줄. 판은 소스 투영 값과 같으므로 그룹·이름으로 찾는다. */
const VENDOR_TEST_DRIVER_LINES = new RegExp(String.raw`^[ \t]*\/\/ vendorIntegrationTest 가 벤더 DB 에 붙는 드라이버.*\r?\n(?:[ \t]*testRuntimeOnly '(?:`
  + Object.values(VENDOR_SOURCE).map(source => escapeRegExp(source.driverCoordinate.replace(/:[^:]+$/, ''))).join('|') + String.raw`):[^']*'\r?\n)+`, 'm');

/**
 * 빌드 파일의 드라이버와 Flyway 플러그인을 바꾼다. 원본의 통합 시험용 벤더 드라이버 줄은 모두 뺀다 — 그 벤더의 줄은 런타임 드라이버와 겹치고,
 * 다른 벤더의 줄은 이 프로젝트가 쓰지 않는다.
 */
export function projectVendorBuild(text, vendorId) {
  const source = VENDOR_SOURCE[vendorId];
  let projected = replaceRequired(text, /implementation 'org\.flywaydb:flyway-database-postgresql'/, `implementation '${source.flywayPlugin}'`, 'Flyway 플러그인');
  projected = replaceRequired(projected, /implementation libs\.postgresql\b/, `runtimeOnly '${source.driverCoordinate}'`, 'JDBC 드라이버');
  return projected.replace(VENDOR_TEST_DRIVER_LINES, '');
}

/**
 * 프로필별 설정의 PostgreSQL 값을 바꾼다. 개발용 추가 시드는 PostgreSQL 문장이라 Flyway 위치에서 함께 빠진다.
 * 접속 주소는 함수로 넣는다. 주소의 따옴표가 바꿀 문자열의 `$'` 같은 치환 기호와 이어지지 않게 한다.
 */
export function projectVendorProfile(text, vendorId) {
  const source = VENDOR_SOURCE[vendorId];
  return text
    .replace(/jdbc:postgresql:\/\/[^}\s"']*/g, () => source.url)
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
  const urls = replaceRequired(service, /jdbc:postgresql:\/\/db:5432\/egovdb/g, () => source.composeUrl, 'compose 접속 주소');
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

/** case 패턴의 글자 그대로인 주소. 접속 인자의 따옴표·&·? 는 셸 문법이나 패턴이 되므로 큰따옴표로 감싸고, 그런 글자가 없으면 그대로 둔다. */
const casePattern = value => (/^[\w:/@.-]+$/.test(value) ? value : `"${value}"`);

/** 배포 스크립트가 받는 번들 DB 주소를 바꾼다. 접속 인자까지 같은 주소만 받는다 — 인자가 빠지면 세션 시간대·콜레이션이 달라진다. */
export function projectVendorDeploy(text, vendorId) {
  const { composeUrl } = VENDOR_SOURCE[vendorId];
  const required = replaceRequired(text, /^(for v in [^\n]*\bDB_PASSWORD\b)/m, '$1 DB_ADMIN_PASSWORD', '배포 스크립트 필수 변수');
  const guarded = replaceRequired(required, /jdbc:postgresql:\/\/db:5432\/egovdb\|jdbc:postgresql:\/\/db:5432\/egovdb\\\?\*\)/, () => `${casePattern(composeUrl)})`, '배포 스크립트 주소 검사');
  return replaceRequired(guarded, /jdbc:postgresql:\/\/db:5432\/egovdb/g, () => composeUrl, '배포 스크립트 안내');
}

/** 이관 모듈을 빌드 입력에서 뺀다. 없는 경로를 COPY 하면 이미지 빌드가 멈춘다. */
export function projectVendorDockerfile(text) {
  return replaceRequired(text, /^COPY migration-tool\/build\.gradle [^\n]*\r?\n/m, '', 'Dockerfile 이관 모듈');
}

export function projectVendorSettings(text) {
  return replaceRequired(text, /^include 'migration-tool'\r?\n/m, '', 'settings.gradle 이관 모듈');
}

/** 운영 오버레이가 DB_ADMIN_PASSWORD 로 받는 번들 DB 관리자 계정(VENDOR_SOURCE 의 composeProd). */
const ADMIN_ACCOUNT = Object.freeze({ oracle: 'SYS', mysql: 'root', mariadb: 'root' });

/** 예시 환경 파일의 접속 주소를 바꾼다. */
export function projectVendorEnvironment(text, vendorId) {
  const url = replaceRequired(text, /^DB_URL=jdbc:postgresql:[^\n]*$/m, () => `DB_URL=${VENDOR_SOURCE[vendorId].url}`, '.env.example 접속 주소');
  return replaceRequired(url, /^(DB_PASSWORD=[^\n]*)$/m, `$1\n# 운영 번들 DB 의 ${ADMIN_ACCOUNT[vendorId]} 비밀번호. 앱 비밀번호와 다르게 둔다.\nDB_ADMIN_PASSWORD=change-me\n# 최초 관리자(webmaster) 비밀번호. 개발 시드가 없어 값을 정해야 로그인할 수 있다.\n# ADMIN_INITIAL_PASSWORD=`, '.env.example 비밀번호');
}

/** README 본문은 원본 그대로 두고 이 절을 끝에 덧붙이므로, 본문과 어긋나는 자리에서 어느 쪽을 따를지 첫머리에 말한다. */
export const VENDOR_README_PRECEDENCE = '위 본문의 PostgreSQL 설치·시드·이관·스키마 검증 안내는 이 프로젝트에 맞지 않고 이 절이 우선한다.';

/** README 의 Oracle 문장. 도입자가 스키마를 바꿀 때 닿는 Oracle 한계(설계서 §6.1·§17)다. */
const ORACLE_README = Object.freeze({
  subject: 'Oracle 은',
  mirror: '기준선 뒤에 생기거나 다시 만든 유니크의 엔티티 미러(기본키 제외, 일반 인덱스로 집행되는 유니크 제약 포함)를, 기준선 뒤에 바이트 길이가 된 컬럼의 엔티티 길이를, ',
  session: [],
  columns: '문자 컬럼은 `VARCHAR2(n CHAR)` 로 쓴다. `VARCHAR2(n)` 은 세션 기본값인 바이트 길이가 되어 한글이 n/3 자부터 거부되는데, 드라이버가 두 경우를 같은 길이로 답해 길이 규칙으로는 구분되지 않는다. 그래서 기준선 뒤에 바이트 길이가 된 컬럼을 따로 읽어 엔티티에 매핑된 문자열 필드의 길이 × 4 가 바이트 길이보다 크면 붉힌다. 엔티티에 매핑되지 않은 컬럼은 이 규칙이 보지 못하고, 기준선에서 어댑터가 바이트 길이로 둔 컬럼(LOB 를 키로 쓸 수 없어 둔 `VARCHAR2(4000 BYTE)`)은 대상이 아니다.',
  quoted: '- 따옴표로 만든 이름: `"bad-name"`·`"게시판"` 처럼 형식 밖의 이름은 조회를 읽지 못해 멈춘다. 표는 소문자 저장 표기(`"tb_log"`)도 붉지만, 제약·인덱스·시퀀스·컬럼·뷰의 저장 표기는 소문자로 접어 읽어 보지 못한다. 따옴표 없는 SQL 이 그런 객체를 찾지 못할 수 있으니 따옴표를 쓰지 않는다.',
  unnamed: '- 이름 없이 만든 제약: DB 가 지은 이름(Oracle 의 `SYS_C`)은 조회에서 빠져 이름 규칙이 보지 않는다. 제약에는 이름을 붙인다. 이름 없는 유니크는 엔티티가 매핑된 표일 때만 미러 규칙이 본다.',
  typeChange: ' Oracle 은 Hibernate validate 가 `VARCHAR2` 와 CLOB 을 구분하지 못하므로 짧은 컬럼을 CLOB 으로 바꾸지 않았는지 사람이 확인한다.',
  extra: ['- CLOB 컬럼의 비교·정렬: Oracle 의 CLOB 컬럼(기준선에서는 `text`·`json` 컬럼과, 키·인덱스에 쓰이지 않는 글자 수 1,000 초과 문자열. 키·인덱스에 쓰여 `VARCHAR2(4000 BYTE)` 로 둔 문자열은 해당하지 않는다)은 `=`·`DISTINCT`·`ORDER BY`·`GROUP BY`·인덱스를 쓸 수 없다. 이 명령은 기존 시나리오 시험이 부르는 쿼리만 돌리므로 새 쿼리가 그런 컬럼을 쓰는지는 사람이 확인한다.'],
});

/**
 * README 의 MySQL 계열 문장. 접속 인자·키 바이트·콜레이션·DB 가 지은 이름은 2026-11-04 MySQL 8.4·MariaDB 11.4 실측이다.
 * MySQL 은 CREATE UNIQUE INDEX 도 제약으로 보여 미러 규칙에 Oracle 같은 예외가 없고, 바이트 길이 규칙은 Oracle 에만 있다.
 */
function innoDbReadme(vendorId) {
  const maria = vendorId === 'mariadb';
  const [timeZone, collation] = VENDOR_SOURCE[vendorId].urlParameters.split('&');
  return {
    subject: maria ? 'MariaDB 는' : 'MySQL 은',
    mirror: '기준선 뒤에 생기거나 다시 만든 유니크의 엔티티 미러(기본키 제외)를, ',
    session: [
      `접속 주소(\`DB_URL\`)의 \`${timeZone}\` 는 DB 의 \`NOW()\`·\`CURRENT_TIMESTAMP\`·\`CURRENT_DATE\` 를 한국 시각으로 맞추고(서버에 시간대 표가 없어도 된다), \`${collation}\` 은 연결의 문자열 리터럴과 \`CAST\` 결과를 표와 같은 이진 콜레이션으로 맞춘다. 운영 \`DB_URL\` 에도 두 인자를 그대로 둔다 — 시간대 인자를 빼면 서버 시간대가 UTC 일 때 한국 0시~9시의 \`CURRENT_DATE\` 가 전날이 된다. 격리 수준은 앱이 연결마다 READ COMMITTED 로 둔다(서버 기본은 REPEATABLE READ).`,
      maria ? '바이너리 로그를 켠 MariaDB 에서는 앱 계정이 트리거를 만들 때 서버의 `log_bin_trust_function_creators` 가 필요할 수 있다. 개발 compose 와 검증 컨테이너는 바이너리 로그를 켜지 않아 이 설정 없이 돈다(바이너리 로그를 켠 경우는 실측하지 않았다).'
        : '바이너리 로그가 켜진 MySQL(8.4 기본)에서 SUPER 권한이 없는 앱 계정이 트리거를 만들려면 서버에 `log_bin_trust_function_creators=1` 이 필요하다. 없으면 기준선의 트리거가 오류 1419 로 멈춘다. 개발 compose 와 검증 컨테이너는 이 설정으로 띄운다.',
    ],
    columns: `새 표는 기준선과 같이 \`DEFAULT CHARSET=utf8mb4 COLLATE=${collation.slice(collation.indexOf('=') + 1)}\` 로 만든다. 콜레이션이 다르면 문자열 비교가 대소문자나 끝 공백을 다르게 보고, 비이진 콜레이션끼리 만나는 비교는 오류(1267)로 멈춘다. 인덱스 키는 3,072바이트까지이고 문자열은 글자당 4바이트로 센다. `
      + (maria ? '넘는 유니크는 경고 없이 해시 인덱스가 되고, 넘는 단일 컬럼 일반 인덱스는 경고만 내고 앞 768자 접두 인덱스로 바뀌며, 넘는 복합 일반 인덱스는 오류(1071)로 거부된다.'
        : '넘는 인덱스는 만들 때 오류(1071)로 거부된다.'),
    quoted: '- 따옴표로 만든 이름: `` `bad-name` ``·`` `게시판` `` 처럼 형식 밖의 이름은 조회를 읽지 못해 멈춘다. 이름은 소문자로 접어 읽어 대문자 표기를 보지 못한다. 역따옴표와 대문자를 쓰지 않는다.',
    unnamed: `- 이름 없이 만든 제약: ${maria ? 'MariaDB 가' : 'MySQL 이'} 지은 이름(${maria ? '`CONSTRAINT_1`·`<표>_ibfk_1`, 컬럼 이름을 딴 CHECK·유니크' : '`<표>_chk_1`·`<표>_ibfk_1`, 컬럼 이름을 딴 유니크'})도 조회에 나와 이름 규칙에서 붉다. 제약에는 이름을 붙인다.`,
    typeChange: '',
    extra: [],
  };
}

const README_TEXT = Object.freeze({ oracle: () => ORACLE_README, mysql: () => innoDbReadme('mysql'), mariadb: () => innoDbReadme('mariadb') });

/** 이미지 안내와 저하 문장은 화면과 같은 원장(notices)에서 가져온다. 원장 문구를 고치면 README 도 따라 바뀐다. 벤더 한계 문장은 README_TEXT 에 있다. */
export function vendorReadme(vendorId, ledger) {
  const { notices } = ledger.vendors.find(vendor => vendor.id === vendorId);
  const text = README_TEXT[vendorId]();
  return `
## 데이터베이스

${VENDOR_README_PRECEDENCE}

이 프로젝트는 ${vendorId} 로 생성했다. Flyway 는 \`${vendorBaselinePaths(vendorId).location.replace('classpath:', '')}\` 폴더만 적용한다(생성 시점에는 번역 기준선 하나). \`db/migration\` 의 PostgreSQL 파일은 번역의 근거이고 실행되지 않는다.

${notices.image}

이 프로젝트에는 PostgreSQL 개발 시드(\`db/seed-dev\`)가 적용되지 않아 \`webmaster\` 는 로그인할 수 없는 상태로 시작한다. 개발 스택을 올리기 전에 \`.env\` 의 \`ADMIN_INITIAL_PASSWORD\` 에 비밀번호를 정하면 첫 기동 때 한 번 설정된다. 이미 정한 비밀번호는 덮어쓰지 않는다.

${text.session.map(paragraph => `${paragraph}\n\n`).join('')}이 데이터베이스에서 달라지는 동작(생성 전 화면의 기능 저하 칸과 같다):

${notices.degradations.map(row => `- ${row.text}`).join('\n')}

PostgreSQL 에서만 동작하는 도구는 이 프로젝트에 없다: ${ledger.removedPostgresTools.groups.map(group => group.label).join(', ')}. 엔티티·스키마 정적 린터는 아래 카탈로그 시험이 대신한다. 목록과 사유는 \`config/governance/vendor-removed-assets.json\` 에 있다. \`docs/\` 의 운영 문서는 원본 기준이라 PostgreSQL 절차를 그대로 담고 있다. 백업·복원은 기관이 이 DB 에 맞게 준비한다. 격리 E2E 실행기는 대표 묶음만 돌린다: \`node scripts/run-isolated-e2e.mjs --representative\`. 시험 목록은 \`config/governance/vendor-test-ledger.json\` 이 고정하고, 원장의 기능을 모두 고른 멀티모듈 생성물이 아니면 시작 전에 멈춘다.

### 생성 뒤 스키마 변경

1. 벤더 문법으로 \`${RESOURCES}/db/vendor/${vendorId}\` 에 \`V1_1__설명.sql\` 처럼 기준선(\`V1_0\`)보다 높은 버전의 파일을 더한다. 번역 기준선(\`V1_0__vendor_baseline.sql\`)은 고치지 않는다. 반복 마이그레이션(\`R__\`)은 지원하지 않는다.
2. \`npm run verify:vendor-schema\` 로 검사한다. 하네스를 돌린 뒤 번역 기준선과 입력을 잠금 해시로 대조하고, 일회용 DB 에 기준선만 적용해 표·컬럼·제약·인덱스·트리거·시퀀스 이름, 키·유니크의 컬럼, 시드 행 수, 식별 컬럼과 시퀀스의 다음 값을 번역 결과와 대조한다(제약 본문과 NOT NULL 은 잠금 해시가 받친다). 그 뒤 나머지 마이그레이션을 적용해 카탈로그 시험과 시나리오 시험을 돌린다. 컨테이너가 필요해 시간이 걸린다.
3. \`db/migration\` 은 고치지 않는다. 실행되지 않는 번역 근거이고, 명명·유니크 미러 린터는 이 입력만 본다.
4. ${text.subject} DDL 이 자동 커밋이라 \`V\` 파일이 중간에 실패하면 실패한 문장 앞에서 만든 객체와 Flyway 이력의 실패 행이 남고, 다음 기동은 그 실패 행에서 멈춘다. 남은 객체를 손으로 지우고 실패 행을 정리(Flyway 의 \`repair\`. 이 프로젝트에는 그 명령이 없어 Flyway CLI 등으로 돌린다)한 뒤 다시 적용한다. 운영 DB 에 올리기 전에 \`npm run verify:vendor-schema\` 로 일회용 DB 에서 먼저 돌린다.

카탈로그 시험은 적용된 DB 를 읽는다. 카탈로그 전체에서 PK 전략·숫자 변환·길이 초과를, 기준선 뒤에 생긴 객체에서 표·제약·인덱스·시퀀스 이름(\`tb_\`·\`pk_\`·\`fk_\`·\`uk_\`·\`ck_\`·\`ix_\`·\`sq_\`), 표의 저장 표기(따옴표로 만든 표는 붉다), 새 표의 감사 컬럼, 새 컬럼의 고정 문자형을, ${text.mirror}뷰 이름(\`vw_\`)을 본다. 표·컬럼 부재와 타입 계열은 시나리오 시험을 띄울 때 Hibernate validate 가 본다.

${text.columns}

기존 권한의 기본 그룹을 바꾸려면 \`config/governance/permission-catalog.json\` 과 벤더 DB 의 부여를 함께 맞춘다. \`npm run regen\` 은 \`db/migration\` 의 시드만 고치므로 벤더 마이그레이션에 부여 변경을 직접 넣는다. 둘이 어긋나면 카탈로그 시험이 붉다.

이 명령은 인증이 아니다. 생성물 전체 검증(\`npm run verify\`)은 소스가 바뀌면 첫 단계(거버넌스의 원본 소스 결속 검사)에서 멈추는 것이 정상이고, 이 명령은 그 단계를 지나지 않는다. 벤더 인증 원장(\`config/db-vendors.json\`)의 증거는 생성물에서 판정하지 않는다.

지원하지 않는 것:

- 파괴적 DDL 검사: 무중단 마이그레이션 린터가 없다. 컬럼 삭제·타입 축소·이름 변경의 무중단 여부는 사람이 판단한다.
- 명명 예외: 카탈로그 시험에는 예외를 적을 자리가 없다. 표준 밖의 이름은 붉다.
${text.quoted}
${text.unnamed}
- 뷰의 정의: 뷰는 이름만 본다. 컬럼과 정의는 시험을 직접 더한다.
- 도입자가 더한 CHECK·트리거의 의미: 차등 시험은 번역 입력만 보므로 PostgreSQL 과 같은 값으로 대조되지 않는다. 시험을 직접 더한다.
- 같은 이름의 컬럼 타입 변경: 새 객체가 아니어서 고정 문자형 규칙이 보지 않는다.${text.typeChange}
${text.extra.map(line => `${line}\n`).join('')}- 새 권한 코드: 권한 코드는 구성과 정확히 일치해야 해 \`npm run regen\` 이 멈춘다. PostgreSQL 프로젝트와 같다.
- 새 Java 소스: 생성물의 소스 모집단은 투영 기록과 정확히 일치해야 해 새 엔티티·서비스를 더하면 하네스가 붉다. PostgreSQL 프로젝트와 같다. 기존 엔티티의 필드 변경은 된다.
- \`scripts/domain-registration-doctor.mjs\` 는 \`db/migration\` 만 읽으므로 벤더 폴더의 새 표를 보지 못한다.
`;
}

/** 생성물 트리를 벤더로 투영한다. 소스 생성기가 PostgreSQL 번들을 설치한 뒤 부른다. */
export function projectVendorSources(output, { vendorId, input, inputText, layout }) {
  if (!VENDOR_SOURCE[vendorId]) throw new Error(`소스 투영이 없는 벤더: ${vendorId}`);
  const { location, migration } = vendorBaselinePaths(vendorId);
  const ledger = loadVendorLedger(output);
  // 저하 대조가 멈추면 아무것도 쓰지 않은 채 멈춘다.
  const statements = vendorMigrationStatements(vendorId, input, ledger);
  mkdirSync(join(output, RESOURCES, vendorMigrationLocation(vendorId)), { recursive: true });
  writeFileSync(join(output, migration), renderFlywayMigration(statements, vendorId), 'utf8');
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
  writeFileSync(readme, `${readFileSync(readme, 'utf8').replace(/\s*$/, '\n')}${vendorReadme(vendorId, ledger)}`, 'utf8');

  return { vendor: vendorId, location, migration, migrationSha256: artifactTextSha256(output, migration), input: inputPath,
    inputSha256: artifactTextSha256(output, inputPath), statements: statements.length, buildFile, profiles, removedAssets: readVendorAssetLedger(output).assets };
}
