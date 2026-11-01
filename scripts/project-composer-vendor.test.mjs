import assert from 'node:assert/strict';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildVendorModel, parseExpression, tablesInDependencyOrder, VendorTranslationGap } from './project-composer-vendor-model.mjs';
import { assertCatalogParity, assertCoverage, createEmission, emitRows, exactNumber, nextValues, renderExpression, violationExpression } from './project-composer-vendor-sql.mjs';
import { loadVendorLedger, selectableVendors, translateForAllVendors, VENDOR_ADAPTERS, VENDOR_IDS } from './project-composer-vendors.mjs';
import { clobLiteral, oracleAdapter } from './project-composer-vendor-oracle.mjs';
import { mariadbAdapter, mysqlAdapter } from './project-composer-vendor-mysql.mjs';
import { mssqlAdapter } from './project-composer-vendor-mssql.mjs';
import { cubridAdapter } from './project-composer-vendor-cubrid.mjs';
import { probeRows, withDisposablePostgres } from './project-composer-vendor-differential.mjs';
import { assertTestsRan, integrationEnvironment, integrationTask, ledgerClasses, parseIntegrationArgs } from './project-composer-vendor-integration.mjs';
import { vendorInputPath, verificationSteps, verificationVendor } from './verify-reusable-artifact.mjs';
import { failedVerificationStep } from './project-composer-job-failure.mjs';
import { createJobTimeline, verificationStepMarkers } from './project-composer-timeline.mjs';
import { collectResults, parseCount, stopVendorEngineReporting, VENDOR_ENGINES, vendorContainerLabels } from './project-composer-vendor-engine.mjs';
import { removeJobContainers } from './project-composer-postgres.mjs';
import { VENDOR_ASSET_LEDGER, VENDOR_ASSET_RULE, pruneVendorPostgresAssets, readVendorAssetLedger, staleVendorAssets } from './reusable-vendor-assets.mjs';
import { artifactAliases } from './reusable-artifact-entrypoints-contract.mjs';
import { HARNESS_SCAN_ROOTS, computeHarnessBaselineEntries } from './harness-baseline-manifest.mjs';
import { assertIsolatedRunnerSupportsProject } from './run-isolated-e2e.mjs';
import { composerProfile } from './project-composer-source.mjs';
import { loadComposerModules } from './composer-modules.mjs';
import { projectVendorBuild, projectVendorCompose, projectVendorComposeProd, projectVendorDeploy, projectVendorEnvironment, projectVendorProfile, renderFlywayMigration, VENDOR_SOURCE,
  vendorApplicationDocument, vendorMigrationLocation } from './project-composer-vendor-project.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { assertVendorRequestable, resolveGeneratorComposition, resolveProjectRecipe } from './project-composer-recipe.mjs';
import { artifactTextSha256, vendorBaselinePaths, vendorProjectionErrors } from './reusable-governance-integrity.mjs';
import { DATABASE_VENDORS } from './project-composer-db.mjs';
import { backendEnvironment, isLocalDatabaseUrl } from './dev.mjs';

const ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '..');
const isGap = error => error instanceof VendorTranslationGap && error.code === 'VENDOR_TRANSLATION_GAP';

const column = (table, name, type, extra = {}) => ({ table_name: table, column_name: name, ordinal_position: extra.position ?? 1, is_nullable: extra.nullable === false ? 'NO' : 'YES',
  data_type: type, character_maximum_length: extra.length ?? null, numeric_precision: null, numeric_scale: null, datetime_precision: 6, column_default: extra.default ?? null,
  is_identity: extra.identity ? 'YES' : 'NO', identity_generation: extra.identity ? 'BY DEFAULT' : null, is_generated: 'NEVER' });
const varchar = (table, name, length, extra = {}) => column(table, name, 'character varying', { ...extra, length });
const constraint = (table, name, type, definition, referenced = null) => ({ table_name: table, name, type, definition, referenced_table: referenced, validated: true });

const snapshot = () => ({
  columns: [
    column('t_parent', 'id', 'bigint', { nullable: false, identity: true, position: 1 }),
    varchar('t_parent', 'code', 20, { nullable: false, position: 2 }),
    varchar('t_parent', 'use_yn', 1, { nullable: false, position: 3, default: "'Y'::character varying" }),
    varchar('t_parent', 'hash_vl', 64, { position: 4 }),
    varchar('t_parent', 'body', 4000, { position: 5 }),
    column('t_parent', 'up_id', 'bigint', { position: 6 }),
    column('t_child', 'id', 'bigint', { nullable: false, identity: true, position: 1 }),
    column('t_child', 'parent_id', 'bigint', { position: 2 }),
    varchar('t_child', 'url', 1000, { position: 3 }),
    varchar('t_child', 'owner', 20, { position: 4 }),
  ],
  constraints: [
    constraint('t_parent', 'pk_t_parent', 'p', 'PRIMARY KEY (id)'),
    constraint('t_parent', 'uk_t_parent_code', 'u', 'UNIQUE (code)'),
    constraint('t_parent', 'ck_t_parent_use_yn', 'c', "CHECK (use_yn::text = ANY (ARRAY['Y'::character varying::text, 'N'::character varying::text]))"),
    constraint('t_parent', 'ck_t_parent_hash', 'c', "CHECK (hash_vl::text ~ '^[0-9a-f]{64}$'::text)"),
    constraint('t_parent', 'ck_t_parent_code', 'c', "CHECK (code::text <> ''::text AND code::text = btrim(code::text))"),
    constraint('t_parent', 'fk_t_parent_self', 'f', 'FOREIGN KEY (up_id) REFERENCES t_parent(id) DEFERRABLE INITIALLY DEFERRED', 't_parent'),
    constraint('t_child', 'pk_t_child', 'p', 'PRIMARY KEY (id)'),
    constraint('t_child', 'uk_t_child_owner_url', 'u', 'UNIQUE (owner, url)'),
    constraint('t_child', 'fk_t_child_parent', 'f', 'FOREIGN KEY (parent_id) REFERENCES t_parent(id) ON DELETE CASCADE', 't_parent'),
  ],
  indexes: [
    { table_name: 't_child', name: 'ix_t_child_url', definition: 'CREATE INDEX ix_t_child_url ON public.t_child USING btree (url)' },
    { table_name: 't_child', name: 'ix_t_child_url_trgm', definition: 'CREATE INDEX ix_t_child_url_trgm ON public.t_child USING gin (url gin_trgm_ops)' },
  ],
  triggers: [],
  sequences: [{ name: 'sq_alone', increment_by: '1', start_value: '1' }, { name: 't_parent_id_seq', increment_by: '1', start_value: '1' }],
});
const extras = { functions: [], comments: [], identitySequences: ['t_parent_id_seq'], sequenceValues: [{ name: 'sq_alone', last: 41 }] };
const model = () => buildVendorModel({ snapshot: snapshot(), extras });
const COLUMNS = ['a', 'b', 'c', 'd'];

