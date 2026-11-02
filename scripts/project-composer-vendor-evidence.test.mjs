/**
 * 벤더 인증 증거 계약(ADR-0047 D-9, 설계서 §7).
 *
 * 비-PostgreSQL certified 가 아직 없어 실제 원장만으로는 낡음 판정이 돌지 않는다. 그래서 인증 입력을 임시 복사본에 옮겨 fixture 증거로 붉힌다.
 * 복사본은 실제 파일이라 BLOB 매핑 되돌림 같은 사례가 실제 소스 위에서 붉어진다.
 */
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { certifyVendor, fixtureEvidence } from './project-composer-vendor-evidence.test-helpers.mjs';
import {
  buildVendorEvidence, parseEvidenceArgs, recordVendorEvidence, vendorEvidenceHash, vendorEvidenceInputs, vendorEvidenceReportDirectory, vendorEvidenceStaleErrors,
} from './project-composer-vendor-evidence.mjs';
import { VENDOR_ENGINES } from './project-composer-vendor-engine.mjs';
import { hibernateDdlAuto, parseIntegrationArgs, summarizeTestResults } from './project-composer-vendor-integration.mjs';
import { VENDOR_SOURCE } from './project-composer-vendor-project.mjs';
import { VENDOR_ADAPTERS, VENDOR_LEDGER_PATH, loadVendorLedger, vendorEvidenceProblems } from './project-composer-vendors.mjs';
import { LEDGER_PRECHECKS, formatPrecheck, ledgerPrecheck } from './ledger-precheck.mjs';
import { writeRepresentativeReport } from './run-isolated-e2e.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const DIALECT = 'foundation/src/main/java/nuri/foundation/core/persistence/NuriOracleDialect.java';
const SURVEY_TEMPLATE = 'business-app/src/main/java/nuri/business/domain/survey/SurveyTemplate.java';
const COMMIT = 'e'.repeat(40);

const scratch = (t, prefix = 'vendor-evidence-') => {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
};
const readLedger = root => JSON.parse(readFileSync(join(root, VENDOR_LEDGER_PATH), 'utf8'));
const writeLedger = (root, ledger) => writeFileSync(join(root, VENDOR_LEDGER_PATH), `${JSON.stringify(ledger, null, 2)}\n`, 'utf8');
const put = (root, file, text) => { mkdirSync(dirname(join(root, file)), { recursive: true }); writeFileSync(join(root, file), text); };
const change = (root, file, from, to) => {
  const text = readFileSync(join(root, file), 'utf8');
  assert.ok(text.includes(from), `${file} 에 ${from} 가 없다. 시험이 고칠 자리가 사라졌다`);
  writeFileSync(join(root, file), text.replace(from, to));
};

/** Oracle 인증 입력을 실제 파일로 옮긴 저장소. 실제 소스의 매핑을 되돌리는 사례에만 쓴다. */
function inputsCopy(t) {
  const root = scratch(t);
  const ledger = readLedger(ROOT);
  for (const path of vendorEvidenceInputs(ROOT, ledger, 'oracle')) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    cpSync(join(ROOT, path), join(root, path));
  }
  mkdirSync(join(root, 'api-server/src/main/java'), { recursive: true });
  put(root, VENDOR_LEDGER_PATH, '');
  writeLedger(root, ledger);
  certifyVendor(ledger.vendors.find(vendor => vendor.id === 'oracle'), vendorEvidenceHash(root, ledger, 'oracle'));
  writeLedger(root, ledger);
  return root;
}
/**
 * 작은 가짜 저장소. 판정은 원장이 가리키는 파일만 읽으므로 실제 소스 사례가 아니면 이것으로 충분하다. 실제 입력 복사는 사례 하나에 수 초가 든다.
 */
const TINY_ENTITY = 'foundation/src/main/java/E.java';
const TINY_ADAPTER = 'scripts/oracle-adapter.mjs';
function tinySource(t, { certified = false } = {}) {
  const root = scratch(t);
  const ledger = readLedger(ROOT);
  ledger.evidenceInputs.paths = ['scripts/shared.mjs'];
  const oracle = ledger.vendors.find(vendor => vendor.id === 'oracle');
  oracle.evidenceInputs = [TINY_ADAPTER];
  for (const module of ['foundation', 'business-core', 'business-app', 'api-server']) put(root, `${module}/src/main/java/E.java`, '@Entity class E {}\n');
  put(root, 'scripts/shared.mjs', 'export const shared = 1;\n');
  put(root, TINY_ADAPTER, 'export const adapter = 1;\n');
  put(root, 'business-core/src/main/java/R.java', 'class R {}\n');
  put(root, 'config/governance/vendor-sql-ledger.json', JSON.stringify({ locations: [{ path: 'business-core/src/main/java/R.java' }], portImplementations: [] }));
  put(root, 'config/governance/vendor-test-ledger.json', JSON.stringify({ tests: [], representativeE2e: { layout: 'multi-module', requiredDomains: ['board'], specs: [{ spec: 'e2e/journeys/a.spec.ts' }] } }));
  put(root, 'frontend/e2e/journeys/a.spec.ts', 'export {};\n');
  put(root, 'api-server/src/test/java/nuri/api/schema/A.java', 'class A {}\n');
  put(root, VENDOR_LEDGER_PATH, '');
  if (certified) certifyVendor(oracle, vendorEvidenceHash(root, ledger, 'oracle'));
  writeLedger(root, ledger);
  return root;
}
const staleOracle = /^oracle 19: 인증 입력이 증거 뒤에 바뀌었다\(실행 oracle19-fixture-0001, 기록 [a-f0-9]{12}, 현재 [a-f0-9]{12}\)\.$/;
const staleCodes = async root => (await ledgerPrecheck({ root, checks: LEDGER_PRECHECKS.filter(check => check.code === 'VENDOR_EVIDENCE_STALE') })).findings;

