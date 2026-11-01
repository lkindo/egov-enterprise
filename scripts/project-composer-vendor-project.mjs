/**
 * 생성물 소스를 벤더 값으로 투영한다(ADR-0047 D-11, 설계서 §8).
 *
 * PostgreSQL 번들은 번역의 근거이자 권한·하네스 대조의 입력이라 생성물에 그대로 둔다. 번역한 기준선은 벤더 폴더에 두고 Flyway 가 그 폴더만 본다.
 * 드라이버·방언·Flyway 플러그인·접속 기본값은 벤더 값으로 바꾼다. 문자열을 바꿀 자리가 없으면 멈춘다 — 원본이 바뀌어 조용히 PostgreSQL 설정이
 * 남는 일을 막는다.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { artifactTextSha256, vendorBaselinePaths } from './reusable-governance-integrity.mjs';
import { buildVendorModel } from './project-composer-vendor-model.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';

const RESOURCES = 'api-server/src/main/resources';
/** classpath 접두사를 뺀 Flyway 위치. 경로의 정본은 거버넌스가 대조하는 vendorBaselinePaths 다. */
export const vendorMigrationLocation = vendorId => vendorBaselinePaths(vendorId).location.replace('classpath:', '');

/** 벤더별 소스 값. 드라이버 판은 이관 도구와 같다. */
export const VENDOR_SOURCE = Object.freeze({
  oracle: Object.freeze({
    flywayPlugin: 'org.flywaydb:flyway-database-oracle',
    driverCoordinate: 'com.oracle.database.jdbc:ojdbc11:23.26.3.0.0',
    driverClass: 'oracle.jdbc.OracleDriver',
    url: 'jdbc:oracle:thin:@//localhost:1521/FREEPDB1',
    dialect: 'nuri.foundation.core.persistence.NuriOracleDialect',
  }),
});

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

/** 생성물 트리를 벤더로 투영한다. 소스 생성기가 PostgreSQL 번들을 설치한 뒤 부른다. */
export function projectVendorSources(output, { vendorId, input, layout }) {
  if (!VENDOR_SOURCE[vendorId]) throw new Error(`소스 투영이 없는 벤더: ${vendorId}`);
  const { location, migration } = vendorBaselinePaths(vendorId);
  mkdirSync(join(output, RESOURCES, vendorMigrationLocation(vendorId)), { recursive: true });
  const statements = vendorMigrationStatements(vendorId, input);
  writeFileSync(join(output, migration), renderFlywayMigration(statements), 'utf8');

  // 단일모듈은 의존성을 루트 빌드 파일로 합친다.
  const buildFile = layout === 'single-module' ? 'build.gradle' : 'api-server/build.gradle';
  writeFileSync(join(output, buildFile), projectVendorBuild(readFileSync(join(output, buildFile), 'utf8'), vendorId), 'utf8');

  const resources = join(output, RESOURCES);
  const profiles = readdirSync(resources).filter(name => /^application(-[\w-]+)?\.yml$/.test(name)).sort();
  for (const name of profiles) writeFileSync(join(resources, name), projectVendorProfile(readFileSync(join(resources, name), 'utf8'), vendorId), 'utf8');
  const common = join(resources, 'application.yml');
  writeFileSync(common, `${readFileSync(common, 'utf8').replace(/\s*$/, '\n')}${vendorApplicationDocument(vendorId)}`, 'utf8');

  return { vendor: vendorId, location, migration, migrationSha256: artifactTextSha256(output, migration), statements: statements.length, buildFile, profiles };
}