test('the expression grammar reads every shape the schema uses', () => {
  for (const text of [
    "a::text = ANY (ARRAY['x'::character varying::text, 'y'::character varying::text])",
    'a >= 0', 'a >= 0::numeric AND a <= 100::numeric', "a::text ~ '^[0-9]{8}$'::text", 'char_length(a::text) <= 500',
    'a IS NOT NULL OR b IS NOT NULL', "btrim(a::text) <> ''::text", "jsonb_typeof(a) = 'object'::text AND octet_length(a::text) <= 2097152",
    "a > b AND a <= (b + '00:05:00'::interval)", 'a IS NULL OR a >= 0', "(a::text = 'x'::text) = (b IS NOT NULL)",
    "a::text = 'N'::text OR COALESCE(b, ''::character varying)::text ~ '^[0-9]{8}$'::text", 'a IS NULL OR a <> b',
    "(a::text = ANY (ARRAY['x'::character varying::text])) AND b IS NOT NULL OR c::text = 'y'::text AND d IS NULL",
  ]) assert.doesNotThrow(() => parseExpression(text, COLUMNS), text);
});

test('anything outside the grammar stops the translation instead of being skipped', () => {
  for (const text of ['lower(a) = b', 'a IN (SELECT 1)', "a::uuid = 'x'", 'z >= 0', "a ~ b", "a || b = 'x'"]) {
    assert.throws(() => parseExpression(text, COLUMNS), isGap, text);
  }
  const unknownType = snapshot();
  unknownType.columns[3] = column('t_parent', 'hash_vl', 'money');
  assert.throws(() => buildVendorModel({ snapshot: unknownType, extras }), isGap);
  const unknownDefault = snapshot();
  unknownDefault.columns[3] = varchar('t_parent', 'hash_vl', 64, { default: "upper('x')" });
  assert.throws(() => buildVendorModel({ snapshot: unknownDefault, extras }), isGap);
  const notValid = snapshot();
  notValid.constraints[2].validated = false;
  assert.throws(() => buildVendorModel({ snapshot: notValid, extras }), isGap);
});

test('a cast that changes the comparison stops the translation', () => {
  const kinds = new Map([['a', 'integer'], ['b', 'varchar'], ['c', 'timestamp']]);
  assert.throws(() => parseExpression("a::text > '2'::text", ['a', 'b', 'c'], kinds), isGap);
  assert.throws(() => parseExpression("(a)::text = '2'::text", ['a', 'b', 'c'], kinds), isGap);
  assert.throws(() => parseExpression("c::text = 'x'::text", ['a', 'b', 'c'], kinds), isGap);
  assert.throws(() => parseExpression('b::numeric >= 0', ['a', 'b', 'c'], kinds), isGap);
  assert.doesNotThrow(() => parseExpression("b::text = 'x'::text AND a >= 0::numeric", ['a', 'b', 'c'], kinds));
  // 같은 숫자 계열이어도 numeric 을 integer 로 줄이면 반올림된다.
  const numeric = new Map([['n', 'numeric'], ['big', 'bigint'], ['s', 'varchar']]);
  assert.throws(() => parseExpression('n::integer <> 1', ['n', 'big', 's'], numeric), isGap);
  assert.throws(() => parseExpression('big::integer <> 1', ['n', 'big', 's'], numeric), isGap);
  assert.doesNotThrow(() => parseExpression('big::numeric >= 0::numeric', ['n', 'big', 's'], numeric));
  // 함수와 식의 결과 캐스트는 뜻을 보장하지 못한다.
  assert.throws(() => parseExpression('char_length(s)::numeric > 0', ['n', 'big', 's'], numeric), isGap);
  assert.throws(() => parseExpression('(big + 1)::text = 1', ['n', 'big', 's'], numeric), isGap);
  assert.doesNotThrow(() => parseExpression("COALESCE(s, ''::character varying)::text ~ '^[0-9]{8}$'::text", ['n', 'big', 's'], numeric));
});

test('constraints and indexes outside the grammar are refused, not dropped', () => {
  const exclusion = snapshot();
  exclusion.constraints.push(constraint('t_child', 'ex_t_child', 'x', 'EXCLUDE USING gist (url WITH =)'));
  assert.throws(() => buildVendorModel({ snapshot: exclusion, extras }), isGap);
  for (const definition of ['CREATE UNIQUE INDEX ix_u ON public.t_child USING btree (btrim((url)::text))',
    "CREATE INDEX ix_u ON public.t_child USING btree (btrim((url)::text)) WHERE ((url)::text <> 'x'::text)"]) {
    const expression = snapshot();
    expression.indexes.push({ table_name: 't_child', name: 'ix_u', definition });
    assert.throws(() => buildVendorModel({ snapshot: expression, extras }), isGap, definition);
  }
});

test('a trigger is translated only while its function body is the reviewed one', () => {
  const withTrigger = name => ({ ...snapshot(), triggers: [{ table_name: 't_parent', name: 'tr_x', definition: `CREATE TRIGGER tr_x BEFORE DELETE OR UPDATE ON t_parent FOR EACH ROW EXECUTE FUNCTION ${name}()` }] });
  // 선언은 그대로 두고 함수 본문만 바꾼 변경(V2_143 과 같은 형태)을 잡는다.
  assert.throws(() => buildVendorModel({ snapshot: withTrigger('fn_adt_log_chg_prhb'), extras: { ...extras, functions: [{ name: 'fn_adt_log_chg_prhb', definition: 'CHANGED BODY' }] } }),
    error => isGap(error) && /본문이 바뀌었다/.test(error.message));
  assert.throws(() => buildVendorModel({ snapshot: withTrigger('fn_adt_log_chg_prhb'), extras }), isGap);
  assert.throws(() => buildVendorModel({ snapshot: withTrigger('fn_unreviewed'), extras: { ...extras, functions: [{ name: 'fn_unreviewed', definition: 'x' }] } }), isGap);
});

test('every adapter accounts for every key, constraint and index', () => {
  const sample = model();
  assert.deepEqual(Object.keys(translateForAllVendors(sample)).sort(), ['cubrid', 'mariadb', 'mssql', 'mysql', 'oracle']);
  for (const adapter of Object.values(VENDOR_ADAPTERS)) {
    const emission = adapter.emitSchema(sample);
    assert.ok(emission.degradations.some(item => item.name === 'ix_t_child_url_trgm'), `${adapter.id}: 빠진 GIN 인덱스는 저하로 선언한다`);
    emission.coverage.delete('uk_t_parent_code');
    assert.throws(() => assertCoverage(sample, emission), isGap, `${adapter.id}: 선언 없는 축소는 붉다`);
  }
});

test('the Oracle lock slots match the range the dialect folds keys into', () => {
  const dialect = readFileSync(resolve(ROOT, 'foundation/src/main/java/nuri/foundation/core/persistence/OracleSqlDialect.java'), 'utf8');
  const slots = dialect.match(/LOCK_SLOTS = ([\d_]+);/)[1].replaceAll('_', '');
  const sql = oracleAdapter.emitSchema(model()).statements.map(statement => statement.sql).join('\n');
  // 행이 모자라면 잠금 조회가 0행을 받고 아무것도 잠그지 않은 채 지나간다.
  assert.ok(sql.includes(`CONNECT BY LEVEL <= ${slots}`), `슬롯 ${slots}개`);
});

