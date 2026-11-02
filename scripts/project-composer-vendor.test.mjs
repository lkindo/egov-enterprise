import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildVendorModel, parseExpression, tablesInDependencyOrder, VendorTranslationGap } from './project-composer-vendor-model.mjs';
import { assertCatalogParity, assertCoverage, createEmission, emitRows, exactNumber, nextValues, renderExpression, violationExpression } from './project-composer-vendor-sql.mjs';
import { loadVendorLedger, selectableVendors, translateForAllVendors, VENDOR_ADAPTERS, VENDOR_IDS, VENDOR_LEDGER_PATH, vendorChoices } from './project-composer-vendors.mjs';
import { clobLiteral, oracleAdapter } from './project-composer-vendor-oracle.mjs';
import { mariadbAdapter, mysqlAdapter } from './project-composer-vendor-mysql.mjs';
import { mssqlAdapter } from './project-composer-vendor-mssql.mjs';
import { cubridAdapter } from './project-composer-vendor-cubrid.mjs';
import { differentialExitCode, probeRows, withDisposablePostgres } from './project-composer-vendor-differential.mjs';
import { rowCounts } from './project-composer-vendor-verify.mjs';
import { VENDOR_EXIT_CODES, vendorExitCode } from './project-composer-errors.mjs';
import { VENDOR_BASELINE_VERSION, assertTestsRan, conformanceCatalog, integrationEnvironment, integrationTask, ledgerClasses, parseIntegrationArgs, unchangedUniques, vendorMigrationNameProblems } from './project-composer-vendor-integration.mjs';
import { vendorInputPath, verificationSteps, verificationVendor } from './verify-reusable-artifact.mjs';
import { failedVerificationStep } from './project-composer-job-failure.mjs';
import { createJobTimeline, verificationStepMarkers } from './project-composer-timeline.mjs';
import { collectResults, launchVendorContainer, parseCount, readCatalog, readNextValues, readUniqueSignatures, runAsAdministrator, startVendorEngine, stopVendorEngineReporting, VENDOR_ENGINES, VENDOR_UNIQUE_SIGNATURES, vendorContainerLabels } from './project-composer-vendor-engine.mjs';
import { removeJobContainers } from './project-composer-postgres.mjs';
import { VENDOR_ASSET_LEDGER, VENDOR_ASSET_RULE, pruneVendorPostgresAssets, readVendorAssetLedger, staleVendorAssets } from './reusable-vendor-assets.mjs';
import { artifactAliases } from './reusable-artifact-entrypoints-contract.mjs';
import { HARNESS_SCAN_ROOTS, computeHarnessBaselineEntries } from './harness-baseline-manifest.mjs';
import { assertBuildTarget, assertIsolatedRunnerSupportsProject, assertNoDotEnv, closedEnvironment, createIsolatedMfaEnvironment, launchIsolatedVendorDatabase, parseRepresentativeArguments, provisionRepresentativeAccounts, readRepresentativeBundle, removeVendorDatabase, representativeSelection, resolveVendorEngine, validateLocalRun, vendorDatabaseEnvironment } from './run-isolated-e2e.mjs';
import { assertIsolatedTarget, assertOwnedVendorDatabase, assertRemovableVendorDatabase, validateIsolationManifest } from './e2e-isolation.mjs';
import { composerProfile } from './project-composer-source.mjs';
import { certifyVendor } from './project-composer-vendor-evidence.test-helpers.mjs';
import { loadComposerModules } from './composer-modules.mjs';
import { projectVendorBuild, projectVendorCompose, projectVendorComposeProd, projectVendorDeploy, projectVendorDockerfile, projectVendorEnvironment, projectVendorSettings, projectVendorProfile, renderFlywayMigration, VENDOR_SOURCE,
  VENDOR_SCHEMA_ALIAS, vendorApplicationDocument, vendorMigrationLocation, vendorReadme } from './project-composer-vendor-project.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { assertVendorRequestable, resolveGeneratorComposition, resolveProjectRecipe } from './project-composer-recipe.mjs';
import { artifactTextSha256, vendorBaselinePaths, vendorProjectionErrors } from './reusable-governance-integrity.mjs';
import { DATABASE_VENDORS } from './project-composer-db.mjs';
import { backendEnvironment, isLocalDatabaseUrl } from './dev.mjs';
import { createComposerEngine } from './project-composer.mjs';
import { validateComposerRequestRecipe } from './project-composer-server.mjs';

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
  // 표식이 빠진 것은 끊김일 수도, 앞 문장이 스크립트를 삼킨 번역 결함일 수도 있어 대상 DB 탓으로 말하지 않는다.
  const incomplete = error => error.code === 'VENDOR_RUN_INCOMPLETE';
  assert.throws(() => collectResults({ status: 0, stdout: '@@0\n@@COMPLETED\n' }, statements, errors, 'mysql'), incomplete, '문장 표식이 빠지면 실패다');
  assert.throws(() => collectResults({ status: 137, stdout: '@@0\n@@1\n', stderr: 'Killed\n' }, statements, errors, 'mysql'), incomplete, '마지막 문장 뒤의 단절도 실패다');
  assert.throws(() => collectResults({ status: 1, stdout: '@@0\n@@1\nERROR 2013 (HY000): Lost connection\n@@COMPLETED\n' }, statements, errors, 'mysql'), notReady, '연결 단절은 값 거부가 아니다');
  assert.throws(() => collectResults({ status: 0, stdout: '' }, statements, errors, 'mysql'), incomplete, '접속 실패의 빈 출력은 전부 통과가 아니다');
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
  // 사유는 화면에 그대로 나간다.
  for (const vendor of ledger.vendors.filter(row => row.status !== 'certified')) assert.match(vendor.reason, /습니다\.$/, vendor.id);
});

