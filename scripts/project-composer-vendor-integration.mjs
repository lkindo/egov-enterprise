#!/usr/bin/env node
/**
 * 벤더 일회용 DB 에 번역 스키마를 올리고 통합 시험을 돌린다(ADR-0047 D-10).
 *
 * 시나리오는 PostgreSQL 과 같은 시험 코드다. 돌릴 시험은 `config/governance/vendor-test-ledger.json` 이 정한다.
 *
 * 사용: node scripts/project-composer-vendor-integration.mjs --input <입력 JSON> --vendor <id> [--engine <id>] [--layout <배치>] [--flyway <위치>] [--report <경로>]
 * --flyway 가 없으면 어댑터 문장을 직접 적용하고 시나리오 시험만 돈다. 카탈로그 시험은 돌지 않는다 — 생성물에서는 npm run verify:vendor-schema 를 쓴다.
 * 보고서는 인증 증거(project-composer-vendor-evidence.mjs)의 원본이고 끝까지 통과한 실행만 쓴다.
 */
import { spawnSync } from 'node:child_process';
import { randomBytes } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { vendorExitCode } from './project-composer-errors.mjs';
import { VENDOR_ENGINES, readByteColumns, readCatalog, readUniqueSignatures, runAsAdministrator, runStatements, startVendorEngine, stopVendorEngineReporting } from './project-composer-vendor-engine.mjs';
import { applyVendor, assertVendorApplied } from './project-composer-vendor-verify.mjs';
import { VENDOR_ADAPTERS } from './project-composer-vendors.mjs';
import { GENERATED_LOCK } from './composer-modules.mjs';
import { vendorBaselineDrift } from './reusable-governance-integrity.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const LEDGER = join(ROOT, 'config/governance/vendor-test-ledger.json');
const SCHEMA_TESTS = join(ROOT, 'api-server/src/test/java/nuri/api/schema');
const CONFORMANCE_PACKAGE = 'nuri.api.harness';
const CONFORMANCE_CLASS = 'VendorCatalogConformanceTest';
const HIBERNATE_REPORT = join(ROOT, 'build/vendor-conformance/hibernate-validate.txt');
/** 번역 기준선의 Flyway 버전(V1_0__vendor_baseline.sql). 그 뒤 버전이 도입자의 마이그레이션이다. */
export const VENDOR_BASELINE_VERSION = '1.0';
const VENDOR_BASELINE_FILE = 'V1_0__vendor_baseline.sql';
// 끝난 뒤 데몬을 남기지 않는다. 다른 검증 단계의 GRADLE_OPTIONS 는 --warning-mode fail 이 함께 있어 실패 조건이 바뀌므로 재사용하지 않는다.
export const VENDOR_GRADLE_OPTIONS = Object.freeze(['-PvendorIntegration=true', '--no-daemon', '--console=plain']);

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

/** 결과 폴더의 시험 수. 속성이 없으면 NaN 이라 증거 형식 검사가 받지 않는다. */
export function summarizeTestResults(resultsDirectory) {
  const totals = { classes: 0, tests: 0, failures: 0, errors: 0, skipped: 0 };
  const files = existsSync(resultsDirectory) ? readdirSync(resultsDirectory).filter(name => /^TEST-.+\.xml$/.test(name)) : [];
  for (const name of files) {
    const suite = readFileSync(join(resultsDirectory, name), 'utf8').match(/<testsuite [^>]*>/)?.[0] ?? '';
    totals.classes += 1;
    totals.tests += Number(suite.match(/ tests="(\d+)"/)?.[1] ?? NaN);
    totals.failures += Number(suite.match(/ failures="(\d+)"/)?.[1] ?? NaN);
    totals.errors += Number(suite.match(/ errors="(\d+)"/)?.[1] ?? NaN);
    totals.skipped += Number(suite.match(/ skipped="(\d+)"/)?.[1] ?? NaN);
  }
  return totals;
}

/**
 * 시나리오 문맥의 Hibernate 가 실제로 쓴 스키마 검사 값(VendorOwnershipExtension 이 문맥마다 단언하고 남긴다). 프로필 문자열은 증거가 아니다 —
 * 환경 변수와 시험 속성이 프로필을 이긴다. 문맥이 없거나 값이 갈리면 null 이라 통과로 읽히지 않는다.
 */
