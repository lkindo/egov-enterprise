#!/usr/bin/env node
/**
 * 벤더 일회용 DB 에 번역 스키마를 올리고 통합 시험을 돌린다(ADR-0047 D-10).
 *
 * 시나리오는 PostgreSQL 과 같은 시험 코드다. 돌릴 시험은 `config/governance/vendor-test-ledger.json` 이 정한다.
 *
 * 사용: node scripts/project-composer-vendor-integration.mjs --input <입력 JSON> --vendor <id> [--engine <id>]
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { vendorExitCode } from './project-composer-errors.mjs';
import { VENDOR_ENGINES, readCatalog, readUniqueSignatures, runAsAdministrator, runStatements, startVendorEngine, stopVendorEngineReporting } from './project-composer-vendor-engine.mjs';
import { applyVendor, assertVendorApplied } from './project-composer-vendor-verify.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const LEDGER = join(ROOT, 'config/governance/vendor-test-ledger.json');
const SCHEMA_TESTS = join(ROOT, 'api-server/src/test/java/nuri/api/schema');
const CONFORMANCE_PACKAGE = 'nuri.api.harness';
const CONFORMANCE_CLASS = 'VendorCatalogConformanceTest';
/** 번역 기준선의 Flyway 버전(V1_0__vendor_baseline.sql). 그 뒤 버전이 도입자의 마이그레이션이다. */
export const VENDOR_BASELINE_VERSION = '1.0';
const VENDOR_BASELINE_FILE = 'V1_0__vendor_baseline.sql';

/** 배치별 Gradle 작업과 결과 폴더. 단일모듈은 시험 작업이 루트에 있다. */
export function integrationTask(layout = 'multi-module') {
  return layout === 'single-module'
    ? { task: ':vendorIntegrationTest', migrate: ':vendorFlywayMigrate', conformance: ':vendorConformanceTest', results: join(ROOT, 'build/test-results/vendorIntegrationTest'),
      conformanceResults: join(ROOT, 'build/test-results/vendorConformanceTest') }
    : { task: ':api-server:vendorIntegrationTest', migrate: ':api-server:vendorFlywayMigrate', conformance: ':api-server:vendorConformanceTest', results: join(ROOT, 'api-server/build/test-results/vendorIntegrationTest'),
      conformanceResults: join(ROOT, 'api-server/build/test-results/vendorConformanceTest') };
}

/** 원장에서 벤더 DB 로 돌릴 시험 클래스. 생성물은 구성에서 빠진 시험의 파일이 없다. */
export function ledgerClasses(ledger, present = () => true) {
  return ledger.tests.filter(entry => entry.category !== 'replacement').map(entry => entry.test.replace(/\.java$/, '')).filter(present);
}

/**
 * 시험이 실제로 돌았는지 결과 파일로 본다. Gradle 은 작업을 건너뛰어도, 거르기가 비어도 성공으로 끝나므로 종료 코드만으로는 거짓 통과가 된다.
 * 원장의 클래스마다 시험이 하나 이상 돌아야 한다.
 */
export function assertTestsRan(resultsDirectory, classes, testPackage = 'nuri.api.schema') {
  if (!classes.length) {
    const error = new Error('돌릴 시험이 없다. 원장과 시험 파일을 확인한다.');
    error.code = 'VENDOR_INTEGRATION_FAILED';
    throw error;
  }
  const files = new Set(existsSync(resultsDirectory) ? readdirSync(resultsDirectory) : []);
  const missing = classes.filter(name => {
    const file = `TEST-${testPackage}.${name}.xml`;
    if (!files.has(file)) return true;
    const tests = readFileSync(join(resultsDirectory, file), 'utf8').match(/<testsuite [^>]*tests="(\d+)"/)?.[1];
    return !Number(tests);
  });
  if (missing.length) {
    const error = new Error(`시험이 돌지 않은 클래스 ${missing.length}개: ${missing.slice(0, 5).join(', ')}`);
    error.code = 'VENDOR_INTEGRATION_FAILED';
    throw error;
  }
}

export function parseIntegrationArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = { '--input': 'input', '--vendor': 'vendor', '--engine': 'engine', '--layout': 'layout', '--flyway': 'flyway' }[argv[index]];
    if (!key || !argv[index + 1]) throw new Error(`알 수 없는 인자: ${argv[index]}`);
    args[key] = argv[++index];
  }
  if (!args.input || !VENDOR_ADAPTERS[args.vendor]) throw new Error('--input 과 어댑터가 있는 --vendor 가 필요하다');
  if (!VENDOR_ENGINES[args.engine ?? args.vendor]?.integration) throw new Error(`통합 시험을 아직 돌릴 수 없는 엔진: ${args.engine ?? args.vendor}`);
  return args;
}