test('integration tests take every database setting from the engine, never from the PostgreSQL test profile', () => {
  const { integration } = VENDOR_ENGINES.oracle;
  const environment = integrationEnvironment('oracle', integration, { port: 15210, password: 'not-a-secret', owner: 'token' });

  assert.equal(environment.SPRING_DATASOURCE_URL, 'jdbc:oracle:thin:@//127.0.0.1:15210/FREEPDB1');
  // 자기 일회용 DB 주소를 properties 로 쓰는 시험도 같은 벤더 DB 로 돈다.
  assert.equal(environment.VENDOR_TEST_URL, environment.SPRING_DATASOURCE_URL);
  assert.equal(environment.VENDOR_TEST_OWNER, 'token', '시험은 실행 도구가 띄운 DB 에만 쓴다');
  assert.equal(environment.SPRING_FLYWAY_ENABLED, 'false', 'PostgreSQL 마이그레이션을 벤더에 적용하면 안 된다');
  assert.equal(environment.APP_DATABASE_VENDOR, 'oracle');
  assert.match(environment.SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT, /NuriOracleDialect/);
  assert.throws(() => parseIntegrationArgs(['--input', 'x.json', '--vendor', 'mysql']), /아직 돌릴 수 없는 엔진/);
  assert.throws(() => parseIntegrationArgs(['--vendor', 'oracle']), /--input/);
  assert.deepEqual(parseIntegrationArgs(['--input', 'x.json', '--vendor', 'oracle', '--engine', 'oracle19']),
    { input: 'x.json', vendor: 'oracle', engine: 'oracle19' });
});

test('a run passes only when every ledger class left test results', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vendor-results-'));
  const write = (name, tests) => writeFileSync(join(directory, `TEST-nuri.api.schema.${name}.xml`), `<testsuite name="x" tests="${tests}" skipped="0"></testsuite>`);
  const failed = error => error.code === 'VENDOR_INTEGRATION_FAILED';
  try {
    // Gradle 이 작업을 건너뛰면 종료 코드는 0 이고 결과 폴더가 없다.
    assert.throws(() => assertTestsRan(join(directory, 'absent'), ['A']), failed);
    assert.throws(() => assertTestsRan(directory, ['A']), failed, '결과가 없는 폴더는 실패다');
    write('A', 3);
    assert.throws(() => assertTestsRan(directory, ['A', 'B']), /돌지 않은 클래스 1개: B/);
    write('B', 0);
    assert.throws(() => assertTestsRan(directory, ['A', 'B']), failed, '시험이 0건인 클래스는 돈 것이 아니다');
    write('B', 1);
    assert.doesNotThrow(() => assertTestsRan(directory, ['A', 'B']));
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  assert.deepEqual(ledgerClasses({ tests: [{ test: 'A.java', category: 'as-is' }, { test: 'B.java', category: 'fixture-port' }, { test: 'C.java', category: 'replacement' }] }), ['A', 'B']);
});

test('a container that could not be removed is reported, without hiding an earlier failure', () => {
  const handle = { name: 'egov-vendor-x' };
  const removed = () => ({ status: 0 });
  const stuck = () => ({ status: 1 });

  assert.doesNotThrow(() => stopVendorEngineReporting(handle, null, removed));
  assert.throws(() => stopVendorEngineReporting(handle, new Error('시험 실패'), removed), /^Error: 시험 실패$/);
  assert.throws(() => stopVendorEngineReporting(handle, null, stuck), /컨테이너가 남았다: egov-vendor-x/);
  assert.throws(() => stopVendorEngineReporting(handle, new Error('시험 실패'), stuck), /시험 실패 \(시험 DB 컨테이너가 남았다: egov-vendor-x\)/);
});