export function appliedHibernateCheck(reportText) {
  const lines = reportText.split(/\r?\n/).filter(Boolean);
  const values = new Set(lines.map(line => line.slice(line.indexOf(' ') + 1)));
  return { ddlAuto: values.size === 1 ? [...values][0] : null, contexts: lines.length };
}

function readHibernateCheck() {
  return appliedHibernateCheck(existsSync(HIBERNATE_REPORT) ? readFileSync(HIBERNATE_REPORT, 'utf8') : '');
}

export function parseIntegrationArgs(argv) {
  const args = {};
  for (let index = 0; index < argv.length; index += 1) {
    const key = { '--input': 'input', '--vendor': 'vendor', '--engine': 'engine', '--layout': 'layout', '--flyway': 'flyway', '--report': 'report' }[argv[index]];
    if (!key || !argv[index + 1]) throw new Error(`알 수 없는 인자: ${argv[index]}`);
    args[key] = argv[++index];
  }
  if (!args.input || !VENDOR_ADAPTERS[args.vendor]) throw new Error('--input 과 어댑터가 있는 --vendor 가 필요하다');
  if (!VENDOR_ENGINES[args.engine ?? args.vendor]?.integration) throw new Error(`통합 시험을 아직 돌릴 수 없는 엔진: ${args.engine ?? args.vendor}`);
  return args;
}

/**
 * 기준선 뒤에 적용될 수 없는 파일을 컨테이너를 띄우기 전에 말한다. Flyway 는 target 을 줘도 R__ 를 적용하고, 기준선 이하 버전은 그 뒤에 적용하지 않아
 * 정확 대조의 전제가 깨진다. 이름만 보므로 내용은 판단하지 않는다. 버전은 Flyway 처럼 구간별 숫자로 비교한다 — 빠진 구간은 0 이라 V1_0_0 은 기준선과 같고 V1_0_1 은 높다.
 */
export function vendorMigrationNameProblems(names) {
  return names.filter(name => name.endsWith('.sql') && name !== VENDOR_BASELINE_FILE).filter(name => {
    const version = name.match(/^V(\d+(?:[._]\d+)*)__.+\.sql$/);
    if (!version) return true;
    const [major, ...rest] = version[1].split(/[._]/).map(Number);
    return major < 1 || (major === 1 && rest.every(part => part === 0));
  });
}

/**
 * 잠금에 묶인 번역 기준선과 입력이 디스크와 다른 이유. 기준선 대조는 수정된 파일을 적용한 DB 를 그 파일의 이름과 비교하므로 내용 변경을 보지 못한다.
 * 잠금이 없으면 무엇과도 대조하지 못하므로 통과가 아니다.
 */
export function vendorLockProblems(root, vendorId) {
  const lockPath = join(root, GENERATED_LOCK);
  if (!existsSync(lockPath)) return [`${GENERATED_LOCK} 이 없어 번역 기준선을 대조하지 못한다. 벤더 생성물에서 돌린다`];
  const projection = JSON.parse(readFileSync(lockPath, 'utf8')).vendorProjection;
  if (projection?.vendor !== vendorId) return [`${GENERATED_LOCK} 의 벤더(${projection?.vendor ?? '없음'})가 ${vendorId} 가 아니다`];
  const missing = [['번역 기준선', projection.migration], ['번역 입력', projection.input]].filter(([, file]) => !existsSync(join(root, file)));
  if (missing.length) return missing.map(([label, file]) => `${label}(${file})이 없다`);
  const drift = vendorBaselineDrift(root, projection);
  return [...(drift.migration ? [`번역 기준선(${projection.migration})이 생성 때와 다르다`] : []), ...(drift.input ? [`번역 입력(${projection.input})이 생성 때와 다르다`] : [])];
}

export function assertVendorLock(vendorId, root = ROOT) {
  const problems = vendorLockProblems(root, vendorId);
  if (problems.length) {
    const error = new Error(`${problems.join(', ')}. 고치거나 지운 파일을 되돌린다. 스키마 변경은 기준선보다 높은 버전의 V 파일로 더한다.`);
    error.code = 'VENDOR_INTEGRATION_FAILED';
    throw error;
  }
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
    // 호스트의 값을 물려받으면 검증이 꺼진 채로 시험이 통과한다. 표·컬럼 부재와 타입 계열은 이 검증만 본다.
    SPRING_JPA_HIBERNATE_DDL_AUTO: 'validate',
    APP_DATABASE_VENDOR: vendorId,
  };
}