/**
 * 기준선 뒤에 적용될 수 없는 파일을 컨테이너를 띄우기 전에 말한다. Flyway 는 target 을 줘도 R__ 를 적용하고, 기준선 이하 버전은 그 뒤에 적용하지 않아
 * 정확 대조의 전제가 깨진다. 이름만 보므로 내용은 판단하지 않는다.
 */
export function vendorMigrationNameProblems(names) {
  return names.filter(name => name.endsWith('.sql') && name !== VENDOR_BASELINE_FILE).filter(name => {
    const version = name.match(/^V(\d+)((?:_\d+)*)__.+\.sql$/);
    if (!version) return true;
    const [major, minor = 0] = [version[1], ...version[2].split('_').filter(Boolean)].map(Number);
    return major < 1 || (major === 1 && minor === 0);
  });
}

function assertVendorMigrationNames(location) {
  const folder = join(ROOT, 'api-server/src/main/resources', location.replace('classpath:', ''));
  const problems = vendorMigrationNameProblems(existsSync(folder) ? readdirSync(folder) : []);
  if (problems.length) {
    const error = new Error(`벤더 폴더에는 기준선보다 높은 버전의 V 파일만 더한다(R__ 는 지원하지 않는다): ${problems.join(', ')}`);
    error.code = 'VENDOR_INTEGRATION_FAILED';
    throw error;
  }
}

/** 시험 JVM 에 넘길 환경. 시험 프로필의 일회용 PostgreSQL 설정을 벤더 값으로 덮는다. 비밀번호는 환경으로만 넘긴다. */
export function integrationEnvironment(vendorId, integration, { port, password, owner }) {
  const url = integration.url(port);
  return {
    SPRING_DATASOURCE_URL: url,
    VENDOR_TEST_URL: url,
    VENDOR_TEST_OWNER: owner,
    SPRING_DATASOURCE_USERNAME: integration.username,
    SPRING_DATASOURCE_PASSWORD: password,
    SPRING_DATASOURCE_DRIVER_CLASS_NAME: integration.driver,
    SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT: integration.dialect,
    SPRING_FLYWAY_ENABLED: 'false',
    APP_DATABASE_VENDOR: vendorId,
  };
}

/** 이 실행이 띄운 DB 임을 남긴다. 시험은 이 토큰이 없는 DB 에는 쓰지 않는다. 대조와 카탈로그 시험이 끝난 뒤라 스키마 대조에 섞이지 않는다. */
function markOwner(handle) {
  const owner = randomBytes(16).toString('hex');
  const { errors } = runStatements(handle, [
    { sql: 'CREATE TABLE vendor_test_owner (token VARCHAR(64) PRIMARY KEY)' },
    { sql: `INSERT INTO vendor_test_owner (token) VALUES ('${owner}')` },
    { sql: 'COMMIT' }]);
  if (errors.length) throw new Error(`소유 표시를 남기지 못했다: ${errors[0].error}`);
  return owner;
}

/**
 * 생성물의 마이그레이션을 운영과 같은 Flyway 로 적용한다. 어댑터 문장을 다시 돌리면 실제로 나가는 파일이 시험되지 않는다.
 * target 이 있으면 번역 기준선까지, 없으면 그 뒤의 도입자 마이그레이션을 적용한다.
 */