/** 실제 원장의 벤더를 바꾼 복사본. 입력 파일은 필요 없다. 적재는 형식만 본다. */
function ledgerOnly(t, edit) {
  const root = scratch(t);
  const ledger = readLedger(ROOT);
  edit(id => ledger.vendors.find(vendor => vendor.id === id), ledger);
  put(root, VENDOR_LEDGER_PATH, JSON.stringify(ledger));
  return root;
}

test('the real ledger has no stale certified vendor and declares what certification needs', () => {
  assert.deepEqual(vendorEvidenceStaleErrors(ROOT), [], '낡은 증거의 certified 는 계약에서 붉다');
  const ledger = loadVendorLedger(ROOT);
  for (const vendor of ledger.vendors.filter(row => VENDOR_ADAPTERS[row.id])) {
    assert.ok(vendor.engines.length, `${vendor.id}: 엔진이 없다`);
    for (const engine of vendor.engines) {
      const definition = VENDOR_ENGINES[engine.engine];
      assert.ok(definition, `${vendor.id} ${engine.version}: 실행 도구에 없는 엔진 ${engine.engine}`);
      assert.equal(definition.vendor ?? engine.engine, vendor.id, `${engine.engine} 는 ${vendor.id} 의 엔진이 아니다`);
    }
    assert.ok(vendorEvidenceInputs(ROOT, ledger, vendor.id).some(path => /^scripts\/project-composer-vendor-(oracle|mysql|mssql|cubrid)\.mjs$/.test(path)), `${vendor.id}: 어댑터가 입력에 없다`);
  }
  // 포트 구현이 어느 벤더의 입력에도 없으면 그 구현을 고쳐도 증거가 낡지 않는다.
  const declared = new Set(ledger.vendors.flatMap(vendor => vendor.evidenceInputs));
  const ports = JSON.parse(readFileSync(join(ROOT, 'config/governance/vendor-sql-ledger.json'), 'utf8')).portImplementations;
  assert.deepEqual(ports.filter(path => !declared.has(path)), []);
});

test('the input set holds the design list: model sources, adapter, ports, vendor SQL, mappings, vendor tests', () => {
  const ledger = loadVendorLedger(ROOT);
  const inputs = vendorEvidenceInputs(ROOT, ledger, 'oracle');
  for (const path of [
    'api-server/src/main/resources/db/migration/V2_90__retire_blog_domain.sql', 'scripts/project-composer-vendor-model.mjs', 'scripts/project-composer-vendor-oracle.mjs',
    'foundation/src/main/java/nuri/foundation/core/persistence/OracleSqlDialect.java', DIALECT, 'foundation/src/main/java/nuri/foundation/core/persistence/IsolationMappingDataSource.java',
    'foundation/src/main/resources/META-INF/services/org.hibernate.engine.jdbc.dialect.spi.DialectResolver', 'business-core/src/main/java/nuri/business/domain/menu/NavigationGrantRepository.java',
    SURVEY_TEMPLATE, 'api-server/src/test/java/nuri/api/schema/VendorTestSql.java', 'api-server/src/test/java/nuri/api/schema/ApprovalWorkflowIntegrationTest.java',
    'frontend/e2e/journeys/audit-log.spec.ts', 'config/governance/vendor-test-ledger.json', 'api-server/src/main/resources/application.yml', 'api-server/Dockerfile', 'build.gradle',
  ]) assert.ok(inputs.includes(path), `입력에 없다: ${path}`);
  assert.ok(!inputs.includes(VENDOR_LEDGER_PATH), '증거를 담는 원장이 입력이면 기록할 때마다 낡는다');
  assert.ok(!inputs.includes('scripts/project-composer-vendor-evidence.mjs'), '판정 코드는 벤더 동작이 아니다');
  assert.ok(!inputs.includes('api-server/src/test/java/nuri/api/schema/AddressBookBigintMigrationIntegrationTest.java'), '대체 분류 시험은 벤더에서 돌지 않는다');
  assert.ok(!inputs.includes('foundation/src/main/java/nuri/foundation/core/persistence/PostgresqlSqlDialect.java'), 'PostgreSQL 포트는 Oracle 입력이 아니다');
  assert.ok(!vendorEvidenceInputs(ROOT, ledger, 'mysql').includes('foundation/src/main/java/nuri/foundation/core/persistence/OracleSqlDialect.java'), 'Oracle 포트는 MySQL 입력이 아니다');
  assert.ok(vendorEvidenceInputs(ROOT, ledger, 'oracle').includes('foundation/src/main/java/nuri/foundation/core/persistence/VendorSqlConfig.java'), '포트를 고르는 설정은 공통 입력이다');
});