/** 자식 프로세스의 환경. 벤더 값이 호스트 값을 이긴다. */
export const childEnvironment = (vendorId, integration, handle, extra = {}, base = process.env) => ({ ...base, ...integrationEnvironment(vendorId, integration, handle), ...extra });

const AUTOCOMMIT_CLIENTS = new Set(['mssql']);

/** 이 실행이 띄운 DB 임을 남긴다. 시험은 이 토큰이 없는 DB 에는 쓰지 않는다. 대조와 카탈로그 시험이 끝난 뒤라 스키마 대조에 섞이지 않는다. */
function markOwner(handle) {
  const owner = randomBytes(16).toString('hex');
  // sqlcmd 는 문장마다 자동 커밋이라 열린 트랜잭션이 없고, COMMIT 은 3902 오류다.
  const commit = AUTOCOMMIT_CLIENTS.has(handle.engine.vendor ?? handle.id) ? [] : [{ sql: 'COMMIT' }];
  const { errors } = runStatements(handle, [
    { sql: 'CREATE TABLE vendor_test_owner (token VARCHAR(64) PRIMARY KEY)' },
    { sql: `INSERT INTO vendor_test_owner (token) VALUES ('${owner}')` },
    ...commit]);
  if (errors.length) throw new Error(`소유 표시를 남기지 못했다: ${errors[0].error}`);
  return owner;
}

const FLYWAY_TARGET = 'VENDOR_FLYWAY_TARGET';

/**
 * Flyway 적용 단계의 자식 환경. target 은 이 도구가 정한 값만 넘긴다 — 호스트의 값이 남으면 나머지를 적용하는 두 번째 호출이 그 버전에서 멈추고,
 * 그 뒤 마이그레이션은 적용되지 않은 채 카탈로그 시험을 지난다. spawnSync 가 undefined 를 어떻게 다루는지에 기대지 않고 키를 지운다.
 * Windows 의 환경 변수 이름은 대소문자를 가리지 않으므로 표기가 다른 키도 지운다.
 */
export function flywayEnvironment(vendorId, integration, handle, location, target, base = process.env) {
  const env = childEnvironment(vendorId, integration, { ...handle, owner: '' }, { VENDOR_FLYWAY_LOCATION: location }, base);
  for (const key of Object.keys(env)) if (key.toUpperCase() === FLYWAY_TARGET) delete env[key];
  if (target) env[FLYWAY_TARGET] = target;
  return env;
}

/**
 * 생성물의 마이그레이션을 운영과 같은 Flyway 로 적용한다. 어댑터 문장을 다시 돌리면 실제로 나가는 파일이 시험되지 않는다.
 * target 이 있으면 번역 기준선까지, 없으면 그 뒤의 도입자 마이그레이션을 적용한다.
 */