/** 실제 원장을 바꿔 임시 폴더에 쓰고 검증 함수로 다시 읽는다. change 가 원장 전체를 고칠 수 있다. */
function ledgerCopy(t, change) {
  const directory = mkdtempSync(join(tmpdir(), 'vendor-ledger-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const ledger = JSON.parse(readFileSync(join(ROOT, VENDOR_LEDGER_PATH), 'utf8'));
  change(id => ledger.vendors.find(vendor => vendor.id === id));
  mkdirSync(join(directory, 'config'));
  writeFileSync(join(directory, VENDOR_LEDGER_PATH), JSON.stringify(ledger));
  return directory;
}
const certify = id => vendor => { certifyVendor(vendor(id)); };
const withPreviewEnv = (value, action) => {
  const previous = process.env.COMPOSER_PREVIEW_VENDOR;
  if (value === undefined) delete process.env.COMPOSER_PREVIEW_VENDOR; else process.env.COMPOSER_PREVIEW_VENDOR = value;
  try { return action(); } finally {
    if (previous === undefined) delete process.env.COMPOSER_PREVIEW_VENDOR; else process.env.COMPOSER_PREVIEW_VENDOR = previous;
  }
};

test('a ledger that would mislead the screen or strand the default vendor is refused', t => {
  const load = change => () => loadVendorLedger(ledgerCopy(t, change));
  assert.doesNotThrow(load(() => {}));
  assert.throws(load(vendor => { vendor('postgresql').status = 'preview'; vendor('postgresql').reason = '시험'; }), /기본 벤더는 certified/);
  assert.throws(load(vendor => { delete vendor('oracle').label; }), /oracle: 화면에 보일 이름이 없다/);
  assert.throws(load(vendor => { delete vendor('oracle').reason; }), /oracle: 고를 수 없는 사유가 없다/);
  assert.throws(load(vendor => { vendor('oracle').status = 'certified'; }), /oracle: 증거 없는 certified/);
});

test('vendor choices carry the same judgement as the request check and leave evidence behind', t => {
  const ledger = loadVendorLedger(ledgerCopy(t, certify('oracle')));
  const choices = vendorChoices(ledger);
  assert.deepEqual(choices.filter(choice => choice.selectable).map(choice => choice.id), selectableVendors(ledger));
  assert.deepEqual(choices.find(choice => choice.id === 'oracle'), { id: 'oracle', label: 'Oracle', selectable: true });
  const mysql = choices.find(choice => choice.id === 'mysql');
  assert.equal(mysql.selectable, false);
  assert.ok(mysql.reason);
  assert.doesNotMatch(JSON.stringify(choices), /evidence|engines|status/);
});

test('certifying a vendor in the ledger opens every request entry without a code change', t => {
  const catalog = loadProjectComposerCatalog(ROOT);
  const recipe = vendor => ({ schemaVersion: 1, project: { name: 'vendorcheck' }, sourceRef: 'HEAD', selection: { preset: 'core' }, database: { vendor }, backendLayout: 'multi-module' });
  const certified = loadVendorLedger(ledgerCopy(t, certify('oracle')));
  const opened = createComposerEngine({ loadCatalog: () => catalog, loadVendors: () => certified });
  const closed = createComposerEngine({ loadCatalog: () => catalog });
  withPreviewEnv(undefined, () => {
    const selectable = opened.selectableVendors();
    assert.deepEqual(selectable, ['postgresql', 'oracle']);
    assert.equal(validateComposerRequestRecipe(recipe('oracle'), selectable).database.vendor, 'oracle', '서버');
    assert.equal(opened.plan(recipe('oracle')).database.vendor, 'oracle', '엔진');
    assert.equal(opened.catalog().vendors.find(choice => choice.id === 'oracle').selectable, true, '화면');
    const supplied = { ...resolveProjectRecipe({ ...recipe('oracle'), sourceRef: 'a'.repeat(40) }, catalog), sourceCommit: 'a'.repeat(40) };
    assert.equal(resolveGeneratorComposition({ catalog, supplied, selectable, sourceCommit: supplied.sourceCommit, resolveSourceReference: () => supplied.sourceCommit }).database.vendor, 'oracle', '생성기 입구');
    assert.throws(() => opened.plan(recipe('mysql')), error => error.code === 'INVALID_RECIPE' && error.details.reason === 'UNSUPPORTED_DATABASE', '올리지 않은 벤더는 그대로다');
    // 원장이 구성 해시에 들어가면 승격이 PostgreSQL 산출물의 식별값을 바꾼다. 여기는 같은 카탈로그를 주입하므로 엔진만 본다.
    // 카탈로그 로더가 원장을 읽는 회귀는 composer-modules.test.mjs 가 원장을 바꾼 트리에서 본다.
    assert.equal(opened.plan(recipe('postgresql')).compositionHash, closed.plan(recipe('postgresql')).compositionHash);
    assert.equal(opened.catalog().catalogHash, closed.catalog().catalogHash);
  });
});

test('the preview switch opens the tool path only: the screen path keeps reading the ledger', () => {
  const catalog = loadProjectComposerCatalog(ROOT);
  const recipe = { schemaVersion: 1, project: { name: 'vendorcheck' }, sourceRef: 'HEAD', selection: { preset: 'core' }, database: { vendor: 'mysql' }, backendLayout: 'multi-module' };
  const engine = createComposerEngine({ loadCatalog: () => catalog });
  const closed = error => error.code === 'INVALID_RECIPE' && error.details.reason === 'UNSUPPORTED_DATABASE';
  withPreviewEnv(undefined, () => assert.throws(() => engine.plan(recipe), closed));
  withPreviewEnv('mysql', () => {
    assert.equal(engine.plan(recipe).database.vendor, 'mysql', '도구 실행');
    assert.ok(!engine.selectableVendors().includes('mysql'), '서버가 받는 목록은 환경값으로 넓어지지 않는다');
    assert.throws(() => validateComposerRequestRecipe(recipe, engine.selectableVendors()), error => error.code === 'INVALID_RECIPE', '서버');
    assert.equal(engine.catalog().vendors.find(choice => choice.id === 'mysql').selectable, false, '화면');
  });
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
    const selectable = ['postgresql'];
    assert.throws(() => assertVendorRequestable(recipe({ vendor: 'oracle' }), selectable), refused);
    assert.doesNotThrow(() => assertVendorRequestable(recipe({ vendor: 'postgresql' }), selectable));
    assert.doesNotThrow(() => assertVendorRequestable({}, selectable), '벤더를 적지 않으면 기본값이다');
    assert.doesNotThrow(() => assertVendorRequestable(recipe({ vendor: 'oracle' }), ['postgresql', 'oracle']), '원장이 올린 벤더는 환경값 없이 받는다');
    assert.throws(() => assertVendorRequestable(recipe({ vendor: 'postgresql' })), TypeError, '원장을 넘기지 않은 입구는 기본값으로도 통과하지 못한다');
    assert.deepEqual(resolveProjectRecipe(recipe({ vendor: 'oracle' }), catalog).database, { vendor: 'oracle' }, '저장된 구성의 재검증은 환경에 기대지 않는다');
    assert.throws(() => resolveProjectRecipe(recipe({}), catalog), refused, '벤더 없는 구성은 받지 않는다');
    assert.throws(() => resolveProjectRecipe(recipe({ vendor: 'sqlite' }), catalog), refused);
    process.env.COMPOSER_PREVIEW_VENDOR = 'oracle';
    assert.doesNotThrow(() => assertVendorRequestable(recipe({ vendor: 'oracle' }), selectable));
    assert.throws(() => assertVendorRequestable(recipe({ vendor: 'mysql' }), selectable), refused, '켠 벤더만 받는다');
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
    assert.throws(() => resolveGeneratorComposition({ catalog, supplied, selectable: ['postgresql'], sourceCommit: supplied.sourceCommit, resolveSourceReference: () => supplied.sourceCommit }),
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

test('the schema command skips the certification step and exists only for a vendor project', () => {
  const steps = verificationSteps('vendor-schema', 'multi-module', { vendor: 'oracle' });
  assert.deepEqual(steps.map(step => step.id), ['backend', 'backend'], '거버넌스 첫 단계를 지나지 않아 소스 변경 뒤에도 스키마 신호를 받는다');
  assert.ok(steps[0].args.includes(':api-server:harnessTest'));
  assert.deepEqual(steps[1].args, verificationSteps('full', 'multi-module', { vendor: 'oracle' }).filter(step => step.id === 'backend')[1].args, '통합 단계는 전체 검증과 같은 명령이다');
  assert.ok(verificationSteps('vendor-schema', 'single-module', { vendor: 'oracle' })[0].args.includes('harnessTest'));
  assert.throws(() => verificationSteps('vendor-schema', 'multi-module'), /PostgreSQL 외 DB 로 생성한 프로젝트에서만/);
  assert.equal(verificationSteps('full', 'multi-module', { vendor: 'oracle' })[0].id, 'governance', '전체 검증의 의미는 그대로다');
  assert.equal(integrationTask().conformance, ':api-server:vendorConformanceTest');
  assert.equal(integrationTask('single-module').conformance, ':vendorConformanceTest');
});

test('the vendor folder takes only migrations after the baseline', () => {
  assert.deepEqual(vendorMigrationNameProblems(['V1_0__vendor_baseline.sql', 'V1_1__extra.sql', 'V1_10__more.sql', 'V2_0__next.sql', 'notes.txt']), []);
  assert.deepEqual(vendorMigrationNameProblems(['R__repeat.sql', 'V0_9__before.sql', 'V1_0__other.sql', 'V1_0_1__patch.sql', 'U1_1__undo.sql', 'V1_1_no_separator.sql']),
    ['R__repeat.sql', 'V0_9__before.sql', 'V1_0__other.sql', 'V1_0_1__patch.sql', 'U1_1__undo.sql', 'V1_1_no_separator.sql']);
  assert.equal(VENDOR_BASELINE_VERSION, '1.0');
  assert.match(vendorBaselinePaths('oracle').migration, /\/V1_0__vendor_baseline\.sql$/, '기준선 버전은 파일 이름과 같다');
});

test('the catalog test sees the engine names an adopter did not choose removed, and every kind present', () => {
  const catalog = { columns: ['tb_a.id'], constraints: ['tb_a.primary', 'tb_a.pk_tb_a'], indexes: ['tb_a.ix_a'], triggers: ['tb_a.t'], sequences: ['.sq_a'] };
  assert.deepEqual(conformanceCatalog('mysql', catalog).constraints, ['tb_a.pk_tb_a'], 'MySQL 은 모든 기본키의 제약 이름이 PRIMARY 다');
  assert.deepEqual(conformanceCatalog('mariadb', catalog).constraints, ['tb_a.pk_tb_a']);
  assert.deepEqual(conformanceCatalog('oracle', catalog).constraints, ['tb_a.primary', 'tb_a.pk_tb_a'], '다른 벤더의 primary 는 도입자가 정한 이름이라 판정 대상이다');
  assert.deepEqual(conformanceCatalog('cubrid', { columns: ['tb_a.id'] }), { columns: ['tb_a.id'], constraints: [], indexes: [], sequences: [] }, '조회가 없는 종류도 빈 목록으로 넘긴다');
});

test('a unique counts as baseline only while its signature is unchanged, and every integration vendor can read signatures', () => {
  const baseline = ['tb_a.uk_keep=10', 'tb_a.uk_recreated=11', 'tb_b.uk_dropped=12'];
  assert.deepEqual(unchangedUniques(baseline, ['tb_a.uk_keep=10', 'tb_a.uk_recreated=99', 'tb_c.uk_new=13']), ['tb_a.uk_keep'], '다시 만든 유니크와 새 유니크는 기준선이 아니다');
  assert.deepEqual(unchangedUniques([], ['tb_a.uk_keep=10']), [], '조회가 비면 모두 새 유니크로 보여 붉다');
  assert.deepEqual(Object.entries(VENDOR_ENGINES).filter(([id, engine]) => engine.integration && !VENDOR_UNIQUE_SIGNATURES[id.replace(/\d+$/, '')]).map(([id]) => id), [], '통합 시험을 여는 벤더는 유니크 서명 조회가 있어야 한다');
  const output = readUniqueSignatures({}, 'oracle', () => ({ errors: [], sections: new Map([[0, ['tb_a.uk_keep=10', '  tb_a.sys_c0012=11  ', 'garbage line']]]) }));
  assert.deepEqual(output, ['tb_a.uk_keep=10', 'tb_a.sys_c0012=11']);
  assert.throws(() => readUniqueSignatures({}, 'mysql', () => ({ errors: [], sections: new Map() })), /유니크 서명 조회가 없다/);
  assert.throws(() => readUniqueSignatures({}, 'oracle', () => ({ errors: [{ error: 'ORA-00942' }], sections: new Map() })), /유니크 서명 조회 실패: ORA-00942/);
});

test('a vendor cannot be certified while the catalog gate is not wired into CI', () => {
  const gate = JSON.parse(readFileSync(join(ROOT, 'config/governance/gates.json'), 'utf8')).gateSets.find(set => set.id === 'GATESET-VENDOR-CONFORMANCE');
  const ledger = JSON.parse(readFileSync(join(ROOT, 'config/db-vendors.json'), 'utf8'));
  const certified = ledger.vendors.filter(vendor => vendor.id !== 'postgresql' && vendor.status === 'certified').map(vendor => vendor.id);
  assert.deepEqual(gate.ciPending ? certified : [], [], 'reusable-vendor 잡을 잇고 ciPending 을 지운 뒤에 승격한다');
});

test('the baseline is compared before anything else is applied, and the catalog test runs before the fixtures', () => {
  const source = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  const start = source.indexOf('export function runVendorIntegration');
  const order = ['migrateWithFlyway(vendorId, integration, handle, migrate, flyway, VENDOR_BASELINE_VERSION)', 'assertVendorApplied(handle, input, vendorId',
    'const baseline = conformanceCatalog', 'const baselineUniques = readUniqueSignatures', 'migrateWithFlyway(vendorId, integration, handle, migrate, flyway);', 'unchangedUniques(baselineUniques', 'runVendorConformance(vendorId', 'runAsAdministrator(handle', 'markOwner(handle)'];
  const positions = order.map(text => source.indexOf(text, start));
  assert.ok(positions.every(position => position > 0), '순서를 보는 문장이 사라졌다');
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right), '기준선 정확 대조는 나머지 적용 앞, 카탈로그 시험은 권한 부여와 소유 표시 앞이다');
  const migrate = readFileSync(join(ROOT, 'api-server/src/test/java/nuri/api/schema/VendorFlywayMigrate.java'), 'utf8');
  assert.match(migrate, /applied != 1/, '기준선 단계는 하나만 적용됐는지 본다');
});

test('the catalog test replaces the entity linter only in a vendor project, by the ledger', () => {
  const ledger = readVendorAssetLedger(ROOT);
  const row = ledger.gates.find(item => item.file.endsWith('EntitySchemaConformanceLinterTest.java'));
  assert.match(row.coveredBy, /VendorCatalogConformanceTest/);
  assert.match(row.coveredBy, /Hibernate validate/, '표·컬럼 부재는 validate 가 본다고 적는다');
  for (const kept of ['UniqueConstraintMirrorLinterTest', 'SchemaNamingLinterTest']) {
    assert.ok(!ledger.gates.some(item => item.file.includes(kept)), `${kept} 는 기준선 입력을 계속 본다`);
  }
  const profile = readFileSync(join(ROOT, 'api-server/src/test/resources/application-tc.yml'), 'utf8');
  assert.match(profile, /ddl-auto: validate/, '대체의 한쪽이 Hibernate validate 다');
  assert.equal(integrationEnvironment('oracle', VENDOR_ENGINES.oracle.integration, { port: 1, password: 'x', owner: 'y' }).SPRING_JPA_HIBERNATE_DDL_AUTO, undefined, '벤더 실행이 validate 를 덮지 않는다');
});

test('the README procedure names a command that exists and what it does not cover', () => {
  const readme = vendorReadme('oracle');
  assert.ok(readme.includes(`npm run ${VENDOR_SCHEMA_ALIAS}`));
  assert.match(readme, /db\/vendor\/oracle/);
  assert.match(readme, /V1_1__/);
  for (const limit of ['파괴적 DDL', '명명 예외', 'CHECK·트리거', '새 권한 코드', '새 Java 소스']) assert.ok(readme.includes(limit), limit);
  assert.match(readme, /인증이 아니다/);
  assert.doesNotMatch(readme, /그쪽에도 맞춰 두어야/, '실행되지 않는 파일에 맞추라는 옛 안내가 돌아오면 안 된다');
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

const DEMO_DOMAINS = () => JSON.parse(readFileSync(join(ROOT, 'config/governance/vendor-test-ledger.json'), 'utf8')).representativeE2e.requiredDomains;

function runnerProject(lock) {
  const root = mkdtempSync(join(tmpdir(), 'vendor-runner-'));
  mkdirSync(join(root, 'config/governance'), { recursive: true });
  writeFileSync(join(root, 'config/governance/vendor-test-ledger.json'), readFileSync(join(ROOT, 'config/governance/vendor-test-ledger.json')));
  if (lock) writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify(lock));
  return root;
}

test('the isolated runner opens a vendor project only for the representative bundle and leaves PostgreSQL alone', () => {
  const fullVendor = { layout: 'multi-module', vendorProjection: { vendor: 'oracle' }, composition: { resolvedDomains: DEMO_DOMAINS() } };
  const cases = [
    [null, {}, null, '원본 저장소에는 잠금이 없다'],
    [null, { representative: true }, null, '원본 저장소의 PostgreSQL 대조 실행'],
    [{ profile: 'core' }, {}, null, 'PostgreSQL 생성물의 기존 실행 방식은 구성을 보지 않는다'],
    [{ layout: 'multi-module', composition: { resolvedDomains: DEMO_DOMAINS() } }, { representative: true }, null, 'PostgreSQL 전체 기능 생성물의 대조 실행'],
    [fullVendor, { representative: true }, 'oracle', '벤더 전체 기능 멀티모듈 생성물'],
  ];
  for (const [lock, options, expected, label] of cases) {
    const root = runnerProject(lock);
    try { assert.equal(assertIsolatedRunnerSupportsProject(root, options), expected, label); }
    finally { rmSync(root, { recursive: true, force: true }); }
  }
  const refusals = [
    [{ vendorProjection: { vendor: 'oracle' } }, {}, /oracle 프로젝트는 대표 묶음\(--representative\)만 실행할 수 있다/],
    [fullVendor, {}, /oracle 프로젝트는 대표 묶음/],
    [{ ...fullVendor, layout: 'single-module' }, { representative: true }, /multi-module 생성물에서만 실행할 수 있다\(현재 single-module\)/],
    [{ ...fullVendor, composition: { resolvedDomains: DEMO_DOMAINS().filter(domain => domain !== 'informalsanction') } }, { representative: true }, /필요한 기능이 이 구성에 없다: informalsanction/],
    [{ layout: 'multi-module', composition: { resolvedDomains: ['board'] } }, { representative: true }, /필요한 기능이 이 구성에 없다: addressbook/],
  ];
  for (const [lock, options, message] of refusals) {
    const root = runnerProject(lock);
    try { assert.throws(() => assertIsolatedRunnerSupportsProject(root, options), message); }
    finally { rmSync(root, { recursive: true, force: true }); }
  }
});

test('the representative bundle is fixed by the ledger and refuses extra arguments', () => {
  assert.deepEqual(parseRepresentativeArguments([]), { enabled: false });
  assert.deepEqual(parseRepresentativeArguments(['--', '--project=full-suite']), { enabled: false }, '기존 인자는 그대로 지나간다');
  assert.deepEqual(parseRepresentativeArguments(['--ci-compose', '--full-inventory']), { enabled: false });
  assert.deepEqual(parseRepresentativeArguments(['--representative']), { enabled: true, engineId: undefined });
  assert.deepEqual(parseRepresentativeArguments(['--representative', '--vendor-engine=oracle19']), { enabled: true, engineId: 'oracle19' });
  for (const extra of [['-g', 'x'], ['--', '--project=full-suite'], ['--vendor-engine=oracle19', '-g'], ['--vendor-engine='], ['e2e/journeys/approvals.spec.ts']]) {
    assert.throws(() => parseRepresentativeArguments(['--representative', ...extra]), /--vendor-engine=<엔진> 외의 인자를 받지 않는다/, extra.join(' '));
  }
  const { specs } = readRepresentativeBundle(ROOT);
  assert.deepEqual([...specs].sort(), [
    'e2e/contracts/authentication.spec.ts', 'e2e/contracts/authorization.spec.ts', 'e2e/contracts/menu-visibility.spec.ts', 'e2e/contracts/request-denial.spec.ts',
    'e2e/journeys/approvals.spec.ts', 'e2e/journeys/audit-log.spec.ts', 'e2e/journeys/authentication.spec.ts', 'e2e/journeys/authorization.spec.ts',
    'e2e/journeys/board-articles.spec.ts', 'e2e/journeys/board-masters.spec.ts', 'e2e/journeys/security-administration.spec.ts']);
  assert.deepEqual(representativeSelection(specs).slice(0, 2), ['--project=api-contract', '--project=full-suite']);
  const ledger = JSON.parse(readFileSync(join(ROOT, 'config/governance/vendor-test-ledger.json'), 'utf8')).representativeE2e;
  assert.deepEqual([...new Set(ledger.specs.map(row => row.category))].sort(), ['감사 원장', '게시판', '결재', '권한', '로그인'].sort(), '설계서 §7 의 다섯 범주');
  // 생성물은 고른 구성의 시작 구성만 남기고 삭제 연쇄로 spec 이 줄어든다. 원본에서만 대조할 수 있다.
  if (!existsSync(join(ROOT, 'reusable-base-lock.json'))) {
    for (const spec of specs) assert.ok(existsSync(join(ROOT, 'frontend', spec)), spec);
    const presets = JSON.parse(readFileSync(join(ROOT, 'config/modules/presets.json'), 'utf8')).presets;
    assert.deepEqual([...ledger.requiredDomains].sort(), [...presets.find(preset => preset.id === ledger.preset).domains].sort(), '원장의 기능은 시작 구성과 같아야 한다');
  }
  const root = runnerProject(null);
  try {
    const corrupt = extra => writeFileSync(join(root, 'config/governance/vendor-test-ledger.json'), JSON.stringify({ representativeE2e: { layout: 'multi-module', requiredDomains: ['board'], specs: [], ...extra } }));
    for (const specsValue of [[], [{ spec: 'e2e/journeys/approvals.spec.ts' }, { spec: 'e2e/journeys/approvals.spec.ts' }], [{ spec: '../outside.spec.ts' }], [{}]]) {
      corrupt({ specs: specsValue });
      assert.throws(() => readRepresentativeBundle(root), /대표 묶음이 올바르지 않다/);
    }
    corrupt({ specs: [{ spec: 'e2e/journeys/approvals.spec.ts' }], requiredDomains: [] });
    assert.throws(() => readRepresentativeBundle(root), /대표 묶음이 올바르지 않다/);
  } finally { rmSync(root, { recursive: true, force: true }); }
});

function playwrightReports(cwd, files) {
  const suite = file => ({ specs: [{ title: file, id: file, file, tests: [{ status: 'expected', expectedStatus: 'passed', projectName: file.endsWith('.setup.ts') ? 'setup' : file.startsWith('contracts/') ? 'api-contract' : 'full-suite', results: [] }] }] });
  const shape = { config: { rootDir: join(cwd, 'e2e'), projects: ['setup', 'api-contract', 'full-suite'].map(name => ({ name })) }, errors: [], suites: ['auth.setup.ts', ...files].map(suite) };
  return { inventory: shape, report: { ...shape, stats: { expected: files.length + 1, skipped: 0, unexpected: 0, flaky: 0 } } };
}

test('a representative spec that disappears or a foreign spec turns the run red, unlike a plan derived from discovery', () => {
  const cwd = mkdtempSync(join(tmpdir(), 'vendor-result-'));
  const ledgerSpecs = ['e2e/contracts/authentication.spec.ts', 'e2e/journeys/approvals.spec.ts'];
  try {
    const whole = playwrightReports(cwd, ['contracts/authentication.spec.ts', 'journeys/approvals.spec.ts']);
    assert.deepEqual(validateLocalRun(whole.report, whole.inventory, { representativeSpecs: ledgerSpecs, cwd }).errors, []);
    const narrowed = playwrightReports(cwd, ['contracts/authentication.spec.ts']);
    const missing = validateLocalRun(narrowed.report, narrowed.inventory, { representativeSpecs: ledgerSpecs, cwd }).errors;
    assert.ok(missing.includes('missing full inventory spec: e2e/journeys/approvals.spec.ts'), missing.join('; '));
    assert.ok(missing.includes('missing planned spec result: e2e/journeys/approvals.spec.ts'), `원장이 계획이다: ${missing.join('; ')}`);
    assert.deepEqual(validateLocalRun(narrowed.report, narrowed.inventory, { cwd }).errors, [], '일반 실행은 발견 결과가 계획이라 같은 입력이 통과한다');
    const foreign = playwrightReports(cwd, ['contracts/authentication.spec.ts', 'journeys/approvals.spec.ts', 'journeys/mail.spec.ts']);
    const unplanned = validateLocalRun(foreign.report, foreign.inventory, { representativeSpecs: ledgerSpecs, cwd }).errors;
    assert.ok(unplanned.includes('unplanned full inventory spec: e2e/journeys/mail.spec.ts'), unplanned.join('; '));
  } finally { rmSync(cwd, { recursive: true, force: true }); }
});

const vendorManifest = () => ({ runId: 'a'.repeat(24), databaseId: 'c'.repeat(64), createdAt: Date.now() - 1000 });
const vendorExpected = { engineId: 'oracle', image: 'gvenzl/oracle-free:23-slim-faststart', port: 1521, environment: ['APP_USER=vendorcheck', 'ORACLE_PASSWORD=this-run'] };
const vendorContainer = manifest => ({
  Id: manifest.databaseId, Created: new Date(manifest.createdAt).toISOString(), State: { Running: true },
  Config: { Image: vendorExpected.image, Env: ['PATH=/bin', ...vendorExpected.environment], Labels: { 'egov.task': 'isolated-e2e', 'egov.e2e.run': manifest.runId, 'egov.composer.vendor': 'oracle' } },
  HostConfig: { Binds: null },
  NetworkSettings: { Ports: { '1521/tcp': [{ HostIp: '127.0.0.1', HostPort: '49153' }] } },
  Mounts: [{ Type: 'volume', Name: 'd'.repeat(64) }],
});

test('the vendor ownership proof refuses anything this run did not create', () => {
  const manifest = vendorManifest();
  assert.equal(assertOwnedVendorDatabase(vendorContainer(manifest), manifest, vendorExpected), '49153');
  const changes = {
    '다른 컨테이너 ID': value => { value.Id = 'e'.repeat(64); },
    '다른 실행의 표식': value => { value.Config.Labels['egov.e2e.run'] = 'f'.repeat(24); },
    '다른 작업의 표식': value => { value.Config.Labels['egov.task'] = 'other'; },
    '다른 엔진의 표식': value => { value.Config.Labels['egov.composer.vendor'] = 'oracle19'; },
    '실행 전에 만든 컨테이너': value => { value.Created = new Date(manifest.createdAt - 60000).toISOString(); },
    '이름 있는 볼륨': value => { value.Mounts = [{ Type: 'volume', Name: 'shared-oracle-data' }]; },
    '바인드 마운트': value => { value.Mounts = [{ Type: 'bind', Source: '/data' }]; },
    '바인드 설정': value => { value.HostConfig.Binds = ['/data:/opt/oracle/oradata']; },
    '외부 바인딩': value => { value.NetworkSettings.Ports['1521/tcp'][0].HostIp = '0.0.0.0'; },
    '포트 없음': value => { value.NetworkSettings.Ports = {}; },
    '정지 상태': value => { value.State.Running = false; },
    '다른 이미지': value => { value.Config.Image = 'gvenzl/oracle-free:latest'; },
    '이 실행이 만들지 않은 비밀번호': value => { value.Config.Env = ['APP_USER=vendorcheck', 'ORACLE_PASSWORD=someone-else']; },
  };
  for (const [label, change] of Object.entries(changes)) {
    const actual = vendorContainer(manifest);
    change(actual);
    assert.throws(() => assertOwnedVendorDatabase(actual, manifest, vendorExpected), /isolation verification failed/, label);
  }
  assert.throws(() => assertOwnedVendorDatabase(vendorContainer(manifest), manifest, { ...vendorExpected, environment: [] }), /isolation verification failed/, '기대 환경이 비면 통과시키지 않는다');
});

test('cleanup removes a dead container of this run but never one it cannot attribute, and does not hide the earlier failure', () => {
  const manifest = vendorManifest();
  const stopped = vendorContainer(manifest);
  stopped.State.Running = false;
  assert.doesNotThrow(() => assertRemovableVendorDatabase(stopped, manifest, 'oracle'), '정리는 기동 상태를 보지 않는다');
  for (const change of [value => { value.Id = 'e'.repeat(64); }, value => { value.Config.Labels['egov.e2e.run'] = 'f'.repeat(24); }, value => { delete value.Config.Labels['egov.task']; }, value => { value.Config.Labels['egov.composer.vendor'] = 'mysql'; }]) {
    const actual = vendorContainer(manifest);
    change(actual);
    assert.throws(() => assertRemovableVendorDatabase(actual, manifest, 'oracle'), /isolation verification failed/);
  }
  const attempt = ({ container, status = 0, inspectFails = false }) => {
    const removed = [];
    const reports = [];
    removeVendorDatabase({ manifest, engineId: 'oracle', report: message => reports.push(message),
      inspect: () => { if (inspectFails) throw new Error('no such container'); return container; },
      remove: id => { removed.push(id); return { status }; } });
    return { removed, reports };
  };
  assert.deepEqual(attempt({ container: stopped }), { removed: [manifest.databaseId], reports: [] }, '죽은 컨테이너와 익명 볼륨도 지운다');
  const foreign = vendorContainer(manifest);
  foreign.Config.Labels['egov.e2e.run'] = 'f'.repeat(24);
  const refused = attempt({ container: foreign });
  assert.deepEqual(refused.removed, [], '남의 컨테이너는 지우지 않는다');
  assert.match(refused.reports[0], /벤더 DB 컨테이너를 지우지 못했다/);
  assert.match(attempt({ container: stopped, status: 1 }).reports[0], /벤더 DB 컨테이너를 지우지 못했다/);
  assert.match(attempt({ inspectFails: true }).reports[0], /벤더 DB 컨테이너를 지우지 못했다/);
});

test('the runner launches the vendor container with its own labels and closed environment and gets the container id', () => {
  const calls = [];
  const containerId = 'a'.repeat(64);
  const runDocker = (args, options) => { calls.push({ args, options }); return { status: 0, stdout: `Unable to find image locally\n${containerId}\n`, stderr: '' }; };
  const handle = launchVendorContainer('oracle', { publishPort: 1521, runDocker, baseEnvironment: { PATH: 'tools' }, requireContainerId: true,
    extraLabels: ['--label', 'egov.task=isolated-e2e', '--label', 'egov.e2e.run=run'] });
  assert.equal(handle.containerId, containerId);
  assert.equal(calls.length, 1, '준비 대기는 호출자 몫이다');
  const { args, options } = calls[0];
  for (const label of ['egov.composer.vendor=oracle', 'egov.task=isolated-e2e', 'egov.e2e.run=run']) assert.ok(args.includes(label), label);
  assert.ok(args.includes('127.0.0.1::1521'), '포트는 루프백에만 연다');
  assert.ok(!args.join(' ').includes(handle.password), '비밀번호는 인자에 두지 않는다');
  assert.equal(options.env.PATH, 'tools');
  assert.equal(options.env.ORACLE_PASSWORD, handle.password);
  assert.deepEqual(Object.keys(options.env).filter(key => key.startsWith('DOCKER_')), [], '닫힌 환경 밖의 Docker 대상을 물려받지 않는다');
  assert.ok(!args.join(' ').includes('egov.project-composer'), '닫힌 환경에는 작업 토큰도 없다');
  const seen = [];
  assert.equal(VENDOR_ENGINES.oracle.ready('x', cmd => { seen.push(cmd[0]); return { stdout: 'DATABASE IS READY TO USE', stderr: '' }; }), true, '준비 판정도 받은 실행기로 부른다');
  assert.equal(VENDOR_ENGINES.oracle19.ready('x', cmd => { seen.push(cmd[0]); return { stdout: cmd[0] === 'logs' ? 'DATABASE IS READY TO USE' : 'Grant succeeded', stderr: '' }; }), true);
  for (const id of ['mysql', 'mariadb', 'mssql', 'cubrid']) assert.equal(VENDOR_ENGINES[id].ready('x', cmd => { seen.push(cmd[0]); return { status: 0 }; }), true, id);
  assert.deepEqual(seen, ['logs', 'logs', 'exec', 'exec', 'exec', 'exec', 'exec']);

  const removed = [];
  const noId = (dockerArgs) => { removed.push(dockerArgs[0]); return { status: 0, stdout: 'not an id', stderr: '' }; };
  assert.throws(() => launchVendorContainer('oracle', { runDocker: noId, requireContainerId: true }), error => error.code === 'VENDOR_ENGINE_NOT_READY' && /ID 를 받지 못했다/.test(error.message));
  assert.deepEqual(removed, ['run', 'rm'], 'ID 를 못 받으면 소유를 증명할 수 없어 지운다');
  assert.equal(launchVendorContainer('oracle', { runDocker: () => ({ status: 0, stdout: '', stderr: '' }) }).containerId, null, '다른 호출자는 ID 를 요구하지 않는다');
});

test('the runner wires the closed Docker environment, one API environment and the result plan', () => {
  const runner = readFileSync(join(ROOT, 'scripts/run-isolated-e2e.mjs'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(runner, /const runDocker = engines\.dockerIn\(clean\);/);
  assert.match(runner, /launchVendorContainer\(engineId, \{ publishPort: port, runDocker, baseEnvironment: clean, requireContainerId: true,/);
  assert.match(runner, /validateLocalRun\(report, inventory, \{ representativeSpecs: bundle\?\.specs \}\)/);
  assert.equal(runner.match(/const apiEnvironment = /g).length, 1, 'MFA 배선 계약이 벤더 분기도 보도록 API 환경은 하나다');
  const account = /E2E_TEST_USER_PASSWORD/g;
  assert.equal(runner.match(account).length, 1, '일반 계정 비밀번호는 시험 실행 환경에만 싣는다');
  assert.equal(runner.match(/\.\.\.testAccountEnvironment/g).length, 2, '발견과 실행');
  assert.doesNotMatch(runner.slice(runner.indexOf('const environment = { ...clean, NODE_ENV'), runner.indexOf('const next = require.resolve')), /testAccountEnvironment/, 'Next 빌드와 서버 환경에는 넣지 않는다');
  assert.deepEqual(closedEnvironment({ PATH: 'tools', E2E_TEST_USER_PASSWORD: 'inherited' }), { PATH: 'tools' }, '상속한 값으로 계정이 바뀌지 않는다');

  const oracleEnvironment = vendorDatabaseEnvironment(VENDOR_ENGINES.oracle, '49153', 'secret', '1');
  assert.deepEqual(oracleEnvironment, { DB_URL: 'jdbc:oracle:thin:@//127.0.0.1:49153/FREEPDB1', DB_USERNAME: 'vendorcheck', DB_PASSWORD: 'secret', ADMIN_INITIAL_PASSWORD: '1' });
  assert.match(runner, /databaseEnvironment = \{ DB_URL: `jdbc:postgresql:\/\/127\.0\.0\.1:\$\{databasePort\}\/authz_e2e`, DB_USERNAME: 'egov', DB_PASSWORD: password,\n\s+NURI_AUTHORIZATION_ISOLATED_CUTOVER: 'true', NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK: 'CONFIRMED_DISPOSABLE_AUTHZ_DATABASE' \};/, 'PostgreSQL 값은 그대로다');

  assert.deepEqual(resolveVendorEngine('oracle', undefined, VENDOR_ENGINES).id, 'oracle');
  assert.deepEqual(resolveVendorEngine('oracle', 'oracle19', VENDOR_ENGINES).id, 'oracle19');
  assert.throws(() => resolveVendorEngine('oracle', 'mysql', VENDOR_ENGINES), /oracle 프로젝트의 대표 묶음을 mysql 엔진으로 실행할 수 없다/);
  assert.throws(() => resolveVendorEngine('mysql', undefined, VENDOR_ENGINES), /mysql 프로젝트의 대표 묶음을 mysql 엔진으로 실행할 수 없다/, '통합 값이 없는 엔진은 아직 열지 않는다');
  assert.throws(() => resolveVendorEngine('mysql', 'oracle19', VENDOR_ENGINES), /mysql 프로젝트의 대표 묶음을 oracle19 엔진으로/);
  assert.throws(() => resolveVendorEngine('oracle', 'nope', VENDOR_ENGINES), /nope 엔진으로/);

  const readme = vendorReadme('oracle');
  assert.match(readme, /node scripts\/run-isolated-e2e\.mjs --representative/);
  assert.doesNotMatch(readme, /시작할 때 멈춘다/);
  const removedAssets = JSON.parse(readFileSync(join(ROOT, 'config/governance/vendor-removed-assets.json'), 'utf8'));
  const row = Object.values(removedAssets).flat().find(entry => entry?.file === 'scripts/e2e-isolation.test.mjs');
  assert.match(row.coveredBy, /assertOwnedVendorDatabase/, '제거 사유가 지금 실행기와 맞아야 한다');
  assert.match(row.reason, /공통 판정.*원본 저장소에서만/, '함께 빠지는 공통 판정의 전수 사례를 적는다');
  assert.match(row.coveredBy, /validateIsolationManifest, assertIsolatedTarget/, '벤더 프로젝트에 남는 공통 판정 시험을 적는다');
});

/** 실제 launchVendorContainer 와 엔진 값을 쓰고 docker 만 바꾼다. inspect 는 run 인자로 만들어 배선한 라벨·환경이 판정까지 닿는지 본다. */
function isolatedVendorDatabase({ pollsUntilReady = 1, runFails = false, logFails = false, logFile = null } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'vendor-isolated-'));
  const manifest = { ...vendorManifest(), databaseId: '' };
  const steps = [];
  const containerId = 'c'.repeat(64);
  let started;
  let polls = 0;
  const reports = [];
  const warnings = [];
  const fakeDocker = (args, options) => {
    if (args[0] === 'run') {
      if (runFails) return { status: 1, stdout: '', stderr: 'no space left' };
      started = { args, env: options.env };
      steps.push('run');
      return { status: 0, stdout: `${containerId}\n`, stderr: '' };
    }
    if (args[0] === 'logs' && args[1] === '--tail') {
      steps.push(`tail ${args[2]} ${args[3]}`);
      return logFails ? { status: 1, stdout: '', stderr: 'gone' } : { status: 0, stdout: `started with ${started.env.ORACLE_PASSWORD}\n`, stderr: 'ORA-00001 boom\n' };
    }
    if (args[0] === 'logs') {
      polls += 1;
      steps.push('poll');
      return { status: 0, stdout: polls >= pollsUntilReady ? 'DATABASE IS READY TO USE' : 'starting', stderr: '' };
    }
    if (args[0] === 'rm') { steps.push(args.join(' ')); return { status: 0 }; }
    throw new Error(`예상하지 못한 docker 호출: ${args.join(' ')}`);
  };
  const live = () => {
    const container = vendorContainer(manifest);
    container.Config.Labels = Object.fromEntries(started.args.flatMap((arg, index, all) => (arg === '--label' ? [all[index + 1].split('=')] : [])));
    container.Config.Image = started.args.find(arg => arg === VENDOR_ENGINES.oracle.image);
    container.Config.Env = started.args.flatMap((arg, index, all) => (arg === '--env' ? [`${all[index + 1]}=${started.env[all[index + 1]]}`] : []));
    return container;
  };
  const state = { change: value => value };
  const inspect = id => { steps.push(`inspect ${id}`); return state.change(live()); };
  const seen = [];
  let database;
  try {
    database = launchIsolatedVendorDatabase({ runtime: { module: { dockerIn: environment => { seen.push(environment); return fakeDocker; }, launchVendorContainer }, id: 'oracle', engine: VENDOR_ENGINES.oracle },
      runId: manifest.runId, clean: { PATH: 'tools' }, manifest, inspect, logFile: logFile ?? join(directory, 'database.log'),
      report: message => reports.push(message), warn: message => warnings.push(message) });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  return { database, manifest, steps, state, reports, warnings, directory, seen, logFile: join(directory, 'database.log'), inspected: `inspect ${containerId}`, containerId, password: () => started.env.ORACLE_PASSWORD };
}

test('an isolated vendor database checks cancellation and ownership on every wait', async () => {
  const fixture = isolatedVendorDatabase({ pollsUntilReady: 3 });
  try {
    assert.deepEqual(fixture.seen, [{ PATH: 'tools' }], '실행기가 판정한 데몬과 같은 닫힌 환경으로 docker 를 부른다');
    assert.equal(fixture.manifest.databaseId, fixture.containerId);
    const order = [];
    const port = await fixture.database.waitReady(() => order.push(fixture.steps.length), { wait: async () => fixture.steps.push('wait') });
    assert.equal(port, '49153');
    assert.deepEqual(fixture.steps, ['run', fixture.inspected, 'poll', fixture.inspected, 'wait', 'poll', fixture.inspected, 'wait', 'poll'], '대기마다 소유를 다시 본다');
    assert.equal(order.length, 2, '대기마다 취소를 본다');
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});

test('a vendor run stops waiting when it is cancelled, loses the container or runs out of time, and can still clean up', async () => {
  const noWait = async () => {};
  const cancelled = isolatedVendorDatabase({ pollsUntilReady: 99 });
  const dead = isolatedVendorDatabase({ pollsUntilReady: 99 });
  const late = isolatedVendorDatabase({ pollsUntilReady: 99 });
  try {
    await assert.rejects(cancelled.database.waitReady(() => { throw new Error('Isolated E2E: run was cancelled.'); }, { wait: noWait }), /run was cancelled/);
    assert.equal(cancelled.steps.filter(step => step === 'poll').length, 1, '취소하면 더 기다리지 않는다');

    let inspections = 0;
    dead.state.change = value => { inspections += 1; if (inspections > 1) value.State.Running = false; return value; };
    await assert.rejects(dead.database.waitReady(() => {}, { wait: noWait }), /isolation verification failed/, '정리 판정은 기동 상태를 보지 않으므로 증명 판정이어야 잡힌다');
    dead.database.cleanUp();
    assert.deepEqual(dead.reports, []);
    assert.deepEqual(dead.steps.slice(-3), [dead.inspected, `tail 2000 ${dead.containerId}`, `rm -f -v ${dead.containerId}`], '판정한 뒤 로그를 남기고 익명 볼륨까지 지운다');
    const saved = readFileSync(dead.logFile, 'utf8');
    assert.match(saved, /started with \[password\]/, '이미지가 출력한 비밀번호를 가린다');
    assert.match(saved, /ORA-00001 boom/, '기동 오류는 stderr 에 있다');
    assert.ok(!saved.includes(dead.password()), '비밀번호를 근거 폴더에 남기지 않는다');

    let clock = 0;
    await assert.rejects(late.database.waitReady(() => {}, { wait: noWait, now: () => { clock += 200_000; return clock; } }), /oracle 가 300초 안에 준비되지 않았다/, '시간이 지나면 기다리지 않는다');
  } finally { for (const fixture of [cancelled, dead, late]) rmSync(fixture.directory, { recursive: true, force: true }); }
});

test('vendor cleanup never reads the logs of a container it cannot attribute, and a lost log does not keep the container', () => {
  const foreign = isolatedVendorDatabase();
  const logless = isolatedVendorDatabase({ logFails: true });
  const unwritable = isolatedVendorDatabase({ logFile: join(tmpdir(), 'vendor-isolated-no-such-folder', 'database.log') });
  try {
    foreign.state.change = value => { value.Config.Labels['egov.e2e.run'] = 'f'.repeat(24); return value; };
    foreign.database.cleanUp();
    assert.deepEqual(foreign.steps, ['run', foreign.inspected], '남의 컨테이너는 로그도 읽지 않고 지우지도 않는다');
    assert.match(foreign.reports[0], /벤더 DB 컨테이너를 지우지 못했다/);
    assert.equal(existsSync(foreign.logFile), false);

    for (const fixture of [logless, unwritable]) {
      fixture.database.cleanUp();
      assert.equal(fixture.steps.at(-1), `rm -f -v ${fixture.containerId}`, '로그를 못 남겨도 지운다');
      assert.deepEqual(fixture.warnings, ['Isolated E2E: 벤더 DB 로그를 남기지 못했다.']);
      assert.deepEqual(fixture.reports, [], '로그를 못 남긴 것은 정리 실패가 아니다');
    }
    assert.throws(() => isolatedVendorDatabase({ runFails: true }), /^Error: Isolated E2E: oracle 컨테이너를 띄우지 못했다: no space left/, '기동 실패 문구를 사용자에게 보인다');
  } finally { for (const fixture of [foreign, logless, unwritable]) rmSync(fixture.directory, { recursive: true, force: true }); }
});

test('main keeps the vendor checks wired where a fake docker cannot see them', () => {
  const runner = readFileSync(join(ROOT, 'scripts/run-isolated-e2e.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const main = runner.slice(runner.indexOf('export async function main'));
  assert.match(main, /const vendor = assertIsolatedRunnerSupportsProject\(root, \{ representative: representative\.enabled \}\);/, '구성 판정을 main 에서 건너뛰지 않는다');
  assert.match(main, /verifyOwner: \(\) => \{ assertActive\(\); verifyRuntime\(\); \}/, '픽스처 쓰기 전마다 취소와 소유를 본다');
  const positions = ['launchIsolatedVendorDatabase({', 'cleanUpVendorDatabase = database.cleanUp;', 'verifyRuntime = database.verify;', 'await database.waitReady(assertActive);'].map(text => main.indexOf(text));
  assert.ok(positions.every(position => position >= 0), `벤더 DB 배선이 없다: ${positions}`);
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right), '대기가 실패해도 지우도록 정리를 먼저 받는다');
  assert.match(main.slice(main.lastIndexOf('} finally {')), /if \(cleanUpVendorDatabase\) cleanUpVendorDatabase\(\);/, '어떻게 끝나든 벤더 DB 를 지운다');
});

test('the shared isolation checks the vendor runner relies on stay covered in a vendor project', async () => {
  const manifest = { version: 1, runId: 'a'.repeat(24), token: 'b'.repeat(64), databaseId: 'c'.repeat(64), createdAt: Date.now() - 1000,
    apiUrl: 'http://127.0.0.1:18080/api/v1', webUrl: 'http://127.0.0.1:13001', controlUrl: 'http://127.0.0.1:14001/verify' };
  const environment = value => ({ NEXT_PUBLIC_API_URL: value.apiUrl, NEXT_PUBLIC_WEB_URL: value.webUrl });
  assert.equal(validateIsolationManifest(manifest, environment(manifest)), manifest);
  const invalid = {
    '원격 API': { ...manifest, apiUrl: 'https://shared.example/api/v1' },
    '원격 통제 서버': { ...manifest, controlUrl: 'https://remote.invalid/verify' },
    '만료': { ...manifest, createdAt: Date.now() - 7 * 3600000 },
    '다른 DB 형식': { ...manifest, databaseId: 'not-a-container' },
  };
  for (const [label, value] of Object.entries(invalid)) assert.throws(() => validateIsolationManifest(value, environment(value)), /isolation verification failed/, label);
  assert.throws(() => validateIsolationManifest(manifest, {}), /isolation verification failed/, '앱이 보는 대상과 달라도 멈춘다');

  await assert.rejects(assertIsolatedTarget({}), /isolation verification failed/, '매니페스트 없이는 시험 데이터를 건드리지 않는다');
  const directory = mkdtempSync(join(tmpdir(), 'vendor-live-owner-'));
  let attestation = { ready: true, runId: manifest.runId, databaseId: manifest.databaseId };
  const server = createServer((request, response) => {
    response.writeHead(request.headers.authorization === `Bearer ${manifest.token}` ? 200 : 403, { 'Content-Type': 'application/json' });
    response.end(JSON.stringify(attestation));
  });
  await new Promise(done => server.listen(0, '127.0.0.1', done));
  try {
    const live = { ...manifest, controlUrl: `http://127.0.0.1:${server.address().port}/verify` };
    const file = join(directory, 'runtime.json');
    writeFileSync(file, JSON.stringify(live));
    const target = { ...environment(live), E2E_ISOLATION_MANIFEST: file };
    assert.equal((await assertIsolatedTarget(target)).runId, manifest.runId);
    attestation = { ...attestation, ready: false };
    await assert.rejects(assertIsolatedTarget(target), /isolation verification failed/, '소유자가 준비를 거두면 멈춘다');
    attestation = { ...attestation, ready: true, databaseId: 'd'.repeat(64) };
    await assert.rejects(assertIsolatedTarget(target), /isolation verification failed/, '다른 DB 를 증명하면 멈춘다');
  } finally {
    await new Promise(done => server.close(done));
    rmSync(directory, { recursive: true, force: true });
  }

  const mfa = createIsolatedMfaEnvironment();
  assert.equal(mfa.MFA_REQUIRE_PROTECTED, 'false', '보호 계정 MFA 를 강제하지 않는다');
  assert.equal(Buffer.from(JSON.parse(mfa.MFA_KEYS_JSON)[mfa.MFA_ACTIVE_KEY_ID], 'base64').length, 32);
  assert.notEqual(mfa.MFA_KEYS_JSON, createIsolatedMfaEnvironment().MFA_KEYS_JSON, '실행마다 새 키다');

  const project = mkdtempSync(join(tmpdir(), 'vendor-dotenv-'));
  try {
    writeFileSync(join(project, '.env.example'), 'example');
    assert.doesNotThrow(() => assertNoDotEnv(project));
    writeFileSync(join(project, '.env'), 'DB_URL=remote');
    assert.throws(() => assertNoDotEnv(project), /Isolated E2E/, '.env 가 있으면 멈춘다');
  } finally { rmSync(project, { recursive: true, force: true }); }

  const routes = { rewrites: { beforeFiles: [], fallback: [], afterFiles: [
    { source: '/api/v1/:path*', destination: `${manifest.apiUrl}/:path*` },
    { source: '/actuator/:path*', destination: 'http://127.0.0.1:18080/actuator/:path*' },
    { source: '/ws/:path*', destination: 'http://127.0.0.1:18080/ws/:path*' },
  ] } };
  assert.doesNotThrow(() => assertBuildTarget(routes, manifest.apiUrl));
  routes.rewrites.afterFiles[0].destination = 'https://remote.invalid/:path*';
  assert.throws(() => assertBuildTarget(routes, manifest.apiUrl), /Isolated E2E/, '다른 대상으로 빌드한 프런트는 멈춘다');
});

const ADMIN_GROUP = () => ({ code: 'ROLE_ADMIN', complete: true, version: 'a'.repeat(64), grants: [{ type: 'NAVIGATION', code: '100' }, { type: 'OPERATION', code: 'USER_READ' }] });

function fixtureApi({ loginFailures = 0, userStatus = 201, putStatus = 200, group = ADMIN_GROUP(), reread } = {}) {
  const log = [];
  let failures = loginFailures;
  let current = group;
  const request = async (url, init) => {
    const target = url.replace('http://127.0.0.1:18080/api/v1', '');
    const body = init.body ? JSON.parse(init.body) : undefined;
    log.push({ step: `${init.method} ${target}`, body, authorization: init.headers.Authorization, cookie: init.headers.Cookie });
    const reply = (status, envelope = {}) => ({ status, json: async () => envelope });
    if (target === '/auth/login') {
      if (failures-- > 0) return reply(401, { code: 'INVALID' });
      return reply(200, { data: { accessToken: 'token' } });
    }
    if (target === '/admin/system/users') return reply(userStatus, { code: 'USER_EXISTS' });
    if (init.method === 'GET') {
      if (log.filter(entry => entry.step === 'PUT /admin/authorization/groups/ROLE_ADMIN/grants').length && reread) return reply(200, { data: reread });
      return reply(200, { data: current });
    }
    if (putStatus === 200) current = { ...current, grants: body.grants };
    return reply(putStatus, { code: 'MENU_PARENT_REQUIRED' });
  };
  return { log, request };
}

async function provision(api, verifyOwner = () => api.log.push({ step: 'owner' }), apiUrl = 'http://127.0.0.1:18080/api/v1') {
  const waits = [];
  await provisionRepresentativeAccounts({ apiUrl, admin: { id: 'webmaster', password: '1' }, user: { id: 'TEST1', password: 'E2e1!strong' }, verifyOwner, request: api.request, wait: async ms => { waits.push(ms); } });
  return waits;
}

test('the fixture proves ownership before every write and adds only the missing grants to the full list', async () => {
  const api = fixtureApi();
  await provision(api);
  assert.deepEqual(api.log.map(entry => entry.step), ['owner', 'POST /auth/login', 'owner', 'POST /admin/system/users', 'GET /admin/authorization/groups/ROLE_ADMIN',
    'owner', 'PUT /admin/authorization/groups/ROLE_ADMIN/grants', 'GET /admin/authorization/groups/ROLE_ADMIN']);
  const user = api.log.find(entry => entry.step === 'POST /admin/system/users');
  assert.deepEqual(user.body, { userId: 'TEST1', pswd: 'E2e1!strong', userNm: '일반사용자', role: 'USER' });
  assert.equal(user.authorization, 'Bearer token');
  assert.ok(api.log.every(entry => !entry.cookie), '쿠키를 싣지 않아 CSRF 대상이 아니다');
  const put = api.log.find(entry => entry.step.startsWith('PUT'));
  assert.equal(put.body.complete, true);
  assert.equal(put.body.version, 'a'.repeat(64));
  assert.deepEqual(put.body.grants, [...ADMIN_GROUP().grants, { type: 'OPERATION', code: 'NOTICE_EDIT' }, { type: 'OPERATION', code: 'FAQ_EDIT' }], '기존 목록을 잃지 않는다');

  const held = fixtureApi({ group: { ...ADMIN_GROUP(), grants: [{ type: 'OPERATION', code: 'NOTICE_EDIT' }] } });
  await provision(held);
  assert.deepEqual(held.log.find(entry => entry.step.startsWith('PUT')).body.grants, [{ type: 'OPERATION', code: 'NOTICE_EDIT' }, { type: 'OPERATION', code: 'FAQ_EDIT' }], '이미 있는 권한을 겹치지 않는다');
});

test('the fixture retries the login below the lockout threshold and stops on anything unexpected', async () => {
  const late = fixtureApi({ loginFailures: 2 });
  assert.equal((await provision(late)).length, 2, '비밀번호 설정을 기다린다');
  assert.equal(late.log.filter(entry => entry.step === 'POST /auth/login').length, 3);
  assert.equal(late.log.filter(entry => entry.step === 'owner').length, 5, '로그인 시도도 소유를 먼저 본다');

  const never = fixtureApi({ loginFailures: 100 });
  await assert.rejects(provision(never), /관리자 로그인이 4회 모두 실패했다/);
  const attempts = never.log.filter(entry => entry.step === 'POST /auth/login').length;
  const threshold = Number(readFileSync(join(ROOT, 'api-server/src/main/resources/application.yml'), 'utf8').match(/LOGIN_MAX_FAILURES:(\d+)/)[1]);
  assert.ok(attempts < threshold, `${attempts}회 실패가 잠금 임계 ${threshold}회에 닿으면 뒤따르는 인증 준비가 잠긴 계정을 만난다`);
  assert.ok(!never.log.some(entry => entry.step === 'POST /admin/system/users'));

  await assert.rejects(provision(fixtureApi({ userStatus: 409 })), /일반 계정 생성 실패\(HTTP 409, USER_EXISTS\)/);
  await assert.rejects(provision(fixtureApi({ putStatus: 400 })), /관리자 권한 변경 실패\(HTTP 400, MENU_PARENT_REQUIRED\)/);
  await assert.rejects(provision(fixtureApi({ group: { ...ADMIN_GROUP(), complete: false } })), /전체 목록이 아니다/);
  await assert.rejects(provision(fixtureApi({ group: { ...ADMIN_GROUP(), version: 'short' } })), /전체 목록이 아니다/);
  await assert.rejects(provision(fixtureApi({ reread: ADMIN_GROUP() })), /관리자 권한이 반영되지 않았다/);

  let verified = 0;
  const lost = fixtureApi();
  await assert.rejects(provision(lost, () => { verified += 1; if (verified === 2) throw new Error('E2E isolation verification failed'); }), /isolation verification failed/);
  assert.deepEqual(lost.log.map(entry => entry.step), ['POST /auth/login'], '소유 증명이 깨지면 쓰지 않는다');
  await assert.rejects(provision(fixtureApi(), () => {}, 'https://remote.example/api/v1'), /isolation verification failed/, '루프백 밖으로 보내지 않는다');
});

test('the test account password comes from the runner and defaults to the seeded value', () => {
  const source = readFileSync(join(ROOT, 'frontend/e2e/synthetic-test-credentials.mjs'), 'utf8');
  assert.match(source, /password: process\.env\.E2E_TEST_USER_PASSWORD \|\| '1'/);
  const load = environment => spawnSync(process.execPath, ['--input-type=module', '-e', `import(${JSON.stringify(new URL('../frontend/e2e/synthetic-test-credentials.mjs', import.meta.url).href)}).then(m => console.log(m.TEST_CREDENTIALS.user.password))`], { encoding: 'utf8', env: { PATH: process.env.PATH, ...environment } }).stdout.trim();
  assert.equal(load({}), '1', 'PostgreSQL 은 시드 값을 그대로 쓴다');
  assert.equal(load({ E2E_TEST_USER_PASSWORD: 'E2e1!strong' }), 'E2e1!strong');
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

test('a vendor container that was created but never started is removed too', () => {
  const calls = [];
  const runDocker = (args, options) => {
    calls.push(args[0]);
    return args[0] === 'run' ? { status: 125, stderr: '포트 충돌' } : { status: 0, stderr: '' };
  };
  assert.throws(() => startVendorEngine('oracle', { publishPort: 1521, runDocker }), error => error.code === 'VENDOR_ENGINE_NOT_READY' && /포트 충돌/.test(error.message));
  assert.deepEqual(calls, ['run', 'rm'], '시작 실패에도 지운다');
  assert.throws(() => startVendorEngine('oracle', { runDocker: args => (args[0] === 'run' ? { status: 125, stderr: '포트 충돌' } : { status: 1, stderr: '' }) }),
    /포트 충돌.*시험 DB 컨테이너가 남았다/, '지우지 못하면 본래 실패에 잔존을 덧붙인다');
});

test('a missing docker executable reports only that, because no container can exist', () => {
  const unable = code => ({ status: null, stdout: null, stderr: null, error: Object.assign(new Error(`spawnSync docker ${code}`), { code }) });
  const calls = [];
  assert.throws(() => startVendorEngine('oracle', { runDocker: args => { calls.push(args[0]); return unable('ENOENT'); } }),
    error => error.code === 'VENDOR_ENGINE_NOT_READY' && /spawnSync docker ENOENT/.test(error.message) && !/남았다/.test(error.message));
  assert.deepEqual(calls, ['run'], '지울 대상이 없다');
  // 다른 실행 오류는 컨테이너를 만든 뒤일 수 있어 잔존을 그대로 알린다.
  assert.throws(() => startVendorEngine('oracle', { runDocker: () => unable('ENOBUFS') }), /spawnSync docker ENOBUFS.*시험 DB 컨테이너가 남았다/);
  assert.throws(() => startVendorEngine('oracle', { runDocker: args => (args[0] === 'run' ? unable('ENOBUFS') : unable('ENOENT')) }), /시험 DB 컨테이너가 남았다/, '도중에 실행 파일을 잃어도 잔존이다');
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
  const dockerfile = readFileSync(join(ROOT, 'api-server/Dockerfile'), 'utf8');
  assert.match(dockerfile, /COPY migration-tool\/build\.gradle/, '원본은 이관 모듈을 복사한다');
  assert.doesNotMatch(projectVendorDockerfile(dockerfile), /migration-tool/, '지운 모듈을 복사하면 이미지 빌드가 멈춘다');
  assert.throws(() => projectVendorDockerfile('FROM x\n'), /Dockerfile 이관 모듈/);
  const settings = readFileSync(join(ROOT, 'settings.gradle'), 'utf8');
  assert.doesNotMatch(projectVendorSettings(settings), /migration-tool/);
  assert.match(deploy, /DB_PASSWORD DB_ADMIN_PASSWORD MAIL_HOST/);
  assert.match(deploy, /^ {4}jdbc:oracle:thin:@\/\/db:1521\/FREEPDB1\) ;;$/m);

  const environment = projectVendorEnvironment('DB_URL=jdbc:postgresql://localhost:5432/egovdb?sslmode=disable\nDB_PASSWORD=egov123\n', 'oracle');
  assert.match(environment, new RegExp(`^DB_URL=${VENDOR_SOURCE.oracle.url}$`, 'm'));
  assert.match(environment, /^DB_ADMIN_PASSWORD=/m);
});

/*
 * 종료 코드 표로 부모에게 가는 코드는 화면 문장이 곧이곧대로 말할 수 있는 실패여야 한다. 뜻이 넓은 자리는 다른 코드로 나누어 VERIFY_FAILED 로 남긴다.
 */
test('failures wider than the screen sentence do not carry a table code', () => {
  const code = expected => error => error.code === expected && vendorExitCode(error) === 1;
  const handle = { id: 'oracle', name: 'c', engine: VENDOR_ENGINES.oracle };
  const refused = () => ({ sections: new Map(), errors: [{ index: 0, error: 'ORA-00942' }] });
  assert.throws(() => stopVendorEngineReporting({ name: 'c' }, null, () => ({ status: 1 })), code('VENDOR_CONTAINER_LEFT'), '시험을 통과한 뒤의 정리 실패');
  assert.throws(() => runAsAdministrator(handle, ['GRANT x'], () => ({ status: 1, stdout: '', stderr: 'ORA-01031' })), code('VENDOR_ADMIN_FAILED'), '관리자 문장 실패');
  assert.throws(() => readCatalog(handle, 'oracle', refused), code('VENDOR_QUERY_FAILED'), '메타 조회 실패');
  assert.throws(() => readNextValues(handle, 'oracle', refused), code('VENDOR_QUERY_FAILED'), '다음 값 조회 실패');
  const model = { tables: [{ name: 'tb_a' }] };
  assert.throws(() => rowCounts(handle, model, 'oracle', refused), error => code('VENDOR_QUERY_FAILED')(error) && /oracle 행 수 조회 실패 1건: ORA-00942/.test(error.message), '행 수 조회 실패');
  assert.throws(() => rowCounts(handle, model, 'oracle', () => ({ sections: new Map([[0, ['no rows']]]), errors: [] })),
    error => code('VENDOR_QUERY_FAILED')(error) && /oracle 행 수를 읽지 못했다: tb_a/.test(error.message), '행 수를 읽지 못함');
  assert.deepEqual(rowCounts(handle, model, 'oracle', () => ({ sections: new Map([[0, ['3']]]), errors: [] })), { tb_a: 3 }, '읽은 수는 그대로 돌려준다');
  // Flyway Gradle 작업에는 네트워크·메모리·컴파일 실패가 섞이고, 대조 코드는 기준선 대조에서만 난다.
  assert.doesNotMatch(readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8'), /'VENDOR_PARITY_FAILED'/);
});

test('only a real difference ends the differential as a parity failure', () => {
  const report = extra => ({ differences: [], unbalanced: [], intentFailures: [], ...extra });
  assert.equal(differentialExitCode(report()), 0);
  assert.equal(differentialExitCode(report({ differences: [{}] })), VENDOR_EXIT_CODES.VENDOR_PARITY_FAILED);
  assert.equal(differentialExitCode(report({ intentFailures: ['x'] })), VENDOR_EXIT_CODES.VENDOR_PARITY_FAILED);
  assert.equal(differentialExitCode(report({ unbalanced: ['ck_a'] })), 1, '표본 부족은 시험 표본의 문제다');
  assert.equal(differentialExitCode(report({ unbalanced: ['ck_a'], differences: [{}] })), VENDOR_EXIT_CODES.VENDOR_PARITY_FAILED, '진짜 불일치가 앞선다');
});

/** 명령을 임시 폴더로 옮겨 실행한다. 명령의 ROOT 가 임시 폴더가 되어 저장소의 시험 결과 폴더를 지우지 않는다. */
function copyWithImports(directory, file, seen = new Set()) {
  if (seen.has(file)) return;
  seen.add(file);
  const source = readFileSync(join(ROOT, 'scripts', file), 'utf8');
  writeFileSync(join(directory, 'scripts', file), source);
  for (const [, next] of source.matchAll(/from '\.\/([^']+\.mjs)'/g)) copyWithImports(directory, next, seen);
}

test('a vendor command tells its parent the code through its real exit code when Docker cannot run', t => {
  const directory = mkdtempSync(join(tmpdir(), 'vendor-exit-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  mkdirSync(join(directory, 'scripts'));
  const [integration, differential] = ['project-composer-vendor-integration.mjs', 'project-composer-vendor-differential.mjs'];
  copyWithImports(directory, integration);
  copyWithImports(directory, differential);
  writeFileSync(join(directory, 'input.json'), '{}');
  const env = { PATH: join(directory, 'no-tools'), ...(process.env.SystemRoot ? { SystemRoot: process.env.SystemRoot } : {}) };
  const run = script => spawnSync(process.execPath, [`scripts/${script}`, '--input', 'input.json', '--vendor', 'oracle'], { cwd: directory, env, encoding: 'utf8' });
  const engine = run(integration);
  assert.equal(engine.status, VENDOR_EXIT_CODES.VENDOR_ENGINE_NOT_READY, engine.stderr);
  assert.match(engine.stderr, /^\[vendor-integration\] VENDOR_ENGINE_NOT_READY: /m);
  assert.doesNotMatch(engine.stderr, /남았다/, 'Docker 가 없으면 남은 컨테이너도 없다');
  // 기준 PostgreSQL 을 띄우지 못한 것은 대상 DB 의 문제가 아니다.
  const baseline = run(differential);
  assert.equal(baseline.status, 1, baseline.stderr);
  assert.match(baseline.stderr, /^\[vendor-differential\] FAILED: 기준 PostgreSQL 을 띄우지 못했다/m);
  // 기준 DB 에서 문장을 돌리지 못한 것도 번역 불가가 아니다.
  writeFileSync(join(directory, 'empty.json'), JSON.stringify({ snapshot: { tables: [], columns: [], constraints: [], indexes: [], triggers: [], sequences: [] },
    extras: { functions: [], comments: [], identitySequences: [], sequenceValues: [] } }));
  const applied = spawnSync(process.execPath, [`scripts/${differential}`, '--input', 'empty.json', '--vendor', 'oracle', '--container', 'c', '--user', 'u', '--database', 'd'], { cwd: directory, env, encoding: 'utf8' });
  assert.equal(applied.status, 1, applied.stderr);
  assert.match(applied.stderr, /^\[vendor-differential\] VENDOR_BASELINE_FAILED: /m);
});