test('a mysql adapter change leaves Oracle evidence alone, and line endings do not move the hash', t => {
  const root = tinySource(t);
  const ledger = readLedger(root);
  const before = vendorEvidenceHash(root, ledger, 'oracle');
  put(root, 'scripts/project-composer-vendor-mysql.mjs', 'export const changed = true;\n');
  assert.equal(vendorEvidenceHash(root, ledger, 'oracle'), before);
  const file = join(root, 'scripts/shared.mjs');
  const original = readFileSync(file, 'utf8');
  writeFileSync(file, original.replace(/\r?\n/g, '\r\n'));
  const crlf = vendorEvidenceHash(root, ledger, 'oracle');
  writeFileSync(file, original.replace(/\r?\n/g, '\n'));
  assert.equal(vendorEvidenceHash(root, ledger, 'oracle'), crlf);
  put(root, 'scripts/shared.mjs', 'export const shared = 2;\n');
  assert.notEqual(vendorEvidenceHash(root, ledger, 'oracle'), before, '공통 입력의 내용이 바뀌면 값이 바뀐다');
});

test('certified needs an adapter, an engine, a source projection and evidence per engine', t => {
  const load = edit => () => loadVendorLedger(ledgerOnly(t, edit));
  // 원장만 고쳐 열 수 없다. 사유를 지워 다른 검사에 걸리지 않게 한다.
  const open = (vendor, patch = {}) => { Object.assign(vendor, { status: 'certified' }, patch); delete vendor.reason; };
  assert.throws(load(vendor => open(vendor('tibero'), { engines: [{ version: '7', engine: 'oracle', evidence: fixtureEvidence('oracle') }], evidenceInputs: ['x'] })), /^Error: tibero: 어댑터가 없다$/);
  assert.throws(load(vendor => certifyVendor(vendor('mysql'))), /^Error: mysql: 소스 투영\(VENDOR_SOURCE\)이 없다$/);
  assert.throws(load(vendor => { open(vendor('oracle'), { engines: [] }); }), /^Error: oracle: 엔진이 없다$/);
  assert.throws(load(vendor => { open(vendor('oracle'), { evidenceInputs: [] }); }), /^Error: oracle: 증거 입력 목록이 없다$/);
  assert.throws(load((vendor, ledger) => { certifyVendor(vendor('oracle')); delete ledger.evidenceInputs; }), /^Error: oracle: 증거 입력 목록이 없다$/, '공통 입력이 없으면 해시가 말하는 것이 없다');
  assert.throws(load(vendor => { open(vendor('oracle')); }), /oracle: 증거 없는 certified\(19\); 증거 없는 certified\(23\)/);
  // 옛 자리의 증거는 증거가 아니다.
  assert.throws(load(vendor => { open(vendor('oracle'), { evidence: { run: 'fixture' } }); }), /증거 없는 certified/);
  assert.throws(load(vendor => { certifyVendor(vendor('oracle')); vendor('oracle').engines[0].evidence = {}; }), /oracle: 19: 증거 형식이 맞지 않다\(실행 ID, 커밋, /);
  assert.throws(load(vendor => { certifyVendor(vendor('oracle')); vendor('oracle').engines[1].engine = 'mysql'; }), /oracle: 23: 통합 시험을 돌릴 엔진\(mysql\)이 아니다/);
  assert.throws(load(vendor => { certifyVendor(vendor('oracle')); vendor('oracle').engines[1].engine = 'nothing'; }), /통합 시험을 돌릴 엔진\(nothing\)이 아니다/);
  assert.doesNotThrow(load(vendor => certifyVendor(vendor('oracle'))));
  assert.doesNotThrow(load(() => {}), 'preview 는 증거 없이 그대로다');
});

test('every field of the evidence form is required and a failed step never passes', () => {
  assert.deepEqual(vendorEvidenceProblems(fixtureEvidence('oracle19')), []);
  assert.ok(vendorEvidenceProblems(undefined).length > 10);
  const broken = (name, edit) => {
    const evidence = fixtureEvidence('oracle19');
    edit(evidence, evidence.steps);
    assert.deepEqual(vendorEvidenceProblems(evidence), [name], name);
  };
  broken('실행 ID', value => { delete value.runId; });
  broken('커밋', value => { value.commit = 'abc'; });
  broken('기록 시각', value => { value.recordedAt = '2026-11-03T01:00:00.000Z'; });
  broken('입력 해시', value => { value.inputHash = 'x'; });
  broken('모델 해시', value => { delete value.modelHash; });
  broken('이미지 digest', value => { value.image = 'gvenzl/oracle-free:23-slim-faststart'; });
  broken('이미지 출처', value => { delete value.imageOrigin; });
  broken('증거 범위', value => { value.scope = 'deployment'; });
  broken('구성', value => { delete value.composition.compositionHash; });
  broken('생성물 검증', (_, steps) => { steps.verification.result = 'failed'; });
  broken('스키마 대조', (_, steps) => { steps.schemaParity.tables = 0; });
  broken('시드 행 대조', (_, steps) => { steps.seedParity.rows = 0; });
  broken('Hibernate validate', (_, steps) => { steps.hibernateValidate.ddlAuto = 'none'; });
  broken('통합 시험', (_, steps) => { steps.integration.failures = 1; });
  broken('통합 시험', (_, steps) => { steps.integration.errors = 1; });
  broken('통합 시험', (_, steps) => { steps.integration.tests = Number.NaN; });
  broken('통합 시험', (_, steps) => { steps.integration.skipped = steps.integration.tests; });
  broken('카탈로그 적합성', (_, steps) => { steps.conformance.catalog.tests = 0; });
  broken('차등 시험', (_, steps) => { steps.conformance.differential.differences = 1; });
  broken('차등 시험', (_, steps) => { steps.conformance.differential.unbalanced = 1; });
  broken('차등 시험', (_, steps) => { steps.conformance.differential.intentFailures = 1; });
  broken('대표 E2E', (_, steps) => { steps.representativeE2e.unexpected = 1; });
  broken('대표 E2E', (_, steps) => { steps.representativeE2e.flaky = 1; });
  broken('대표 E2E', (_, steps) => { steps.representativeE2e.expected = 0; });
});

test('stale evidence: reverting the image BLOB mapping alone turns a certified vendor red', async t => {
  const root = inputsCopy(t);
  assert.deepEqual(vendorEvidenceStaleErrors(root), [], '기록한 해시와 같으면 초록이다');
  assert.deepEqual(await staleCodes(root), []);

  // 방언의 BLOB 동등성만 되돌린다.
  const dialect = readFileSync(join(root, DIALECT), 'utf8');
  change(root, DIALECT, ' || storedAsBlob(first, second) || storedAsBlob(second, first)', '');
  const errors = vendorEvidenceStaleErrors(root);
  assert.equal(errors.length, 2, '엔진마다 낡았다');
  assert.match(errors[0], staleOracle);
  const findings = await staleCodes(root);
  assert.deepEqual(findings.map(finding => finding.code), ['VENDOR_EVIDENCE_STALE', 'VENDOR_EVIDENCE_STALE']);
  const shown = formatPrecheck({ findings, ran: ['VENDOR_EVIDENCE_STALE'], skipped: [] });
  assert.equal(shown.ok, false);
  assert.match(shown.lines.join('\n'), /\[VENDOR_EVIDENCE_STALE\] oracle 19: 인증 입력이 증거 뒤에 바뀌었다/);
  assert.match(shown.lines.join('\n'), /→ .*project-composer-vendor-evidence\.mjs .*preview 로 내리고 사유를 적는다/);
  writeFileSync(join(root, DIALECT), dialect);
  assert.deepEqual(vendorEvidenceStaleErrors(root), [], '되돌리면 다시 초록이다');

  // 엔티티 쪽 매핑만 바꿔도 같다.
  change(root, SURVEY_TEMPLATE, 'private byte[] srvyTmpltImgInfo;', '@jakarta.persistence.Lob private byte[] srvyTmpltImgInfo;');
  assert.match(vendorEvidenceStaleErrors(root)[0], staleOracle);
});

test('stale evidence: entity set changes that a single file diff would miss still count', t => {
  const root = inputsCopy(t);
  // 표지만 지운다. 읽은 머리 소스로만 판단하면 이 변경을 놓친다.
  change(root, SURVEY_TEMPLATE, '@Entity', '');
  assert.match(vendorEvidenceStaleErrors(root)[0], staleOracle, '@Entity 표지 제거');
  change(root, SURVEY_TEMPLATE, 'public class', '@Entity public class');
  // 표지 자리가 달라 내용 해시도 다르다. 기록을 새 값으로 맞춰 다음 사례를 따로 본다.
  const rebind = () => {
    const ledger = readLedger(root);
    const current = vendorEvidenceHash(root, ledger, 'oracle');
    for (const engine of ledger.vendors.find(vendor => vendor.id === 'oracle').engines) engine.evidence.inputHash = current;
    writeLedger(root, ledger);
    assert.deepEqual(vendorEvidenceStaleErrors(root), []);
  };
  rebind();
  // 새 임베디드 타입, 원장에 새로 적은 SQL 위치, 벤더 시험 지원 코드.
  put(root, 'business-app/src/main/java/nuri/business/domain/survey/NewMoney.java', '@jakarta.persistence.Embeddable public class NewMoney {}\n');
  assert.match(vendorEvidenceStaleErrors(root)[0], staleOracle, '새 @Embeddable');
  rmSync(join(root, 'business-app/src/main/java/nuri/business/domain/survey/NewMoney.java'));
  assert.deepEqual(vendorEvidenceStaleErrors(root), []);
  put(root, 'api-server/src/test/java/nuri/api/schema/NewSupport.java', 'class NewSupport {}\n');
  assert.match(vendorEvidenceStaleErrors(root)[0], staleOracle, '원장에 없는 새 시험 파일은 기본으로 입력이다');
  rmSync(join(root, 'api-server/src/test/java/nuri/api/schema/NewSupport.java'));
  rmSync(join(root, SURVEY_TEMPLATE));
  assert.match(vendorEvidenceStaleErrors(root)[0], staleOracle, '엔티티 삭제');
});

test('stale evidence: a declared input that vanished is red with its path, not a quiet pass', async t => {
  const root = tinySource(t, { certified: true });
  rmSync(join(root, TINY_ADAPTER));
  assert.throws(() => vendorEvidenceStaleErrors(root), /인증 입력을 읽지 못했다: scripts\/oracle-adapter\.mjs \(ENOENT\)/);
  assert.match((await staleCodes(root))[0].message, /인증 입력을 읽지 못했다/);
});

test('stale evidence: an image that moved after the run is red, and preview may carry old evidence', t => {
  const root = tinySource(t, { certified: true });
  const ledger = readLedger(root);
  ledger.vendors.find(vendor => vendor.id === 'oracle').engines[1].evidence.image = `gvenzl/oracle-free@sha256:${'0'.repeat(64)}`;
  writeLedger(root, ledger);
  assert.deepEqual(vendorEvidenceStaleErrors(root).map(error => error.split('(')[0]), ['oracle 23: 증거의 이미지가 현재 엔진 이미지와 다르다']);
  // 입력을 바꾼 PR 은 preview 로 내려도 된다.
  const lowered = readLedger(root);
  const oracle = lowered.vendors.find(vendor => vendor.id === 'oracle');
  oracle.status = 'preview';
  oracle.reason = '인증 입력을 바꿔 증거를 다시 만들어야 합니다.';
  writeLedger(root, lowered);
  assert.deepEqual(vendorEvidenceStaleErrors(root), []);
});

test('a generated project never reports stale evidence: its inputs are projected', t => {
  const root = tinySource(t, { certified: true });
  put(root, TINY_ADAPTER, 'export const adapter = 2;\n');
  assert.equal(vendorEvidenceStaleErrors(root).length, 2);
  put(root, 'reusable-base-lock.json', '{}');
  assert.deepEqual(vendorEvidenceStaleErrors(root), []);
});

test('the certification judgement does not import the projection code it inspects', () => {
  const seen = new Set();
  const visit = file => {
    if (seen.has(file)) return;
    seen.add(file);
    for (const match of readFileSync(join(ROOT, 'scripts', file), 'utf8').matchAll(/ from '\.\/([^']+)';$/gm)) visit(match[1]);
  };
  visit('project-composer-vendors.mjs');
  assert.ok(seen.has('project-composer-vendor-source.mjs') && seen.has('project-composer-vendor-engine.mjs'));
  assert.ok(!seen.has('project-composer-vendor-project.mjs'), '투영 코드는 이 모듈의 어댑터를 가져온다. 거꾸로 가져오면 순환이다');
});

test('the Oracle images are pinned by digest and the compose projection pulls the same one as the checks', () => {
  for (const id of ['oracle', 'oracle19']) {
    assert.match(VENDOR_ENGINES[id].image, /@sha256:[a-f0-9]{64}$/, id);
    assert.match(VENDOR_ENGINES[id].imageOrigin, /^community:/, `${id}: 공식 이미지가 아니라는 표시`);
  }
  assert.ok(VENDOR_SOURCE.oracle.composeService.includes(`image: ${VENDOR_ENGINES.oracle.image}\n`), '개발 compose 와 검증 엔진의 이미지가 갈라졌다');
});

test('test result summaries count what ran and a malformed result cannot pass as evidence', t => {
  const results = scratch(t);
  const suite = (name, attributes) => writeFileSync(join(results, `TEST-${name}.xml`), `<?xml version="1.0"?>\n<testsuite name="${name}" ${attributes} time="1.0">\n</testsuite>\n`);
  suite('A', 'tests="3" skipped="1" failures="0" errors="0"');
  suite('B', 'tests="2" skipped="0" failures="1" errors="0"');
  writeFileSync(join(results, 'binary.bin'), 'x');
  assert.deepEqual(summarizeTestResults(results), { classes: 2, tests: 5, failures: 1, errors: 0, skipped: 1 });
  assert.deepEqual(summarizeTestResults(join(results, 'missing')), { classes: 0, tests: 0, failures: 0, errors: 0, skipped: 0 });
  suite('C', 'tests="2"');
  const evidence = fixtureEvidence('oracle');
  evidence.steps.integration = summarizeTestResults(results);
  assert.ok(vendorEvidenceProblems(evidence).includes('통합 시험'), '건수를 읽지 못한 결과는 통과가 아니다');
});

test('the integration tool takes a report path and reads the schema check the scenarios actually use', () => {
  assert.equal(parseIntegrationArgs(['--input', 'a.json', '--vendor', 'oracle', '--engine', 'oracle19', '--report', 'r.json']).report, 'r.json');
  assert.equal(hibernateDdlAuto(readFileSync(join(ROOT, 'api-server/src/test/resources/application-tc.yml'), 'utf8')), 'validate', '시나리오 프로필이 validate 가 아니면 Hibernate validate 증거가 아니다');
  assert.equal(hibernateDdlAuto('spring:\n  jpa:\n    hibernate:\n      ddl-auto: none\n'), 'none');
  assert.equal(hibernateDdlAuto('spring: {}\n'), null);
  const source = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  assert.match(source, /applied = assertVendorApplied\(handle, input, vendorId, \{ ignoreTables/, '보고서의 대조 수는 실제 대조 결과다');
});

test('the E2E runner writes its evidence report only after the run and the result contract passed', t => {
  const source = readFileSync(join(ROOT, 'scripts/run-isolated-e2e.mjs'), 'utf8');
  const contract = source.indexOf('if (result.errors.length) throw fail(`result contract failed');
  const failure = source.indexOf('if (executionFailure) throw executionFailure;');
  const write = source.indexOf('writeRepresentativeReport(root, {');
  assert.ok(contract > 0 && failure > contract && write > failure, '결과 계약 → 실행 실패 → 보고서 순서다');
  assert.match(source, /if \(bundle && vendorRuntime\) writeRepresentativeReport/, '벤더 대표 묶음만 쓴다. PostgreSQL 대조 실행은 증거가 아니다');
  const root = scratch(t);
  const file = writeRepresentativeReport(root, { vendor: 'oracle', engineId: 'oracle19', image: 'i', specs: ['a', 'b'], summary: { expected: 5, unexpected: 0, flaky: 0, skipped: 1 } });
  assert.equal(resolve(file), resolve(root, vendorEvidenceReportDirectory('oracle19'), 'representative-e2e.json'));
  assert.deepEqual(JSON.parse(readFileSync(file, 'utf8')), { vendor: 'oracle', engine: 'oracle19', image: 'i', specs: 2, expected: 5, unexpected: 0, flaky: 0, skipped: 1 });
});

/** 기록 명령의 실행 뼈대. 도구 대신 보고서를 쓰는 run 과, 깨끗한 git 을 흉내 낸 값을 준다. */
function recordingFixture(t, overrides = {}) {
  const root = tinySource(t);
  const artifact = scratch(t, 'vendor-evidence-artifact-');
  const { requiredDomains, layout } = JSON.parse(readFileSync(join(root, 'config/governance/vendor-test-ledger.json'), 'utf8')).representativeE2e;
  put(artifact, 'reusable-base-lock.json', JSON.stringify({
    profile: 'demo', layout, sourceCommit: COMMIT, composition: { resolvedDomains: requiredDomains, compositionHash: 'd'.repeat(64) },
    vendorProjection: { vendor: 'oracle', inputSha256: 'c'.repeat(64) }, ...overrides.lock }));
  put(artifact, 'build/reports/reusable-base/full.json', JSON.stringify({ result: 'passed', sourceCommit: COMMIT, ...overrides.full }));
  const specs = JSON.parse(readFileSync(join(root, 'config/governance/vendor-test-ledger.json'), 'utf8')).representativeE2e.specs.length;
  const engineId = 'oracle19';
  const image = VENDOR_ENGINES[engineId].image;
  const calls = [];
  const clean = { commit: COMMIT, status: '' };
  const reports = vendorEvidenceReportDirectory(engineId);
  const run = (command, args, options) => {
    calls.push({ command, args, root: options.root });
    const script = args[0];
    if (script.endsWith('project-composer-vendor-integration.mjs')) {
      put(artifact, `${reports}/integration.json`, JSON.stringify({ vendor: 'oracle', engine: engineId, image, schemaParity: { tables: 98, statements: 900, degradations: 2 }, seedParity: { tables: 98, rows: 18143 },
        hibernateValidate: { ddlAuto: 'validate' }, integration: { classes: 51, tests: 399, failures: 0, errors: 0, skipped: 0 }, catalog: { classes: 1, tests: 12, failures: 0, errors: 0, skipped: 0 }, ...overrides.integration }));
    } else if (script.endsWith('project-composer-vendor-differential.mjs')) {
      put(artifact, `${reports}/differential.json`, JSON.stringify({ vendor: 'oracle', engine: engineId, checks: 134, rows: 700, differences: [], unbalanced: [], intentFailures: [], ...overrides.differential }));
    } else {
      assert.ok(script.endsWith('run-isolated-e2e.mjs'));
      put(artifact, `${reports}/representative-e2e.json`, JSON.stringify({ vendor: 'oracle', engine: engineId, image, specs, expected: 120, unexpected: 0, flaky: 0, skipped: 1, ...overrides.e2e }));
    }
    overrides.during?.(script, root, clean);
  };
  const git = (_, args) => (args[0] === 'status' ? clean.status : `${clean.commit}\n`);
  return { root, artifact, calls, clean, run, git, record: () => recordVendorEvidence({ root, artifact, vendorId: 'oracle', version: '19', run, git, now: () => Date.parse('2026-11-03T01:00:00.000Z') }) };
}

test('the record command runs the engine steps in the artifact and writes that engine\'s evidence, not the status', t => {
  const { root, artifact, calls, record } = recordingFixture(t);
  const evidence = record();
  assert.deepEqual(calls.map(call => call.root), [artifact, artifact, artifact].map(path => resolve(path)));
  assert.deepEqual(calls[0].args.slice(-4), ['--engine', 'oracle19', '--report', `${vendorEvidenceReportDirectory('oracle19')}/integration.json`]);
  assert.ok(calls[0].args.includes('--flyway'), '증거는 실제 Flyway 적용 경로로 만든다');
  assert.deepEqual(calls[1].args.slice(-4), ['--engine', 'oracle19', '--report', `${vendorEvidenceReportDirectory('oracle19')}/differential.json`]);
  assert.deepEqual(calls[2].args, ['scripts/run-isolated-e2e.mjs', '--representative', '--vendor-engine=oracle19']);
  assert.deepEqual(vendorEvidenceProblems(evidence), []);
  assert.equal(evidence.recordedAt, '2026-11-03T10:00:00.000+09:00');
  assert.equal(evidence.modelHash, 'c'.repeat(64), '실제 모델 해시는 생성물 잠금의 번역 입력 해시다');
  assert.equal(evidence.imageOrigin, 'community:fugeritorg');
  const ledger = readLedger(root);
  const oracle = ledger.vendors.find(vendor => vendor.id === 'oracle');
  assert.equal(oracle.status, 'preview', '승격은 별도 변경이다');
  assert.deepEqual(oracle.engines[0].evidence, evidence);
  assert.equal(oracle.engines[1].evidence, null, '다른 엔진은 그대로다');
  assert.equal(evidence.inputHash, vendorEvidenceHash(root, ledger, 'oracle'), '원장 쓰기는 입력을 바꾸지 않는다');
  assert.equal(readFileSync(join(root, VENDOR_LEDGER_PATH), 'utf8'), `${JSON.stringify(ledger, null, 2)}\n`);
  // 19c 만으로는 올릴 수 없다. 23 증거까지 있어야 한다.
  oracle.status = 'certified';
  delete oracle.reason;
  writeLedger(root, ledger);
  assert.throws(() => loadVendorLedger(root), /oracle: 증거 없는 certified\(23\)/);
});

test('the record command refuses before starting any container when the setup cannot be evidence', t => {
  const refused = (overrides, setup, pattern) => {
    const fixture = recordingFixture(t, overrides);
    setup?.(fixture);
    assert.throws(fixture.record, pattern);
    assert.deepEqual(fixture.calls, [], '컨테이너를 띄우기 전에 멈춘다');
    assert.equal(readLedger(fixture.root).vendors.find(vendor => vendor.id === 'oracle').engines[0].evidence, null);
  };
  refused({}, ({ clean }) => { clean.status = ' M scripts/project-composer-vendor-oracle.mjs\0'; }, /커밋하지 않은 변경이 있다: scripts\/project-composer-vendor-oracle\.mjs/);
  refused({ lock: { sourceCommit: 'f'.repeat(40) } }, null, /생성물의 커밋\(f+\)이 현재 커밋/);
  refused({ lock: { vendorProjection: undefined } }, null, /oracle 로 생성한 프로젝트가 아니다/);
  refused({ lock: { layout: 'single-module' } }, null, /multi-module 생성물에서만 돈다/);
  refused({ lock: { composition: { resolvedDomains: ['cms'], compositionHash: 'd'.repeat(64) } } }, null, /대표 묶음에 필요한 기능이 이 구성에 없다/);
  refused({ full: { result: 'failed' } }, null, /생성물 전체 검증이 이 커밋에서 통과한 기록이 없다/);
  refused({ full: { sourceCommit: 'f'.repeat(40) } }, null, /생성물 전체 검증이 이 커밋에서 통과한 기록이 없다/);
  refused({}, ({ artifact }) => rmSync(join(artifact, 'build/reports/reusable-base/full.json')), /보고서를 읽지 못했다: build\/reports\/reusable-base\/full\.json/);
  refused({}, ({ root }) => put(root, 'reusable-base-lock.json', '{}'), /원본 저장소에서 실행한다/);
  const fixture = recordingFixture(t);
  const call = version => () => recordVendorEvidence({ root: fixture.root, artifact: fixture.artifact, vendorId: 'oracle', version, run: fixture.run, git: fixture.git });
  assert.throws(call('12'), /원장에 oracle 12 엔진이 없다/);
  assert.deepEqual(fixture.calls, []);
});

test('the ledger stays as it was when a step result falls short or the inputs moved during the run', t => {
  const failing = (overrides, pattern) => {
    const fixture = recordingFixture(t, overrides);
    const before = readFileSync(join(fixture.root, VENDOR_LEDGER_PATH), 'utf8');
    assert.throws(fixture.record, pattern);
    assert.equal(readFileSync(join(fixture.root, VENDOR_LEDGER_PATH), 'utf8'), before);
  };
  failing({ integration: { integration: { classes: 51, tests: 399, failures: 1, errors: 0, skipped: 0 } } }, /결과가 인증 조건에 모자란다: 통합 시험/);
  failing({ integration: { hibernateValidate: { ddlAuto: 'none' } } }, /모자란다: Hibernate validate/);
  failing({ integration: { schemaParity: null, seedParity: null } }, /모자란다: 스키마 대조, 시드 행 대조/);
  failing({ differential: { unbalanced: ['ck_a'] } }, /모자란다: 차등 시험/);
  failing({ e2e: { flaky: 1 } }, /모자란다: 대표 E2E/);
  // 다른 엔진의 통과를 19c 증거로 쓰지 않는다.
  failing({ integration: { engine: 'oracle' } }, /통합 시험 보고서의 엔진\(oracle\)이 oracle19 가 아니다/);
  failing({ integration: { image: VENDOR_ENGINES.oracle.image } }, /통합 시험 보고서의 이미지/);
  failing({ differential: { engine: 'oracle' } }, /차등 시험 보고서의 엔진/);
  failing({ e2e: { engine: 'oracle' } }, /대표 E2E 보고서의 엔진/);
  failing({ e2e: { specs: 3 } }, /대표 E2E 의 시험 파일 수\(3\)가 원장의/);
  const lastStep = 'scripts/run-isolated-e2e.mjs';
  failing({ during: (script, _root, clean) => { if (script === lastStep) clean.status = ' M scripts/x.mjs\0'; } }, /커밋하지 않은 변경이 있다/);
  failing({ during: (script, _root, clean) => { if (script === lastStep) clean.commit = 'f'.repeat(40); } }, /실행 중 인증 입력이 바뀌었다/);
  failing({ during: (script, root) => { if (script === lastStep) change(root, TINY_ENTITY, '@Entity', '@Entity '); } }, /실행 중 인증 입력이 바뀌었다/);
});

test('reports left by an earlier run are never read as this run\'s evidence', t => {
  const fixture = recordingFixture(t);
  fixture.record();
  const reports = join(fixture.artifact, vendorEvidenceReportDirectory('oracle19'));
  assert.ok(existsSync(join(reports, 'representative-e2e.json')));
  const silent = recordVendorEvidence.bind(null, { root: fixture.root, artifact: fixture.artifact, vendorId: 'oracle', version: '19', run: () => {}, git: fixture.git });
  assert.throws(silent, /보고서를 읽지 못했다: build\/reports\/vendor-evidence\/oracle19\/integration\.json/, '이번 실행이 쓰지 않은 보고서는 없다');
});

test('the evidence builder refuses an engine without its own report and the CLI names its arguments', () => {
  assert.throws(() => buildVendorEvidence({ engineId: 'oracle', integration: { engine: 'oracle19' }, differential: {}, e2e: {} }), /통합 시험 보고서의 엔진/);
  assert.deepEqual(parseEvidenceArgs(['--vendor', 'oracle', '--version', '19', '--artifact', 'out']), { vendorId: 'oracle', version: '19', artifact: 'out' });
  assert.throws(() => parseEvidenceArgs(['--vendor', 'oracle']), /--vendor, --version, --artifact 가 모두 필요하다/);
  assert.throws(() => parseEvidenceArgs(['--engine', 'oracle19']), /사용법/);
});