function migrateWithFlyway(vendorId, integration, handle, task, location, target) {
  const gradlew = join(ROOT, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const result = spawnSync(`"${gradlew}"`, [task, ...VENDOR_GRADLE_OPTIONS], {
    cwd: ROOT, stdio: 'inherit', shell: true, env: flywayEnvironment(vendorId, integration, handle, location, target),
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

/**
 * 기준선 뒤에 바이트 길이가 된 컬럼(`표.컬럼=바이트`). 기준선의 바이트 컬럼은 어댑터의 선언된 저하이고 정확 대조를 받았다.
 * 표·컬럼 이름으로 가르므로 길이를 줄인 기준선 컬럼은 여기에 없고 길이 규칙이 본다.
 */
export function addedByteColumns(baseline, current) {
  const before = new Set(baseline.map(item => item.slice(0, item.indexOf('='))));
  return current.filter(item => !before.has(item.slice(0, item.indexOf('='))));
}

/** 적용된 카탈로그를 스키마 규칙으로 본다. 시나리오 시험의 픽스처와 소유 표가 도입자 객체로 보이지 않게 그보다 먼저 돈다. */
function runVendorConformance(vendorId, integration, handle, { task, results }, snapshot) {
  const file = join(ROOT, 'build/vendor-conformance/catalog.json');
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, `${JSON.stringify(snapshot)}\n`, 'utf8');
  const gradlew = join(ROOT, process.platform === 'win32' ? 'gradlew.bat' : 'gradlew');
  const result = spawnSync(`"${gradlew}"`, [task, ...VENDOR_GRADLE_OPTIONS], {
    cwd: ROOT, stdio: 'inherit', shell: true, env: childEnvironment(vendorId, integration, { ...handle, owner: '' }, { VENDOR_CATALOG_SNAPSHOT: file }),
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
  return spawnSync(`"${gradlew}"`, [task, ...VENDOR_GRADLE_OPTIONS, '--continue'], {
    cwd: ROOT, stdio: 'inherit', shell: true, env: childEnvironment(vendorId, integration, handle, { VENDOR_HIBERNATE_REPORT: HIBERNATE_REPORT }),
  });
}

export function runVendorIntegration({ inputFile, vendorId, engineId, layout, flyway }) {
  const engine = engineId ?? vendorId;
  const { integration } = VENDOR_ENGINES[engine];
  const { task, migrate, conformance, results, conformanceResults } = integrationTask(layout);
  // 이전 실행의 결과가 이번 실행의 증거가 되지 않게 맨 앞에서 지운다. 시험 전 단계에서 실패해도 낡은 결과가 남지 않는다.
  rmSync(results, { recursive: true, force: true });
  rmSync(conformanceResults, { recursive: true, force: true });
  rmSync(HIBERNATE_REPORT, { force: true });
  mkdirSync(dirname(HIBERNATE_REPORT), { recursive: true });
  if (flyway) {
    assertVendorMigrationNames(flyway);
    assertVendorLock(vendorId);
  }
  // 잠금 대조 뒤에 읽는다. 앞에서 읽으면 지운 입력이 되돌리라는 문구 없이 ENOENT 로 끝난다.
  const input = JSON.parse(readFileSync(inputFile, 'utf8'));
  const handle = startVendorEngine(engine, { publishPort: integration.port });
  let failure = null;
  let applied = null;
  try {
    if (flyway) {
      // 정확 대조는 번역 기준선에 한다. 그 뒤의 객체는 입력에 없으므로 함께 적용하면 초과로 잡히고, 대조를 넓히면 기준선 신호가 약해진다.
      migrateWithFlyway(vendorId, integration, handle, migrate, flyway, VENDOR_BASELINE_VERSION);
      applied = assertVendorApplied(handle, input, vendorId, { ignoreTables: ['flyway_schema_history'] });
      const baseline = conformanceCatalog(vendorId, readCatalog(handle, vendorId));
      const baselineUniques = readUniqueSignatures(handle, vendorId);
      const baselineByteColumns = readByteColumns(handle, vendorId);
      migrateWithFlyway(vendorId, integration, handle, migrate, flyway);
      const snapshot = { vendor: vendorId, baseline, current: conformanceCatalog(vendorId, readCatalog(handle, vendorId)),
        unchangedUniques: unchangedUniques(baselineUniques, readUniqueSignatures(handle, vendorId)),
        byteColumns: addedByteColumns(baselineByteColumns, readByteColumns(handle, vendorId)) };
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
      const { ddlAuto, contexts } = readHibernateCheck();
      if (ddlAuto !== 'validate') {
        failure = new Error(`Hibernate validate 를 단언한 시나리오 문맥이 없다(값 ${ddlAuto}, 문맥 ${contexts}개). ${HIBERNATE_REPORT} 를 본다.`);
        failure.code = 'VENDOR_INTEGRATION_FAILED';
      }
    }
  } catch (error) {
    failure = error;
  }
  stopVendorEngineReporting(handle, failure);
  return {
    vendor: vendorId, engine, image: VENDOR_ENGINES[engine].image,
    schemaParity: applied && { tables: applied.tables, statements: applied.emission.statements.length, degradations: applied.emission.degradations.length },
    seedParity: applied && { tables: applied.tables, rows: applied.seedRows },
    hibernateValidate: readHibernateCheck(),
    integration: summarizeTestResults(results),
    catalog: summarizeTestResults(conformanceResults),
  };
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const args = parseIntegrationArgs(process.argv.slice(2));
  try {
    const report = runVendorIntegration({ inputFile: args.input, vendorId: args.vendor, engineId: args.engine, layout: args.layout, flyway: args.flyway });
    if (args.report) {
      mkdirSync(dirname(resolve(args.report)), { recursive: true });
      writeFileSync(args.report, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    }
    console.log(`[vendor-integration] PASS ${args.engine ?? args.vendor}${args.flyway ? '' : ' (카탈로그 시험 없음: --flyway 없이 돌렸다. 벤더 생성물에서 npm run verify:vendor-schema 로 돌린다)'}`);
  } catch (error) {
    console.error(`[vendor-integration] ${error.code ?? 'FAILED'}: ${error.message}`);
    process.exitCode = vendorExitCode(error);
  }
}