function migrateWithFlyway(vendorId, integration, handle, task, location, target) {
  const gradlew = join(ROOT, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const result = spawnSync(`"${gradlew}"`, [task, '-PvendorIntegration=true', '--console=plain'], {
    cwd: ROOT, stdio: 'inherit', shell: true,
    env: { ...process.env, ...integrationEnvironment(vendorId, integration, { ...handle, owner: '' }), VENDOR_FLYWAY_LOCATION: location, ...(target ? { VENDOR_FLYWAY_TARGET: target } : {}) },
  });
  if (result.status !== 0) {
    // Gradle 의 네트워크·메모리·컴파일 실패가 섞여 있어 대조 실패로 말할 수 없다.
    const error = new Error(`Flyway ${target ? '기준선' : '기준선 뒤 마이그레이션'} 적용 실패(종료 ${result.status})`);
    error.code = 'VENDOR_INTEGRATION_FAILED';
    throw error;
  }
}

/**
 * 카탈로그 시험에 넘길 이름 목록. 어댑터가 쓰는 조회를 재사용해 벤더별 필터를 시험 쪽에 다시 두지 않는다.
 * MySQL·MariaDB 는 모든 기본키의 제약 이름이 PRIMARY 라 새 표마다 명명 규칙에 걸린다. 도입자가 정한 이름이 아니므로 뺀다.
 * CUBRID 는 제약 조회가 없어 비어 있고, 제약 이름 규칙은 그만큼 보지 못한다.
 */
export function conformanceCatalog(vendorId, catalog) {
  const constraints = (catalog.constraints ?? []).filter(item => !(['mysql', 'mariadb'].includes(vendorId) && item.endsWith('.primary')));
  return { columns: catalog.columns ?? [], constraints, indexes: catalog.indexes ?? [], sequences: catalog.sequences ?? [] };
}

/**
 * 기준선 그대로인 유니크의 `표.이름`. 시험은 여기에 없는 유니크를 새 것으로 본다. 조회가 깨져 비면 전부 새 것이 되어 붉으므로 조용히 초록이 되지 않는다.
 */
export function unchangedUniques(baseline, current) {
  const before = new Set(baseline);
  return current.filter(signature => before.has(signature)).map(signature => signature.slice(0, signature.indexOf('=')));
}

/** 적용된 카탈로그를 스키마 규칙으로 본다. 시나리오 시험의 픽스처와 소유 표가 도입자 객체로 보이지 않게 그보다 먼저 돈다. */
function runVendorConformance(vendorId, integration, handle, { task, results }, snapshot) {
  const file = join(ROOT, 'build/vendor-conformance/catalog.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(snapshot)}\n`, 'utf8');
  const gradlew = join(ROOT, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const result = spawnSync(`"${gradlew}"`, [task, '-PvendorIntegration=true', '--console=plain'], {
    cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, ...integrationEnvironment(vendorId, integration, { ...handle, owner: '' }), VENDOR_CATALOG_SNAPSHOT: file },
  });
  if (result.status !== 0) {
    const error = new Error(`벤더 카탈로그 시험 실패(종료 ${result.status}). ${results} 를 본다.`);
    error.code = 'VENDOR_INTEGRATION_FAILED';
    throw error;
  }
  assertTestsRan(results, [CONFORMANCE_CLASS], CONFORMANCE_PACKAGE);
}

function runIntegrationTests(vendorId, integration, handle, task) {
  const gradlew = join(ROOT, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  return spawnSync(`"${gradlew}"`, [task, '-PvendorIntegration=true', '--continue', '--console=plain'], {
    cwd: ROOT, stdio: 'inherit', shell: true, env: { ...process.env, ...integrationEnvironment(vendorId, integration, handle) },
  });
}

export function runVendorIntegration({ input, vendorId, engineId, layout, flyway }) {
  const engine = engineId ?? vendorId;
  const { integration } = VENDOR_ENGINES[engine];
  const { task, migrate, conformance, results, conformanceResults } = integrationTask(layout);
  // 이전 실행의 결과가 이번 실행의 증거가 되지 않게 맨 앞에서 지운다. 시험 전 단계에서 실패해도 낡은 결과가 남지 않는다.
  rmSync(results, { recursive: true, force: true });
  rmSync(conformanceResults, { recursive: true, force: true });
  if (flyway) assertVendorMigrationNames(flyway);
  const handle = startVendorEngine(engine, { publishPort: integration.port });
  let failure = null;
  try {
    if (flyway) {
      // 정확 대조는 번역 기준선에 한다. 그 뒤의 객체는 입력에 없으므로 함께 적용하면 초과로 잡히고, 대조를 넓히면 기준선 신호가 약해진다.
      migrateWithFlyway(vendorId, integration, handle, migrate, flyway, VENDOR_BASELINE_VERSION);
      assertVendorApplied(handle, input, vendorId, { ignoreTables: ['flyway_schema_history'] });
      const baseline = conformanceCatalog(vendorId, readCatalog(handle, vendorId));
      const baselineUniques = readUniqueSignatures(handle, vendorId);
      migrateWithFlyway(vendorId, integration, handle, migrate, flyway);
      const snapshot = { vendor: vendorId, baseline, current: conformanceCatalog(vendorId, readCatalog(handle, vendorId)),
        unchangedUniques: unchangedUniques(baselineUniques, readUniqueSignatures(handle, vendorId)) };
      runVendorConformance(vendorId, integration, handle, { task: conformance, results: conformanceResults }, snapshot);
    } else {
      applyVendor(handle, input, vendorId);
    }
    runAsAdministrator(handle, integration.grants);
    const result = runIntegrationTests(vendorId, integration, { ...handle, owner: markOwner(handle) }, task);
    if (result.status !== 0) {
      failure = new Error(`통합 시험 실패(종료 ${result.status}). ${results} 를 본다.`);
      failure.code = 'VENDOR_INTEGRATION_FAILED';
    } else {
      assertTestsRan(results, ledgerClasses(JSON.parse(readFileSync(LEDGER, 'utf8')), name => existsSync(join(SCHEMA_TESTS, `${name}.java`))));
    }
  } catch (error) {
    failure = error;
  }
  stopVendorEngineReporting(handle, failure);
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = parseIntegrationArgs(process.argv.slice(2));
  try {
    runVendorIntegration({ input: JSON.parse(readFileSync(args.input, 'utf8')), vendorId: args.vendor, engineId: args.engine, layout: args.layout, flyway: args.flyway });
    console.log(`[vendor-integration] PASS ${args.engine ?? args.vendor}`);
  } catch (error) {
    console.error(`[vendor-integration] ${error.code ?? 'FAILED'}: ${error.message}`);
    process.exitCode = vendorExitCode(error);
  }
}