test('translations keep the semantics the differential found', () => {
  const sample = model();
  const parent = sample.tables.find(table => table.name === 't_parent');
  const code = parent.checks.find(check => check.name === 'ck_t_parent_code').expression;
  const hash = parent.checks.find(check => check.name === 'ck_t_parent_hash').expression;
  const sql = adapter => adapter.emitSchema(sample).statements.map(statement => statement.sql).join('\n');

  // Oracle 에서 TRIM(' ') 은 NULL 이라 그냥 비교하면 공백뿐인 값이 통과한다.
  assert.match(sql(oracleAdapter), /TRIM\(code\) IS NOT NULL AND code = TRIM\(code\)/);
  assert.match(sql(oracleAdapter), /code IS NOT NULL/);
  assert.match(sql(oracleAdapter), /REGEXP_LIKE\(hash_vl, '\^\[0-9a-f\]\{64\}\\z', 'c'\)/);
  // MySQL 계열의 $ 는 끝 줄바꿈 앞에도 맞는다.
  assert.match(sql(mysqlAdapter), /REGEXP_LIKE\(hash_vl, '\(\?s\)\^\[0-9a-f\]\{64\}\(\?!\.\)', 'c'\)/);
  assert.match(sql(mariadbAdapter), /hash_vl REGEXP '\(\?s\)\^\[0-9a-f\]\{64\}\(\?!\.\)'/);
  assert.match(sql(mssqlAdapter), /DATALENGTH\(hash_vl\) = 128 AND hash_vl NOT LIKE N'%\[\^0-9a-f\]%'/);
  assert.match(sql(mssqlAdapter), /DATALENGTH\(code\) = DATALENGTH\(TRIM\(code\)\)/);
  assert.match(sql(cubridAdapter), /new\.hash_vl IS NOT NULL AND NOT \(new\.hash_vl REGEXP BINARY/);
  assert.equal(renderExpression(code, { column: name => name, string: value => `'${value}'`, compare: () => null }, parent), "(code <> '' AND code = TRIM(code))");

  // 표가 없는 정규식은 SQL Server 로 옮기지 않는다.
  const unknown = parseExpression("hash_vl::text ~ '^x+$'::text", ['hash_vl']);
  assert.throws(() => mssqlAdapter.emitSchema({ ...sample, tables: [{ ...parent, foreignKeys: [], checks: [{ name: 'ck_x', expression: unknown }] }] }), isGap);
  assert.ok(hash.op === 'regex');
});

test('nullable composite uniques keep accepting partly NULL rows', () => {
  const sample = model();
  const sql = adapter => adapter.emitSchema(sample).statements.map(statement => statement.sql).join('\n');
  assert.match(sql(oracleAdapter), /CREATE UNIQUE INDEX uk_t_child_owner_url ON t_child \(CASE WHEN owner IS NOT NULL AND url IS NOT NULL THEN owner END/);
  assert.match(sql(mssqlAdapter), /CREATE UNIQUE INDEX uk_t_child_owner_url ON t_child \(owner, url_hash\) WHERE owner IS NOT NULL AND url IS NOT NULL/);
  assert.match(sql(cubridAdapter), /ALTER TABLE t_child ADD COLUMN uq_key_1 VARCHAR\(2500\)/);
  // 끝 글자만 다른 긴 주소를 구분하려면 접두가 아니라 해시여야 한다.
  assert.match(sql(mysqlAdapter), /UNIQUE \(owner, url_hash\)/);
  assert.match(sql(mariadbAdapter), /ADD CONSTRAINT uk_t_child_owner_url UNIQUE \(owner, url\)/);
});

test('the violation form never yields NULL and refuses NULL absorbing comparisons', () => {
  const table = { name: 't', columns: [{ name: 'a', nullable: false }, { name: 'b', nullable: true }] };
  const dialect = { column: name => `new.${name}`, string: value => `'${value}'`, charLength: inner => `CHAR_LENGTH(${inner})`, regex: (node, render) => `${render(node.arg)} REGEXP '${node.pattern}'` };
  assert.equal(violationExpression(parseExpression("a::text = 'x'::text", ['a', 'b']), dialect, table), "new.a IS NOT NULL AND new.a <> 'x'");
  assert.equal(violationExpression(parseExpression('b IS NULL OR b >= 0', ['a', 'b']), dialect, table), '(new.b IS NOT NULL) AND (new.b IS NOT NULL AND new.b < 0)');
  assert.equal(violationExpression(parseExpression("(a::text = 'x'::text) = (b IS NOT NULL)", ['a', 'b']), dialect, table),
    "((new.a IS NOT NULL AND new.a <> 'x') OR (new.b IS NULL)) AND ((new.a IS NOT NULL AND new.a = 'x') OR (new.b IS NOT NULL))");
  assert.throws(() => violationExpression(parseExpression("COALESCE(b, ''::character varying) = 'x'::text", ['a', 'b']), dialect, table), isGap);
  // 깊은 곳의 COALESCE 도 NULL 가드를 틀리게 한다.
  assert.throws(() => violationExpression(parseExpression("char_length(COALESCE(b, ''::character varying)) > 0", ['a', 'b']), dialect, table), isGap);
  assert.throws(() => violationExpression(parseExpression("btrim(COALESCE(b, 'X'::character varying)) = ANY (ARRAY['Y'::text])", ['a', 'b']), dialect, table), isGap);
  // 왼쪽이 NULL 일 수 있는 논리값 등식은 전개하면 의미가 달라진다.
  assert.throws(() => violationExpression(parseExpression("(b::text = 'x'::text) = (a IS NOT NULL)", ['a', 'b']), dialect, table), isGap);
});

test('long Oracle literals split on code points, and numbers JSON cannot keep are refused', () => {
  const value = `a${'😀'.repeat(1000)}`;
  const literal = clobLiteral(value);
  assert.equal(literal.includes('\uFFFD'), false);
  const parts = [...literal.matchAll(/TO_CLOB\('([^']*)'\)/g)].map(match => match[1]);
  assert.equal(parts.join(''), value);
  assert.ok(parts.every(part => !/[\uD800-\uDBFF]$/.test(part) && !/^[\uDC00-\uDFFF]/.test(part)), '조각 경계가 글자를 자르지 않는다');
  assert.ok(parts.every(part => Buffer.byteLength(part) <= 4000));
  assert.throws(() => exactNumber(9007199254740992, 'x'), isGap);
  assert.equal(exactNumber(9007199254740991, 'x'), 9007199254740991);
  for (const value of [0, -1, 0.5, 2 ** -15, -0.25, 1e-7]) assert.equal(exactNumber(value, 'x'), value);
  assert.throws(() => exactNumber(0.1234567890123456, 'x'), isGap);
  const big = model();
  assert.throws(() => nextValues(big, { t_parent: [{ id: 9007199254740992 }] }), isGap);
});

test('a client that stopped early is a failed run, not a rejected value', () => {
  const statements = [{ sql: 'INSERT 1' }, { sql: 'INSERT 2' }];
  const errors = { errors: /^ERROR \d+/, fatal: /^ERROR (2006|2013)\b/ };
  const done = collectResults({ status: 1, stdout: '@@0\n@@1\nERROR 3819 (HY000): Check constraint is violated\n@@COMPLETED\n' }, statements, errors, 'mysql');
  assert.deepEqual(done.errors.map(item => item.index), [1]);
  const notReady = error => error.code === 'VENDOR_ENGINE_NOT_READY';
  assert.throws(() => collectResults({ status: 0, stdout: '@@0\n@@COMPLETED\n' }, statements, errors, 'mysql'), notReady, '문장 표식이 빠지면 실패다');
  assert.throws(() => collectResults({ status: 137, stdout: '@@0\n@@1\n', stderr: 'Killed\n' }, statements, errors, 'mysql'), notReady, '마지막 문장 뒤의 단절도 실패다');
  assert.throws(() => collectResults({ status: 1, stdout: '@@0\n@@1\nERROR 2013 (HY000): Lost connection\n@@COMPLETED\n' }, statements, errors, 'mysql'), notReady, '연결 단절은 값 거부가 아니다');
  assert.throws(() => collectResults({ status: 0, stdout: '' }, statements, errors, 'mysql'), notReady, '접속 실패의 빈 출력은 전부 통과가 아니다');
  assert.throws(() => collectResults({ status: null, signal: 'SIGTERM', stdout: '@@0\n@@1\n@@COMPLETED\n' }, statements, errors, 'mysql'), notReady, '시간 초과는 실패다');
  assert.throws(() => collectResults({ status: 1, error: new Error('spawn failed') }, statements, errors, 'mysql'), notReady);
  assert.equal(parseCount(['<00001>  count(*): 3']), 3);
  assert.equal(parseCount(['0']), 0);
  assert.equal(parseCount(['no rows']), null);
});

test('catalog parity is red for a missing index, an extra object and a dropped trigger', () => {
  const emission = createEmission('oracle');
  emission.expect('indexes', 't', 'ix_a');
  emission.expect('triggers', 't', 'tr_a');
  assert.doesNotThrow(() => assertCatalogParity(emission, { columns: [], constraints: [], indexes: ['T.IX_A'], triggers: ['t.tr_a'], sequences: [] }));
  assert.throws(() => assertCatalogParity(emission, { indexes: [], triggers: ['t.tr_a'] }), error => error.code === 'VENDOR_PARITY_FAILED' && /indexes 누락/.test(error.message));
  assert.throws(() => assertCatalogParity(emission, { indexes: ['t.ix_a', 't.ix_b'], triggers: ['t.tr_a'] }), /indexes 초과/);
  assert.throws(() => assertCatalogParity(emission, { indexes: ['t.ix_a'], triggers: [] }), /triggers 누락/);
  assert.doesNotThrow(() => assertCatalogParity(emission, { indexes: ['t.ix_a', 'flyway_schema_history.fs_idx'], triggers: ['t.tr_a'] }, { ignoreTables: ['flyway_schema_history'] }), 'Flyway 이력 표는 번들 밖이다');
  assert.throws(() => assertCatalogParity(emission, { indexes: ['t.ix_a', 'other.fs_idx'], triggers: ['t.tr_a'] }, { ignoreTables: ['flyway_schema_history'] }), /indexes 초과/, '지정한 표만 뺀다');
});

test('seed rows follow foreign keys, self references and the next value contract', () => {
  const sample = model();
  const rows = { t_child: [{ id: 7, parent_id: 2, url: 'u', owner: "o'x" }], t_parent: [
    { id: 2, code: 'B', use_yn: 'Y', hash_vl: null, body: null, up_id: 1 }, { id: 1, code: 'A', use_yn: 'Y', hash_vl: null, body: null, up_id: null }] };
  const statements = emitRows(sample, rows, mssqlAdapter);
  const position = text => statements.findIndex(statement => statement.includes(text));
  assert.ok(position("N'A'") < position("N'B'"), '자기 참조는 부모 행이 먼저다');
  assert.ok(position("N'B'") < position("N'o''x'"), 'FK 부모 표가 먼저다');
  assert.ok(statements.includes('SET IDENTITY_INSERT t_parent ON'));
  const { identities, sequences } = nextValues(sample, rows);
  assert.deepEqual(identities.find(item => item.table === 't_parent'), { table: 't_parent', column: 'id', next: 3 });
  assert.equal(sequences.find(item => item.name === 'sq_alone').next, 42);
  assert.throws(() => emitRows(sample, { t_parent: [{ id: 1, code: 'A', use_yn: 'Y', hash_vl: null, body: null, up_id: null, stray: 1 }] }, mysqlAdapter), isGap);
});

test('a foreign key cycle matters only between tables that have rows', () => {
  const table = (name, parent) => ({ name, foreignKeys: [{ name: `fk_${name}`, parentTable: parent }] });
  const cyclic = { tables: [table('a', 'b'), table('b', 'a'), { name: 'c', foreignKeys: [] }] };
  assert.throws(() => tablesInDependencyOrder(cyclic), isGap);
  assert.deepEqual(tablesInDependencyOrder(cyclic, item => item.name !== 'a').map(item => item.name), ['b', 'c']);
});

test('the differential probes both sides of every rule', () => {
  const sample = model();
  const parent = sample.tables.find(table => table.name === 't_parent');
  const rows = probeRows(parent.checks.find(check => check.name === 'ck_t_parent_hash'), parent);
  assert.ok(rows.some(row => row.hash_vl === 'a'.repeat(64)));
  assert.ok(rows.some(row => row.hash_vl === `${'a'.repeat(64)}\n`), '끝 줄바꿈을 늘 시험한다');
  assert.ok(rows.some(row => row.hash_vl === null));
  assert.throws(() => probeRows({ expression: parseExpression("hash_vl::text ~ '^x+$'::text", ['hash_vl']) }, parent), isGap);
  // 여러 칸을 함께 NULL 로 둬야 통과하는 CHECK 도 허용 표본이 나와야 한다(V2_98 의 대상 모양 제약).
  const shape = { name: 't', columns: ['a', 'b', 'c'].map(name => ({ name, nullable: true, type: { kind: 'varchar', length: 20 } })) };
  const expression = parseExpression("a::text = 'X'::text AND b IS NULL AND c IS NULL OR a::text = 'Y'::text AND b IS NOT NULL AND c IS NULL", ['a', 'b', 'c']);
  const candidates = probeRows({ expression }, shape);
  assert.ok(candidates.some(row => row.a === 'X' && row.b === null && row.c === null));
  assert.ok(candidates.some(row => row.a === 'Y' && row.b !== null && row.c === null));
  // 범위의 양 끝은 서로 충돌하지 않는다.
  const bounded = { name: 't', columns: [{ name: 'n', nullable: false, type: { kind: 'integer' } }, { name: 'b', nullable: true, type: { kind: 'varchar', length: 5 } }] };
  const range = probeRows({ expression: parseExpression('n >= 1 AND n <= 10 AND b IS NULL', ['n', 'b']) }, bounded);
  assert.ok(range.some(row => row.n >= 1 && row.n <= 10 && row.b === null));
  // 오른쪽도 비교인 논리값 등식은 양쪽 가지를 만든다.
  const paired = { name: 't', columns: ['a', 'b'].map(name => ({ name, nullable: false, type: { kind: 'varchar', length: 5 } })) };
  const iff = probeRows({ expression: parseExpression("(a::text = 'X'::text) = (b::text = 'Y'::text)", ['a', 'b']) }, paired);
  assert.ok(iff.some(row => row.a === 'X' && row.b === 'Y'));
  assert.ok(iff.some(row => row.a !== 'X' && row.b !== 'Y'));
});

test('only certified vendors can be chosen and the ledger names every vendor', () => {
  const ledger = loadVendorLedger(ROOT);
  assert.deepEqual(ledger.vendors.map(vendor => vendor.id).sort(), [...VENDOR_IDS].sort());
  assert.deepEqual(selectableVendors(ledger), ['postgresql']);
  for (const id of Object.keys(VENDOR_ADAPTERS)) assert.ok(ledger.vendors.some(vendor => vendor.id === id));
  assert.ok(ledger.vendors.filter(vendor => vendor.status !== 'certified').every(vendor => vendor.reason), '고를 수 없는 벤더는 사유가 있다');
});

test('a block statement ends on a slash line and a plain statement on a semicolon', () => {
  assert.equal(renderFlywayMigration([{ sql: 'CREATE TABLE t (id NUMBER)' }, { sql: 'BEGIN NULL; END;', raw: true }]),
    'CREATE TABLE t (id NUMBER);\nBEGIN NULL; END;\n/\n');
});

test('the build uses the vendor driver and Flyway plugin and keeps the rest', () => {
  const build = `dependencies {
    implementation 'org.flywaydb:flyway-database-postgresql'
    implementation libs.postgresql
    // vendorIntegrationTest 가 벤더 DB 에 붙는 드라이버. 이관 도구와 같은 판이다.
    testRuntimeOnly 'com.oracle.database.jdbc:ojdbc11:23.26.3.0.0'
    testImplementation libs.h2
}
`;
  const projected = projectVendorBuild(build, 'oracle');
  assert.match(projected, /implementation 'org\.flywaydb:flyway-database-oracle'/);
  assert.match(projected, new RegExp(`runtimeOnly '${VENDOR_SOURCE.oracle.driverCoordinate}'`));
  assert.doesNotMatch(projected, /postgres/);
  assert.doesNotMatch(projected, /testRuntimeOnly 'com\.oracle/, '런타임 드라이버와 겹치는 시험 줄은 뺀다');
  assert.match(projected, /testImplementation libs\.h2/);
});

test('a build without the expected lines stops instead of keeping PostgreSQL', () => {
  assert.throws(() => projectVendorBuild("implementation libs.postgresql\n", 'oracle'), /Flyway 플러그인/);
  assert.throws(() => projectVendorBuild("implementation 'org.flywaydb:flyway-database-postgresql'\n", 'oracle'), /JDBC 드라이버/);
});

test('profile URLs and drivers move to the vendor without touching environment overrides', () => {
  const projected = projectVendorProfile(`    url: \${DB_URL:jdbc:postgresql://localhost:5432/egovdb?currentSchema=public&prepareThreshold=0}
    driver-class-name: org.postgresql.Driver
    jdbc-url: \${DB_URL}
`, 'oracle');
  assert.equal(projected, `    url: \${DB_URL:${VENDOR_SOURCE.oracle.url}}
    driver-class-name: ${VENDOR_SOURCE.oracle.driverClass}
    jdbc-url: \${DB_URL}
`);
});

test('the vendor document selects the SQL port and dialect and turns off Flyway placeholders', () => {
  const document = vendorApplicationDocument('oracle');
  assert.match(document, /^---\n/);
  assert.match(document, /vendor: oracle/);
  assert.match(document, /placeholder-replacement: false/);
  assert.match(document, new RegExp(`dialect: ${VENDOR_SOURCE.oracle.dialect.replaceAll('.', '\\.')}`));
});

test('a new request needs certification or a tool run, but a stored composition stays valid in any shell', () => {
  const catalog = loadProjectComposerCatalog(ROOT);
  const recipe = database => ({ schemaVersion: 1, project: { name: 'vendorcheck' }, sourceRef: 'main', selection: { preset: 'core' }, database, backendLayout: 'multi-module' });
  const refused = error => error.code === 'UNSUPPORTED_DATABASE';
  const previous = process.env.COMPOSER_PREVIEW_VENDOR;
  delete process.env.COMPOSER_PREVIEW_VENDOR;
  try {
    assert.throws(() => assertVendorRequestable(recipe({ vendor: 'oracle' })), refused);
    assert.doesNotThrow(() => assertVendorRequestable(recipe({ vendor: 'postgresql' })));
    assert.doesNotThrow(() => assertVendorRequestable({}), '벤더를 적지 않으면 기본값이다');
    assert.deepEqual(resolveProjectRecipe(recipe({ vendor: 'oracle' }), catalog).database, { vendor: 'oracle' }, '저장된 구성의 재검증은 환경에 기대지 않는다');
    assert.throws(() => resolveProjectRecipe(recipe({}), catalog), refused, '벤더 없는 구성은 받지 않는다');
    assert.throws(() => resolveProjectRecipe(recipe({ vendor: 'sqlite' }), catalog), refused);
    process.env.COMPOSER_PREVIEW_VENDOR = 'oracle';
    assert.doesNotThrow(() => assertVendorRequestable(recipe({ vendor: 'oracle' })));
    assert.throws(() => assertVendorRequestable(recipe({ vendor: 'mysql' })), refused, '켠 벤더만 받는다');
  } finally {
    if (previous === undefined) delete process.env.COMPOSER_PREVIEW_VENDOR;
    else process.env.COMPOSER_PREVIEW_VENDOR = previous;
  }
  assert.deepEqual([...DATABASE_VENDORS].sort(), [...VENDOR_IDS].sort());
});

test('generators refuse an uncertified vendor even when a composition is passed to them directly', () => {
  const catalog = loadProjectComposerCatalog(ROOT);
  const previous = process.env.COMPOSER_PREVIEW_VENDOR;
  delete process.env.COMPOSER_PREVIEW_VENDOR;
  try {
    const recipe = { schemaVersion: 1, project: { name: 'vendorcheck' }, sourceRef: 'main', selection: { preset: 'core' }, database: { vendor: 'oracle' }, backendLayout: 'multi-module' };
    const supplied = { ...resolveProjectRecipe(recipe, catalog), sourceCommit: 'a'.repeat(40) };
    assert.throws(() => resolveGeneratorComposition({ catalog, supplied, sourceCommit: supplied.sourceCommit, resolveSourceReference: () => supplied.sourceCommit }),
      error => error.code === 'UNSUPPORTED_DATABASE');
  } finally {
    if (previous === undefined) delete process.env.COMPOSER_PREVIEW_VENDOR;
    else process.env.COMPOSER_PREVIEW_VENDOR = previous;
  }
});

test('the lock binds the vendor projection to the composition and the baseline that runs', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendor-lock-'));
  try {
    const paths = vendorBaselinePaths('oracle');
    mkdirSync(join(root, paths.migration, '..'), { recursive: true });
    writeFileSync(join(root, paths.migration), 'CREATE TABLE t (id NUMBER);\n');
    const input = vendorInputPath('oracle');
    mkdirSync(join(root, input, '..'), { recursive: true });
    writeFileSync(join(root, input), '{}\n');
    mkdirSync(join(root, 'config/governance'), { recursive: true });
    writeFileSync(join(root, VENDOR_ASSET_LEDGER), JSON.stringify({ assets: ['migration-tool'] }));
    const projection = { vendor: 'oracle', ...paths, migrationSha256: artifactTextSha256(root, paths.migration), input, inputSha256: artifactTextSha256(root, input), removedAssets: ['migration-tool'] };
    const lock = { composition: { recipe: { database: { vendor: 'oracle' } } }, vendorProjection: projection };
    assert.deepEqual(vendorProjectionErrors(root, lock), []);
    assert.match(vendorProjectionErrors(root, { ...lock, vendorProjection: { ...projection, location: 'classpath:db/migration' } })[0], /differs from its composition/, 'Flyway 위치만 바꿔도 붉다');
    assert.match(vendorProjectionErrors(root, { ...lock, vendorProjection: undefined })[0], /differs from its composition/, '벤더 구성에 투영이 없으면 붉다');
    writeFileSync(join(root, input), '{"rows":{}}\n');
    assert.match(vendorProjectionErrors(root, lock)[0], /Vendor input differs/);
    writeFileSync(join(root, input), '{}\n');
    writeFileSync(join(root, paths.migration), 'DROP TABLE t;\n');
    assert.match(vendorProjectionErrors(root, lock)[0], /Vendor baseline differs/);
    writeFileSync(join(root, paths.migration), 'CREATE TABLE t (id NUMBER);\n');
    assert.deepEqual(vendorProjectionErrors(root, lock), []);
    assert.match(vendorProjectionErrors(root, { ...lock, vendorProjection: { ...projection, removedAssets: [] } })[0], /removed assets differ/, '잠금에서 지워 부재 대조를 끌 수 없다');
    mkdirSync(join(root, 'migration-tool'));
    assert.match(vendorProjectionErrors(root, lock)[0], /keeps a PostgreSQL-only asset: migration-tool/);
    assert.deepEqual(vendorProjectionErrors(root, { composition: { recipe: { database: { vendor: 'postgresql' } } } }), []);
    assert.match(vendorProjectionErrors(root, { composition: { recipe: { database: { vendor: 'postgresql' } } }, vendorProjection: projection })[0], /PostgreSQL composition/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the development runner keeps a local Oracle local and gives Flyway the vendor folder', () => {
  assert.equal(isLocalDatabaseUrl('jdbc:oracle:thin:@//localhost:1521/FREEPDB1'), true);
  assert.equal(isLocalDatabaseUrl('jdbc:oracle:thin:@//db.example.invalid:1521/FREEPDB1'), false);
  assert.equal(isLocalDatabaseUrl('jdbc:oracle:thin:@//localhost:1521,db.example.invalid:1521/FREEPDB1'), false, '주소가 여럿이면 모두 이 기계여야 한다');
  assert.equal(isLocalDatabaseUrl('jdbc:postgresql://localhost:5432,db.example.invalid:5432/egovdb'), false);
  assert.equal(isLocalDatabaseUrl('jdbc:postgresql://localhost:5432,127.0.0.1:5433/egovdb'), true);
  const { env } = backendEnvironment({ DB_URL: 'jdbc:oracle:thin:@//db.example.invalid:1521/FREEPDB1', DEV_REMOTE_FLYWAY: 'migrate' },
    { flywayLocation: 'classpath:db/vendor/oracle' });
  assert.equal(env.SPRING_FLYWAY_LOCATIONS, 'classpath:db/vendor/oracle');
});

test('a vendor project verifies on its own database instead of the PostgreSQL schema tests', () => {
  const postgresql = verificationSteps('full', 'multi-module');
  assert.ok(postgresql.find(step => step.id === 'backend').args.includes(':api-server:schemaValidationTest'));
  assert.equal(postgresql.filter(step => step.id === 'backend').length, 1);
  const vendor = verificationSteps('full', 'single-module', { vendor: 'oracle' }).filter(step => step.id === 'backend');
  assert.equal(vendor.length, 3);
  assert.ok(!vendor[0].args.some(arg => arg.includes('schemaValidationTest')));
  assert.deepEqual(vendor[1].args, ['scripts/project-composer-vendor-integration.mjs', '--input', vendorInputPath('oracle'), '--vendor', 'oracle', '--layout', 'single-module',
    '--flyway', vendorBaselinePaths('oracle').location]);
  assert.deepEqual(vendor[2].args, ['scripts/project-composer-vendor-differential.mjs', '--input', vendorInputPath('oracle'), '--vendor', 'oracle']);
  assert.equal(verificationVendor({ vendor: 'postgresql' }), undefined);
  assert.equal(verificationVendor({ vendor: 'oracle' }), 'oracle');
  const markers = verificationStepMarkers({ profile: 'core', layout: 'multi-module', vendor: 'oracle' });
  assert.equal(markers.get('[reusable-verify] core/multi-module: node scripts/project-composer-vendor-integration.mjs --input config/vendor/oracle/vendor-input.json --vendor oracle --layout multi-module --flyway classpath:db/vendor/oracle'), 'backend');
  assert.equal(integrationTask('single-module').task, ':vendorIntegrationTest');
  assert.equal(integrationTask('single-module').migrate, ':vendorFlywayMigrate');
  assert.throws(() => assertTestsRan('없는 폴더', []), /돌릴 시험이 없다/, '시험이 모두 빠지면 통과가 아니다');
  assert.equal(integrationTask().task, ':api-server:vendorIntegrationTest');
  assert.deepEqual(parseIntegrationArgs(['--input', 'x.json', '--vendor', 'oracle', '--layout', 'single-module']), { input: 'x.json', vendor: 'oracle', layout: 'single-module' });
  assert.deepEqual(ledgerClasses({ tests: [{ test: 'A.java', category: 'as-is' }, { test: 'B.java', category: 'as-is' }] }, name => name === 'B'), ['B'], '구성에서 빠진 시험은 돌았는지 묻지 않는다');
});

test('a failure in the vendor test command is reported as its own command', () => {
  const directory = mkdtempSync(join(tmpdir(), 'vendor-failure-'));
  try {
    const command = verificationSteps('full', 'multi-module', { vendor: 'oracle' }).filter(step => step.id === 'backend')[1];
    const line = [command.command, ...command.args].join(' ');
    const reports = join(directory, 'build/reports/reusable-base');
    mkdirSync(reports, { recursive: true });
    const failure = { step: 'backend', command: line, exitCode: 1, durationMs: 5 };
    writeFileSync(join(reports, 'full.json'), JSON.stringify({ result: 'failed', scope: 'full', sourceCommit: 'abc', layout: 'multi-module', profile: 'core',
      checkedAt: new Date().toISOString(), failure, steps: [{ ...failure, result: 'failed' }] }));
    const composition = { sourceCommit: 'abc', backendLayout: 'multi-module', profile: 'core', database: { vendor: 'oracle' } };
    assert.deepEqual(failedVerificationStep(directory, composition, new Date(0).toISOString()), { step: 'backend', command: line });
    const clock = { value: 1000 };
    const timeline = createJobTimeline({ now: () => clock.value });
    timeline.stage('verify');
    timeline.finish('passed', { verificationSteps: [{ step: 'backend', result: 'passed', durationMs: 1000 }, { step: 'backend', result: 'passed', durationMs: 9000 }] });
    assert.equal(timeline.snapshot().steps.find(item => item.id === 'backend').durationMs, 10000, '같은 단계의 명령 시간을 더한다');
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
});

test('the removal ledger names real files and leaves nothing behind that depends on them', () => {
  const ledger = readVendorAssetLedger(ROOT);
  const scripts = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).scripts;
  assert.deepEqual(staleVendorAssets(ledger, asset => existsSync(join(ROOT, asset)), scripts), []);
  for (const row of ledger.gates) {
    assert.ok(existsSync(join(ROOT, row.file)), `${row.file} 가 없다`);
    assert.ok(row.reason.trim() && Object.hasOwn(row, 'coveredBy'), `${row.file} 는 사유와 대체 여부를 적는다`);
  }
  const removed = new Set([...ledger.assets, ...ledger.gates.map(row => row.file)]);
  const gone = path => [...removed].some(asset => path === asset || path.startsWith(`${asset}/`));
  const broken = [];
  for (const name of readdirSync(join(ROOT, 'scripts')).filter(file => /\.m?js$/.test(file) && !gone(`scripts/${file}`))) {
    for (const [, target] of readFileSync(join(ROOT, 'scripts', name), 'utf8').matchAll(/from '\.\/([\w.-]+)'/g)) {
      if (gone(`scripts/${target}`)) broken.push(`${name} -> ${target}`);
    }
  }
  assert.deepEqual(broken, [], '남는 스크립트가 지운 파일을 import 하면 벤더 프로젝트에서 죽는다');
  const paths = [...removed];
  const aliases = Object.entries(scripts).filter(([alias, command]) => !ledger.aliases.includes(alias) && !Object.hasOwn(artifactAliases, alias)
    && paths.some(asset => command.includes(asset))).map(([alias]) => alias);
  assert.deepEqual(aliases, [], '남는 별칭이 지운 파일을 부르면 안 된다');
});

test('a vendor project loses the PostgreSQL tools, and a stale ledger stops before anything is removed', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendor-assets-'));
  try {
    const write = (path, text = '') => { mkdirSync(dirname(join(root, path)), { recursive: true }); writeFileSync(join(root, path), text); };
    write(VENDOR_ASSET_LEDGER, JSON.stringify({ assets: ['tool', 'a.mjs'], aliases: ['tool:run'], gates: [{ file: 'tool/a.test.mjs' }, { file: 'gone.test.mjs' }, { file: 'b.test.mjs' }] }));
    write('package.json', JSON.stringify({ scripts: { 'tool:run': 'x', keep: 'y' } }));
    write('tool/a.test.mjs'); write('a.mjs'); write('b.test.mjs'); write('keep.mjs');
    assert.deepEqual(pruneVendorPostgresAssets(root).files, ['b.test.mjs', 'tool/a.test.mjs'], '구성이 이미 뺀 게이트는 규칙에 적지 않는다');
    assert.equal(existsSync(join(root, 'tool')), false);
    assert.equal(existsSync(join(root, 'a.mjs')), false);
    assert.equal(existsSync(join(root, 'keep.mjs')), true);
    assert.deepEqual(JSON.parse(readFileSync(join(root, 'package.json'), 'utf8')).scripts, { keep: 'y' });
    write('keep2.mjs');
    assert.throws(() => pruneVendorPostgresAssets(root), /벤더 제거 원장이 낡았다: tool, a\.mjs, tool:run/);
    assert.equal(existsSync(join(root, 'keep2.mjs')), true);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a vendor composition acknowledges the asset rule and a PostgreSQL one does not', () => {
  const modules = loadComposerModules(ROOT);
  const base = { profile: 'core', resolvedDomains: [], frontend: { removePaths: [] } };
  const rules = recipe => composerProfile(modules, { ...base, recipe }).acknowledgedGateRemovalRules.map(row => row.rule);
  assert.equal(rules({ database: { vendor: 'postgresql' } }).includes(VENDOR_ASSET_RULE), false);
  assert.equal(rules({ database: { vendor: 'oracle' } }).includes(VENDOR_ASSET_RULE), true);
});

test('a missing gate scan root stays a failure unless a vendor project removed it by the ledger', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendor-scan-'));
  const ledger = assets => { mkdirSync(join(root, 'config/governance'), { recursive: true }); writeFileSync(join(root, VENDOR_ASSET_LEDGER), JSON.stringify({ assets })); };
  try {
    for (const scanRoot of HARNESS_SCAN_ROOTS.filter(item => !item.startsWith('migration-tool/'))) mkdirSync(join(root, scanRoot), { recursive: true });
    ledger(['migration-tool']);
    assert.throws(() => computeHarnessBaselineEntries(root), /스캔 루트를 찾을 수 없다 — migration-tool/, '벤더 기준선이 없는 저장소는 예외가 아니다');
    mkdirSync(join(root, 'api-server/src/main/resources/db/vendor/oracle'), { recursive: true });
    ledger(['tools/other']);
    assert.throws(() => computeHarnessBaselineEntries(root), /스캔 루트를 찾을 수 없다 — migration-tool/, '원장에 없는 경로는 예외가 아니다');
    ledger(['migration-tool']);
    assert.doesNotThrow(() => computeHarnessBaselineEntries(root));
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('the isolated runner stops on a vendor project before it starts PostgreSQL', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendor-runner-'));
  try {
    assert.doesNotThrow(() => assertIsolatedRunnerSupportsProject(root), '원본 저장소에는 잠금이 없다');
    writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify({ profile: 'core' }));
    assert.doesNotThrow(() => assertIsolatedRunnerSupportsProject(root), 'PostgreSQL 생성물은 그대로 돈다');
    writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify({ vendorProjection: { vendor: 'oracle' } }));
    assert.throws(() => assertIsolatedRunnerSupportsProject(root), /oracle projects are not supported yet/);
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
});

test('a vendor container started for a job carries that job token, so a cancel can reclaim it', async () => {
  const token = 'ab'.repeat(8);
  assert.deepEqual(vendorContainerLabels('oracle', token), ['--label', 'egov.composer.vendor=oracle', '--label', `egov.project-composer=${token}`]);
  assert.deepEqual(vendorContainerLabels('oracle', ''), ['--label', 'egov.composer.vendor=oracle']);
  assert.throws(() => vendorContainerLabels('oracle', 'x;rm'), /작업 토큰 형식/);

  const id = name => name.repeat(64);
  const run = async ({ byToken, listed, container = id('a') }) => {
    const calls = [];
    const docker = async args => {
      calls.push(args[0]);
      if (args[0] === 'ps') return listed.join('\n');
      if (args[0] === 'inspect') return token;
      return '';
    };
    await removeJobContainers(docker, { container, token, byToken });
    return calls;
  };
  assert.deepEqual(await run({ byToken: false, listed: [id('b')] }), ['inspect', 'rm'], 'PostgreSQL 작업은 전과 같다');
  assert.deepEqual(await run({ byToken: true, listed: [id('b'), id('c')] }), ['inspect', 'rm', 'ps', 'inspect', 'rm', 'inspect', 'rm'], '자식이 띄운 컨테이너까지 회수한다');
  assert.deepEqual(await run({ byToken: false, listed: [id('b')], container: null }), ['ps', 'inspect', 'rm'], 'ID 를 못 받았으면 표식으로 찾는다');
});

test('the disposable baseline database goes away whatever happens, and a leftover is not a pass', () => {
  const calls = [];
  const docker = outcomes => args => { calls.push(args[0]); return outcomes[args[0]] ?? { status: 0, stdout: '', stderr: '' }; };
  assert.throws(() => withDisposablePostgres(() => assert.fail('돌면 안 된다'), docker({ run: { status: 1, stderr: '이미지 없음' } })), /기준 PostgreSQL 을 띄우지 못했다/);
  assert.ok(calls.includes('rm'), '띄우지 못해도 지운다');
  assert.throws(() => withDisposablePostgres(() => { throw new Error('대조 실패'); }, docker({ rm: { status: 1 } })), /대조 실패.*시험 DB 컨테이너가 남았다/, '본래 실패에 잔존을 덧붙인다');
  assert.throws(() => withDisposablePostgres(() => 'ok', docker({ rm: { status: 1 } })), /시험 DB 컨테이너가 남았다/, '남은 컨테이너를 성공으로 넘기지 않는다');
  assert.equal(withDisposablePostgres(() => 'ok', docker({})), 'ok');
});

test('the development stack moves to the vendor service and leaves the application services alone', () => {
  const compose = `services:
  db:
    image: postgres:17
    volumes:
      - postgres_data:/var/lib/postgresql/data

  api:
    environment:
      SPRING_FLYWAY_LOCATIONS: classpath:db/migration
      SPRING_APPLICATION_JSON: >
        { "url": "jdbc:postgresql://db:5432/egovdb" }

volumes:
  postgres_data:
`;
  const projected = projectVendorCompose(compose, 'oracle');
  assert.doesNotMatch(projected, /postgres/);
  assert.match(projected, /image: gvenzl\/oracle-free:23-slim-faststart@sha256:/);
  assert.match(projected, /127\.0\.0\.1:1521:1521/, '호스트 공개는 루프백으로 좁힌다');
  assert.match(projected, /jdbc:oracle:thin:@\/\/db:1521\/FREEPDB1/);
  assert.match(projected, /^ {2}api:$/m);
  assert.match(projected, /^ {2}oracle_data:$/m);
  assert.equal(projectVendorCompose(`${compose}      SPRING_FLYWAY_LOCATIONS: \${SPRING_FLYWAY_LOCATIONS:-classpath:db/migration,classpath:db/seed-dev}\n`, 'oracle').includes('classpath:db/migration'), false, '환경 변수가 설정 파일을 이기므로 compose 에 PostgreSQL 위치를 남기지 않는다');
  assert.throws(() => projectVendorCompose('services:\n  web:\n', 'oracle'), /compose db 서비스/);

  const prod = projectVendorComposeProd(`    environment:
      POSTGRES_USER: \${DB_USERNAME:?필요}
      POSTGRES_PASSWORD: \${DB_PASSWORD:?필요}
      SPRING_FLYWAY_LOCATIONS: classpath:db/migration
`, 'oracle');
  assert.match(prod, /SPRING_FLYWAY_LOCATIONS: classpath:db\/vendor\/oracle/);
  assert.match(prod, /APP_USER: \$\{DB_USERNAME/);
  assert.match(prod, /APP_USER_PASSWORD: \$\{DB_PASSWORD/);
  assert.match(prod, /ORACLE_PASSWORD: \$\{DB_ADMIN_PASSWORD/, 'SYS 비밀번호는 앱 비밀번호와 나눈다');
  assert.doesNotMatch(prod, /POSTGRES/);

  const deploy = projectVendorDeploy(`for v in DB_URL DB_PASSWORD MAIL_HOST; do
case "$DB_URL" in
    jdbc:postgresql://db:5432/egovdb|jdbc:postgresql://db:5432/egovdb\\?*) ;;
    *) echo "전용입니다(jdbc:postgresql://db:5432/egovdb)" ;;
esac
`, 'oracle');
  assert.doesNotMatch(deploy, /postgresql/);
  assert.match(deploy, /DB_PASSWORD DB_ADMIN_PASSWORD MAIL_HOST/);
  assert.match(deploy, /^ {4}jdbc:oracle:thin:@\/\/db:1521\/FREEPDB1\) ;;$/m);

  const environment = projectVendorEnvironment('DB_URL=jdbc:postgresql://localhost:5432/egovdb?sslmode=disable\nDB_PASSWORD=egov123\n', 'oracle');
  assert.match(environment, new RegExp(`^DB_URL=${VENDOR_SOURCE.oracle.url}$`, 'm'));
  assert.match(environment, /^DB_ADMIN_PASSWORD=/m);
});
