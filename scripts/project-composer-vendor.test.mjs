import assert from 'node:assert/strict';
import { spawn, spawnSync } from 'node:child_process';
import { EventEmitter } from 'node:events';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildVendorModel, parseExpression, tablesInDependencyOrder, VendorTranslationGap } from './project-composer-vendor-model.mjs';
import { assertCatalogParity, assertCoverage, assertUniqueColumns, createEmission, emitRows, exactNumber, nextValues, renderExpression, violationExpression } from './project-composer-vendor-sql.mjs';
import { degradationKind, fixedDegradations, loadVendorLedger, MODEL_DEGRADATION_KINDS, selectableVendors, translateForAllVendors, unshownDegradations, VENDOR_ADAPTERS, VENDOR_IDS, VENDOR_LEDGER_PATH, vendorChoices, vendorDegradationNotes, vendorNoticeProblems } from './project-composer-vendors.mjs';
import { clobLiteral, oracleAdapter } from './project-composer-vendor-oracle.mjs';
import { indexPrefixes, keyColumnBytes, mariadbAdapter, mysqlAdapter } from './project-composer-vendor-mysql.mjs';
import { mssqlAdapter } from './project-composer-vendor-mssql.mjs';
import { batchSeedInserts, CUBRID_RESERVED, CUBRID_SEED_BYTES_PER_INSERT, CUBRID_SEED_ROWS_PER_INSERT, cubridAdapter } from './project-composer-vendor-cubrid.mjs';
import { differentialExitCode, intentFailures, probeRows, withDisposablePostgres } from './project-composer-vendor-differential.mjs';
import { rowCounts } from './project-composer-vendor-verify.mjs';
import { VENDOR_EXIT_CODES, vendorExitCode } from './project-composer-errors.mjs';
import { VENDOR_BASELINE_VERSION, VENDOR_GRADLE_OPTIONS, addedByteColumns, appliedHibernateCheck, assertTestsRan, assertVendorLock, childEnvironment, conformanceCatalog, flywayEnvironment, integrationEnvironment, integrationTask, ledgerClasses, parseIntegrationArgs, unchangedUniques, vendorLockProblems, vendorMigrationNameProblems } from './project-composer-vendor-integration.mjs';
import { vendorInputPath, verificationSteps, verificationVendor } from './verify-reusable-artifact.mjs';
import { failedVerificationStep, verificationLogTail } from './project-composer-job-failure.mjs';
import { createJobTimeline, verificationStepMarkers } from './project-composer-timeline.mjs';
import { collectResults, launchVendorContainer, parseCount, readByteColumns, readCatalog, readNextValues, readSequenceNextValues, readUniqueColumns, readUniqueSignatures, runAsAdministrator, startVendorEngine, stopVendorEngineReporting, VENDOR_ENGINES, VENDOR_INTROSPECTION, VENDOR_SEQUENCE_NEXT_VALUES, VENDOR_UNIQUE_COLUMNS, VENDOR_UNIQUE_SIGNATURES, vendorContainerLabels } from './project-composer-vendor-engine.mjs';
import { removeJobContainers } from './project-composer-postgres.mjs';
import { VENDOR_ASSET_LEDGER, VENDOR_ASSET_RULE, pruneVendorPostgresAssets, readVendorAssetLedger, staleVendorAssets } from './reusable-vendor-assets.mjs';
import { ARTIFACT_COMMAND, artifactAliases, reusableArtifactEntrypoints } from './reusable-artifact-entrypoints-contract.mjs';
import { HARNESS_SCAN_ROOTS, computeHarnessBaselineEntries } from './harness-baseline-manifest.mjs';
import { assertBuildTarget, assertIsolatedRunnerSupportsProject, assertNoDotEnv, awaitChildExit, closedEnvironment, createIsolatedMfaEnvironment, launchIsolatedVendorDatabase, onTermination, parseRepresentativeArguments, provisionRepresentativeAccounts, readRepresentativeBundle, removeVendorDatabase, representativeSelection, resolveVendorEngine, runCleanupSteps, validateLocalRun, vendorDatabaseEnvironment } from './run-isolated-e2e.mjs';
import { assertIsolatedTarget, assertOwnedVendorDatabase, assertRemovableVendorDatabase, validateIsolationManifest } from './e2e-isolation.mjs';
import { composerProfile } from './project-composer-source.mjs';
import { asPreviewVendors, certifyVendor } from './project-composer-vendor-evidence.test-helpers.mjs';
import { loadComposerModules } from './composer-modules.mjs';
import { projectVendorBuild, projectVendorCompose, projectVendorComposeProd, projectVendorDeploy, projectVendorDockerfile, projectVendorEnvironment, projectVendorSettings, projectVendorProfile, projectVendorSources, renderFlywayMigration, VENDOR_SOURCE,
  VENDOR_README_PRECEDENCE, VENDOR_SCHEMA_ALIAS, vendorApplicationDocument, vendorMigrationLocation, vendorReadme } from './project-composer-vendor-project.mjs';
import { reusableBaseLayoutLines } from './generate-reusable-base-source.mjs';
import { cubridHealthcheckCommand } from './project-composer-vendor-source.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { assertVendorRequestable, resolveGeneratorComposition, resolveProjectRecipe } from './project-composer-recipe.mjs';
import { artifactTextSha256, vendorBaselinePaths, vendorProjectionErrors } from './reusable-governance-integrity.mjs';
import { DATABASE_VENDORS } from './project-composer-db.mjs';
import { backendEnvironment, isLocalDatabaseUrl } from './dev.mjs';
import { createComposerEngine } from './project-composer.mjs';
import { composerVerificationRecipe, parseComposerVerificationArgs } from './verify-project-composer.mjs';
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

test('the MySQL family lock slots and ledger permit match the dialect, keyed so a nested transaction never waits', () => {
  const dialect = readFileSync(resolve(ROOT, 'foundation/src/main/java/nuri/foundation/core/persistence/InnoDbSqlDialect.java'), 'utf8');
  const slots = Number(dialect.match(/LOCK_SLOTS = ([\d_]+);/)[1].replaceAll('_', ''));
  for (const adapter of [mysqlAdapter, mariadbAdapter]) {
    const emission = adapter.emitSchema(model());
    const sql = emission.statements.map(statement => statement.sql);
    // 행이 모자라면 잠금 조회가 0행을 받고 아무것도 잠그지 않은 채 지나간다. 재귀 CTE 는 기본 반복 상한(1,000)에서 멈춘다(2026-11-04 실측).
    const fill = sql.find(statement => statement.startsWith('INSERT INTO tb_sys_lock_slot'));
    assert.equal((fill.match(/CROSS JOIN/g) ?? []).length, 3, adapter.id);
    assert.equal(16 ** 4, slots, `${adapter.id}: 슬롯 ${slots}개`);
    assert.match(fill, /SELECT d0\.n \+ 16 \* d1\.n \+ 256 \* d2\.n \+ 4096 \* d3\.n FROM \(SELECT 0 AS n UNION ALL SELECT 1 .* UNION ALL SELECT 15\) d0/);
    assert.doesNotMatch(fill, /RECURSIVE/);
    assert.ok(sql.includes(`CREATE TABLE tb_sys_lock_slot (lock_slot_no INT NOT NULL PRIMARY KEY) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=${adapter.id === 'mariadb' ? 'utf8mb4_nopad_bin' : 'utf8mb4_0900_bin'}`), adapter.id);
    // 허가는 (키, 연결 번호) 로 찾는다. 키만이나 Oracle 식 토큰 키는 중첩 트랜잭션이 바깥의 미커밋 허가를 기다리다 1205 로 끝났다(2026-11-04 실측).
    assert.ok(sql.some(statement => statement.startsWith('CREATE TABLE tb_sys_ledger_permit (permit_key VARCHAR(50) NOT NULL, permit_conn BIGINT UNSIGNED NOT NULL DEFAULT (CONNECTION_ID()), PRIMARY KEY (permit_key, permit_conn))')), adapter.id);
    assert.ok(dialect.includes('INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?1, CONNECTION_ID())'), '앱의 허가 입력이 같은 열을 쓴다');
    assert.ok(dialect.includes('DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1 AND permit_conn = CONNECTION_ID()'), '앱의 회수가 같은 키 전체로 찾는다');
    for (const [name, columns] of [['tb_sys_ledger_permit.primary', ['permit_key', 'permit_conn']], ['tb_sys_lock_slot.primary', ['lock_slot_no']]]) assert.deepEqual(emission.uniqueColumns.get(name), columns, `${adapter.id}: ${name}`);
    for (const name of ['tb_sys_ledger_permit.permit_conn', 'tb_sys_lock_slot.lock_slot_no']) assert.ok(emission.expected.columns.includes(name), `${adapter.id}: ${name}`);
    for (const name of ['tb_sys_ledger_permit.PRIMARY', 'tb_sys_lock_slot.PRIMARY']) assert.ok(emission.expected.constraints.includes(name), `${adapter.id}: ${name}`);
  }
  // 캐시를 두면 next_not_cached_value 가 캐시 끝(1001)으로 앞서 다음 값 대조가 늘 통과한다(2026-11-04 MariaDB 실측).
  assert.ok(mariadbAdapter.emitSchema(model()).statements.some(({ sql }) => sql === 'CREATE SEQUENCE sq_alone START WITH 1 INCREMENT BY 1 NOCACHE'));
});

test('MySQL family triggers reject with the PostgreSQL SQLSTATE class and read only their own connection permit', () => {
  // 트리거 의도는 모델이 검토한 함수 본문에서 나온다. 여기서는 그 결과 모양(차등 시험의 의도 표와 같은 꼴)을 모델에 바로 둔다.
  const sample = model();
  const parent = sample.tables.find(table => table.name === 't_parent');
  const child = sample.tables.find(table => table.name === 't_child');
  child.triggers.push({ name: 'tr_t_child_ledger', kind: 'append-only', permit: 'app.audit_retention' });
  child.columns.push({ name: 'prcs_tm', type: { kind: 'integer' }, nullable: true, identity: false, default: null, comment: null },
    { name: 'prcs_req_msec', type: { kind: 'integer' }, nullable: true, identity: false, default: null, comment: null });
  child.triggers.push({ name: 'tr_t_child_sync', kind: 'sync-pair', legacy: 'prcs_tm', current: 'prcs_req_msec' });
  // 자동 증가 컬럼을 보는 CHECK 는 트리거로 옮긴다(설계서 §6, 메뉴 자기 부모 금지).
  parent.checks.push({ name: 'ck_t_parent_not_self', expression: parseExpression('up_id IS NULL OR up_id <> id', parent.columns.map(column => column.name)) });
  for (const adapter of [mysqlAdapter, mariadbAdapter]) {
    const sql = adapter.emitSchema(sample).statements.map(statement => statement.sql).join('\n');
    // 23000 은 드라이버가 무결성 위반 예외로 올려 409 중복으로 읽힌다. 원장 보호는 무결성 밖(55000), CHECK 대체와 쌍 충돌은 원본 ERRCODE 와 같은 23514 다.
    assert.doesNotMatch(sql, /SQLSTATE '23000'/, adapter.id);
    assert.ok(sql.includes("CREATE TRIGGER tr_t_child_ledger_u BEFORE UPDATE ON t_child FOR EACH ROW BEGIN SIGNAL SQLSTATE '55000' SET MESSAGE_TEXT = 'append-only t_child'; END"), adapter.id);
    // 남의 미커밋 허가를 보지 않고 기다리지도 않으려면 자기 연결 번호까지 키 전체로 찾는다(2026-11-04 실측).
    assert.ok(sql.includes("CREATE TRIGGER tr_t_child_ledger_d BEFORE DELETE ON t_child FOR EACH ROW BEGIN IF NOT EXISTS (SELECT 1 FROM tb_sys_ledger_permit WHERE permit_key = 'app.audit_retention' AND permit_conn = CONNECTION_ID())"
      + " THEN SIGNAL SQLSTATE '55000' SET MESSAGE_TEXT = 'append-only t_child'; END IF; END"), adapter.id);
    assert.match(sql, /CREATE TRIGGER ck_t_parent_not_self_i AFTER INSERT ON t_parent FOR EACH ROW BEGIN IF .* THEN SIGNAL SQLSTATE '23514' SET MESSAGE_TEXT = 'ck_t_parent_not_self'; END IF; END/, adapter.id);
    assert.match(sql, /IF NOT \(NEW\.prcs_req_msec <=> NEW\.prcs_tm\) THEN SIGNAL SQLSTATE '23514' SET MESSAGE_TEXT = 'conflicting pair'; END IF;/, adapter.id);
  }
});

test('the MySQL family counts key bytes by physical type, as measured on both engines', () => {
  const type = (kind, extra = {}) => ({ kind, ...extra });
  for (const maria of [false, true]) {
    const bytes = value => keyColumnBytes(value, maria);
    assert.equal(bytes(type('varchar', { length: 10 })), 40, 'utf8mb4 은 글자당 4바이트');
    assert.equal(bytes(type('integer')), 4);
    assert.equal(bytes(type('bigint')), 8);
    assert.equal(bytes(type('date')), 3);
    assert.deepEqual([0, 1, 2, 3, 4, 5, 6].map(precision => bytes(type('timestamp', { precision }))), [5, 6, 6, 7, 7, 8, 8], 'DATETIME(0)=5·(3)=7·(6)=8 실측');
    assert.equal(bytes(type('numeric', { precision: 10, scale: 0 })), 5);
    assert.equal(bytes(type('numeric', { precision: 19, scale: 0 })), 9);
    assert.equal(bytes(type('numeric', { precision: 20, scale: 2 })), 9);
    assert.equal(bytes(type('numeric', { precision: 38, scale: 10 })), 18);
    assert.equal(bytes(type('numeric', { precision: null, scale: null })), 18, '정밀도 없는 numeric 은 DECIMAL(38,10) 이다');
    for (const kind of ['text', 'json', 'binary']) assert.equal(bytes(type(kind)), Infinity, `${kind}: 접두 없이 키가 될 수 없다`);
  }
  assert.equal(keyColumnBytes(type('uuid'), false), 16, 'MySQL 의 UUID 는 BINARY(16)');
  assert.equal(keyColumnBytes(type('uuid'), true), 16, 'MariaDB 의 UUID 타입');
  // 일반 인덱스 접두: 넘지 않으면 자르지 않고, 넘으면 긴 문자열만 잘린 키 전체가 3,072바이트 안에 들게 자른다.
  assert.deepEqual(indexPrefixes([3068, 4]).prefixes, [null, null], 'VARCHAR(767)+INT 는 그대로');
  assert.deepEqual(indexPrefixes([3072]).prefixes, [null], 'VARCHAR(768) 단독은 그대로');
  assert.deepEqual(indexPrefixes([3076]).prefixes, [768], 'VARCHAR(769) 단독은 768자 접두');
  assert.deepEqual(indexPrefixes([4000, 80]).prefixes, [700, null], '긴 주소와 짧은 컬럼은 700자 접두');
  // 어댑터가 긴 컬럼마다 700자를 주던 복합 접두는 VARCHAR(4000) 둘에서 5,600바이트라 1071 이었다(2026-11-04 실측). 합이 상한 안에 들게 줄인다.
  assert.deepEqual(indexPrefixes([16000, 16000]).prefixes, [384, 384]);
  for (const sizes of [[16000, 16000], [16000, 80], [Infinity, 8, 8], [3076, 4]]) {
    const { prefixes } = indexPrefixes(sizes);
    assert.ok(sizes.reduce((total, size, at) => total + (prefixes[at] ? prefixes[at] * 4 : size), 0) <= 3072, String(sizes));
  }
  assert.equal(indexPrefixes([1500, 1500, 1500]).prefixes, null, '자를 긴 문자열이 없는데 넘으면 번역을 멈춘다');
  assert.equal(indexPrefixes([16000, 1536, 1536]).prefixes, null, '자르지 않는 컬럼이 상한을 다 쓰면 멈춘다');
  assert.deepEqual(indexPrefixes([16000, 1536, 1532]).prefixes, [1, null, null], '한 글자라도 남으면 그만큼 자른다');
});

test('the MySQL family decides the key limit at the measured boundaries', () => {
  /** t_key 표에 문자열 a 와 다른 타입 b 로 된 유니크·인덱스를 둔다. */
  const keyModel = (length, other, { unique = true, index = false } = {}) => buildVendorModel({ snapshot: {
    columns: [column('t_key', 'id', 'bigint', { nullable: false, position: 1 }), varchar('t_key', 'a', length, { nullable: false, position: 2 }),
      { ...column('t_key', 'b', other.type, { nullable: false, position: 3 }), numeric_precision: other.precision ?? null, numeric_scale: other.scale ?? null, datetime_precision: other.datetime ?? 6 }],
    constraints: [constraint('t_key', 'pk_t_key', 'p', 'PRIMARY KEY (id)'), ...(unique ? [constraint('t_key', 'uk_t_key_ab', 'u', 'UNIQUE (a, b)')] : [])],
    indexes: index ? [{ table_name: 't_key', name: 'ix_t_key_ab', definition: 'CREATE INDEX ix_t_key_ab ON public.t_key USING btree (a, b)' }] : [],
    triggers: [], sequences: [],
  }, extras: { functions: [], comments: [], identitySequences: [], sequenceValues: [] } });
  const statements = (adapter, sample) => adapter.emitSchema(sample).statements.map(statement => statement.sql);
  // 2026-11-04 실측 경계: VARCHAR(n)+INT 767, +BIGINT 766, +DATETIME(6) 766, +DECIMAL(10,0) 766, +BINARY(16) UUID 764. 한 자 더하면 1071 이다.
  for (const [other, fits] of [[{ type: 'integer' }, 767], [{ type: 'bigint' }, 766], [{ type: 'timestamp without time zone', datetime: 6 }, 766],
    [{ type: 'numeric', precision: 10, scale: 0 }, 766], [{ type: 'uuid' }, 764]]) {
    assert.ok(statements(mysqlAdapter, keyModel(fits, other)).includes('ALTER TABLE t_key ADD CONSTRAINT uk_t_key_ab UNIQUE (a, b)'), `mysql: VARCHAR(${fits})+${other.type} 는 그대로 받는다`);
    const over = statements(mysqlAdapter, keyModel(fits + 1, other));
    assert.ok(over.includes('ALTER TABLE t_key ADD CONSTRAINT uk_t_key_ab UNIQUE (a_hash, b)'), `mysql: VARCHAR(${fits + 1})+${other.type} 는 해시 유니크다`);
    assert.deepEqual(mysqlAdapter.emitSchema(keyModel(fits + 1, other)).uniqueColumns.get('t_key.uk_t_key_ab'), ['a_hash', 'b'], '컬럼 대조는 DB 에 든 해시 컬럼을 기대한다');
    // 일반 인덱스도 같은 경계다. 넘으면 긴 문자열만 접두로 자른다.
    assert.ok(statements(mysqlAdapter, keyModel(fits, other, { unique: false, index: true })).includes('CREATE INDEX ix_t_key_ab ON t_key (a, b)'), `index ${other.type}`);
    assert.ok(statements(mysqlAdapter, keyModel(fits + 1, other, { unique: false, index: true })).includes('CREATE INDEX ix_t_key_ab ON t_key (a(700), b)'), `index ${other.type}`);
  }
  // MariaDB 의 UUID 는 16바이트라 경계가 764 다. 유니크는 넘어도 엔진 해시로 받으므로 그대로 둔다.
  const uuid = { type: 'uuid' };
  assert.ok(statements(mariadbAdapter, keyModel(764, uuid, { unique: false, index: true })).includes('CREATE INDEX ix_t_key_ab ON t_key (a, b)'));
  assert.ok(statements(mariadbAdapter, keyModel(765, uuid, { unique: false, index: true })).includes('CREATE INDEX ix_t_key_ab ON t_key (a(700), b)'));
  assert.ok(statements(mariadbAdapter, keyModel(4000, uuid)).includes('ALTER TABLE t_key ADD CONSTRAINT uk_t_key_ab UNIQUE (a, b)'));
  assert.deepEqual(mariadbAdapter.emitSchema(keyModel(4000, uuid)).degradations.map(row => row.name), ['null-order'], 'MariaDB 는 접두 저하가 없다(엔진 동작 안내만 남는다)');
  // MySQL 의 UUID 는 Hibernate 의 MySQL 기본 매핑인 BINARY(16) 이고 시드 값은 같은 바이트 순서로 바꾼다. CHAR(36) 이면 스키마 검증이 멈췄다(2026-11-04).
  assert.match(statements(mysqlAdapter, keyModel(10, uuid)).join('\n'), /\bb BINARY\(16\)/);
  assert.match(statements(mariadbAdapter, keyModel(10, uuid)).join('\n'), /\bb UUID\b/);
  const uuidValue = '6f1c2d3e-4a5b-4c6d-8e7f-001122334455';
  assert.equal(mysqlAdapter.literal({ type: { kind: 'uuid' } }, uuidValue), `UUID_TO_BIN('${uuidValue}')`);
  assert.equal(mariadbAdapter.literal({ type: { kind: 'uuid' } }, uuidValue), `'${uuidValue}'`);
  // 단일 컬럼은 768자까지 그대로, 넘으면 MySQL 만 접두 유니크(저하)다.
  const single = length => buildVendorModel({ snapshot: { columns: [column('t_one', 'id', 'bigint', { nullable: false, position: 1 }), varchar('t_one', 'a', length, { position: 2 })],
    constraints: [constraint('t_one', 'pk_t_one', 'p', 'PRIMARY KEY (id)'), constraint('t_one', 'uk_t_one_a', 'u', 'UNIQUE (a)')], indexes: [], triggers: [], sequences: [] },
  extras: { functions: [], comments: [], identitySequences: [], sequenceValues: [] } });
  assert.ok(statements(mysqlAdapter, single(768)).includes('ALTER TABLE t_one ADD CONSTRAINT uk_t_one_a UNIQUE (a)'));
  assert.deepEqual(mysqlAdapter.emitSchema(single(768)).degradations.map(row => row.name), ['null-order']);
  assert.ok(statements(mysqlAdapter, single(769)).includes('ALTER TABLE t_one ADD CONSTRAINT uk_t_one_a UNIQUE (a(768))'));
  assert.deepEqual(mysqlAdapter.emitSchema(single(769)).degradations.map(row => row.name), ['uk_t_one_a:prefix', 'null-order']);
  assert.deepEqual(mysqlAdapter.emitSchema(single(769)).uniqueColumns.get('t_one.uk_t_one_a'), ['a'], '접두 유니크도 컬럼 조회에는 컬럼 이름만 나온다');
  // 해시로 바꿔도 넘는 복합 유니크는 적용 때 1071 로 멈추기 전에 번역을 멈춘다.
  const wide = buildVendorModel({ snapshot: { columns: [column('t_two', 'id', 'bigint', { nullable: false, position: 1 }), varchar('t_two', 'a', 1000, { position: 2 }), varchar('t_two', 'b', 1000, { position: 3 })],
    constraints: [constraint('t_two', 'pk_t_two', 'p', 'PRIMARY KEY (id)'), constraint('t_two', 'uk_t_two_ab', 'u', 'UNIQUE (a, b)')], indexes: [], triggers: [], sequences: [] },
  extras: { functions: [], comments: [], identitySequences: [], sequenceValues: [] } });
  assert.throws(() => mysqlAdapter.emitSchema(wide), error => isGap(error) && error.message === 'uk_t_two_ab: 가장 긴 컬럼을 해시로 바꿔도 키가 3072바이트를 넘는다');
  assert.doesNotThrow(() => mariadbAdapter.emitSchema(wide));
  // 긴 문자열 없이 넘는 일반 인덱스는 자를 컬럼이 없다. 두 엔진 모두 복합 일반 인덱스를 1071 로 거부하므로(실측) 적용 전에 멈춘다.
  const medium = buildVendorModel({ snapshot: { columns: [column('t_three', 'id', 'bigint', { nullable: false, position: 1 }), ...['a', 'b', 'c'].map((name, at) => varchar('t_three', name, 375, { position: at + 2 }))],
    constraints: [constraint('t_three', 'pk_t_three', 'p', 'PRIMARY KEY (id)')], indexes: [{ table_name: 't_three', name: 'ix_t_three_abc', definition: 'CREATE INDEX ix_t_three_abc ON public.t_three USING btree (a, b, c)' }], triggers: [], sequences: [] },
  extras: { functions: [], comments: [], identitySequences: [], sequenceValues: [] } });
  for (const adapter of [mysqlAdapter, mariadbAdapter]) assert.throws(() => adapter.emitSchema(medium), error => isGap(error) && error.message === 'ix_t_three_abc: 접두로 잘라도 키가 3072바이트를 넘는다', adapter.id);
});

test('SQL Server keys its ledger permit by session and decides the key limit at the measured boundaries', () => {
  const dialect = readFileSync(resolve(ROOT, 'foundation/src/main/java/nuri/foundation/core/persistence/SqlServerSqlDialect.java'), 'utf8');
  const sample = model();
  sample.tables.find(table => table.name === 't_child').triggers.push({ name: 'tr_t_child_ledger', kind: 'append-only', permit: 'app.audit_retention' });
  const emission = mssqlAdapter.emitSchema(sample);
  const sql = emission.statements.map(statement => statement.sql);
  // 키만인 허가 표는 바깥 트랜잭션의 미커밋 키를 안쪽이 기다렸다(1222, 2026-11-04 실측). 앱과 트리거가 같은 세션 번호를 쓴다.
  assert.ok(sql.includes('CREATE TABLE tb_sys_ledger_permit (permit_key NVARCHAR(50) COLLATE Korean_100_BIN2 NOT NULL, permit_conn INT NOT NULL DEFAULT @@SPID, CONSTRAINT pk_tb_sys_ledger_permit PRIMARY KEY (permit_key, permit_conn))'),
    '연결 번호를 적지 않은 허가 입력도 자기 세션의 허가다(차등 시험의 트리거 전이)');
  assert.ok(dialect.includes('INSERT INTO tb_sys_ledger_permit (permit_key, permit_conn) VALUES (?1, @@SPID)'), '앱의 허가 입력이 같은 열을 쓴다');
  assert.ok(dialect.includes('DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1 AND permit_conn = @@SPID'), '앱의 회수가 같은 키 전체로 찾는다');
  assert.ok(sql.some(statement => statement.includes("FROM tb_sys_ledger_permit WITH (READCOMMITTED) WHERE permit_key = N'app.audit_retention' AND permit_conn = @@SPID)")),
    '트리거는 자기 세션의 커밋 안 된 허가만 본다');
  assert.deepEqual(emission.uniqueColumns.get('tb_sys_ledger_permit.pk_tb_sys_ledger_permit'), ['permit_key', 'permit_conn']);
  assert.ok(!sql.some(statement => statement.includes('tb_sys_lock_slot')), '응용 잠금은 sp_getapplock 이라 슬롯 표가 없다');
  assert.deepEqual(fixedDegradations('mssql'), ['trailing-space', 'null-order', 'error-language']);

  const keyModel = (length, other, { unique = true, index = false } = {}) => buildVendorModel({ snapshot: {
    columns: [column('t_key', 'id', 'bigint', { nullable: false, position: 1 }), varchar('t_key', 'a', length, { nullable: false, position: 2 }),
      { ...column('t_key', 'b', other.type, { nullable: false, position: 3 }), numeric_precision: other.precision ?? null, numeric_scale: other.scale ?? null, datetime_precision: other.datetime ?? 6 }],
    constraints: [constraint('t_key', 'pk_t_key', 'p', 'PRIMARY KEY (id)'), ...(unique ? [constraint('t_key', 'uk_t_key_ab', 'u', 'UNIQUE (a, b)')] : [])],
    indexes: index ? [{ table_name: 't_key', name: 'ix_t_key_ab', definition: `CREATE ${index === 'unique' ? 'UNIQUE ' : ''}INDEX ix_t_key_ab ON public.t_key USING btree (a, b)` }] : [],
    triggers: [], sequences: [],
  }, extras: { functions: [], comments: [], identitySequences: [], sequenceValues: [] } });
  // 2026-11-04 실측: NVARCHAR(848)+INT·NVARCHAR(846)+DATETIME2(6) 은 1,700바이트로 들어가고 한 글자 더 길면 1,702바이트로 입력이 거부된다.
  for (const [other, fits] of [[{ type: 'integer' }, 848], [{ type: 'bigint' }, 846], [{ type: 'timestamp without time zone', datetime: 6 }, 846],
    [{ type: 'numeric', precision: 10, scale: 0 }, 845], [{ type: 'uuid' }, 842]]) {
    const names = length => mssqlAdapter.emitSchema(keyModel(length, other)).degradations.map(row => row.name);
    assert.ok(!names(fits).includes('uk_t_key_ab:length'), `NVARCHAR(${fits})+${other.type} 는 상한 안이다`);
    assert.ok(names(fits + 1).includes('uk_t_key_ab:length'), `NVARCHAR(${fits + 1})+${other.type} 는 상한을 넘는다`);
    assert.doesNotThrow(() => mssqlAdapter.emitSchema(keyModel(fits, other, { unique: false, index: 'unique' })), `유일 인덱스 ${other.type}`);
    assert.throws(() => mssqlAdapter.emitSchema(keyModel(fits + 1, other, { unique: false, index: 'unique' })), isGap, `넘는 유일 인덱스는 유일성을 지켜 옮길 수 없다(${other.type})`);
  }
  assert.ok(mssqlAdapter.emitSchema(keyModel(849, { type: 'integer' }, { unique: false, index: true })).statements.some(({ sql: text }) => text === 'CREATE INDEX ix_t_key_ab ON t_key (b) INCLUDE (a)'),
    '넘는 일반 복합 인덱스는 긴 컬럼을 포함 컬럼으로 옮긴다');
});

test('the CUBRID reserved column names are the ones Hibernate quotes', () => {
  const dialect = readFileSync(resolve(ROOT, 'foundation/src/main/java/nuri/foundation/core/persistence/NuriCubridDialect.java'), 'utf8');
  const listed = dialect.match(/RESERVED_IDENTIFIERS = Set.of(([^)]*))/)?.[1];
  assert.ok(listed, '방언의 따옴표 목록을 찾지 못했다');
  // 어댑터가 따옴표로 만든 컬럼을 Hibernate 가 따옴표 없이 내면 예약어 문법 오류로 그 표의 모든 쓰기가 실패한다(2026-11-06 원본 통합 실행, tb_user_info.role).
  assert.deepEqual([...listed.matchAll(/"([^"]+)"/g)].map(match => match[1]).sort(), [...CUBRID_RESERVED].sort());
  assert.equal(cubridAdapter.identifier('role'), '"role"');
  assert.equal(cubridAdapter.identifier('user_nm'), 'user_nm');
});

test('the CUBRID lock slots, ledger permit and CHECK trigger names match the port, and the baseline needs no block statements', () => {
  const dialect = readFileSync(resolve(ROOT, 'foundation/src/main/java/nuri/foundation/core/persistence/CubridSqlDialect.java'), 'utf8');
  const javaString = name => dialect.match(new RegExp(`\\b${name} =\\s*"([^"]*)";`))?.[1];
  const sample = model();
  sample.tables.find(table => table.name === 't_child').triggers.push({ name: 'tr_t_child_ledger', kind: 'append-only', permit: 'app.audit_retention' });
  const emission = cubridAdapter.emitSchema(sample);
  const sql = emission.statements.map(statement => statement.sql);

  // 행이 모자라면 잠금 조회가 0행을 받는다. 포트는 그때 멈추지만(lockSlot) 슬롯 수와 접는 식이 어긋나면 잠금이 늘 실패한다.
  const slots = Number(dialect.match(/LOCK_SLOTS = ([\d_]+);/)[1].replaceAll('_', ''));
  assert.ok(dialect.includes('Math.floorMod(Long.hashCode(key), LOCK_SLOTS)') && dialect.includes('Math.floorMod(31 * namespace + key, LOCK_SLOTS)'), '키를 슬롯 수로 접는다');
  assert.ok(sql.includes('CREATE TABLE tb_sys_lock_slot (lock_slot_no INT NOT NULL PRIMARY KEY)'));
  assert.equal(javaString('LOCK_SLOT_SQL'), 'SELECT lock_slot_no FROM tb_sys_lock_slot WHERE lock_slot_no = ? FOR UPDATE', '앱의 잠금 조회가 같은 표·열을 쓴다');
  const fill = sql.find(statement => statement.startsWith('INSERT INTO tb_sys_lock_slot'));
  // 재귀 CTE 는 2,000회에서 멈춰(2026-11-06 실측) 0..255 두 벌을 곱한다. 0 부터 slots-1 까지 빈틈 없이 한 번씩이다.
  const [, last, width] = fill.match(/^INSERT INTO tb_sys_lock_slot \(lock_slot_no\) WITH RECURSIVE d \(n\) AS \(SELECT 0 FROM db_root UNION ALL SELECT n \+ 1 FROM d WHERE n < (\d+)\) SELECT a\.n \* (\d+) \+ b\.n FROM d a, d b$/).map(Number);
  assert.equal(last + 1, width, '한 자리의 값 수와 곱하는 수가 같아야 겹치지도 비지도 않는다');
  assert.equal(width ** 2, slots, `슬롯 ${slots}개`);
  assert.ok(last < 2000, '재귀 상한 안이다');

  // 허가는 행마다 고유 토큰을 키로 둔다. 앱은 키 값만 넣고 지우며, 트리거는 자기 트랜잭션에 보이는 허가만 센다(2026-11-06 실측).
  assert.ok(sql.includes('CREATE TABLE tb_sys_ledger_permit (permit_token BIGINT AUTO_INCREMENT PRIMARY KEY, permit_key VARCHAR(50) NOT NULL)'));
  assert.equal(javaString('INSERT_PERMIT'), 'INSERT INTO tb_sys_ledger_permit (permit_key) VALUES (?1)');
  assert.equal(javaString('DELETE_PERMIT'), 'DELETE FROM tb_sys_ledger_permit WHERE permit_key = ?1');
  assert.ok(dialect.includes('"SELECT count(*) FROM tb_sys_ledger_permit"'), '기동 점검이 같은 표를 본다');
  assert.ok(sql.includes("CREATE TRIGGER tr_t_child_ledger_d BEFORE DELETE ON t_child IF ((SELECT COUNT(*) FROM tb_sys_ledger_permit WHERE permit_key = 'app.audit_retention') = 0) EXECUTE REJECT"));
  assert.ok(sql.includes('CREATE TRIGGER tr_t_child_ledger_u BEFORE UPDATE ON t_child EXECUTE REJECT'));
  for (const name of ['tb_sys_ledger_permit.permit_token', 'tb_sys_ledger_permit.permit_key', 'tb_sys_lock_slot.lock_slot_no']) assert.ok(emission.expected.columns.includes(name), name);
  for (const name of ['tb_sys_ledger_permit.pk_tb_sys_ledger_permit_permit_token', 'tb_sys_lock_slot.pk_tb_sys_lock_slot_lock_slot_no']) assert.ok(emission.expected.indexes.includes(name), name);

  // CHECK 는 트리거 거부(-517)로 옮긴다. 포트는 트리거 이름이 ck_ 로 시작할 때만 입력 오류(400)로 읽고, 원장 보호 트리거는 같은 번호라도 입력 오류가 아니다.
  assert.match(dialect, /-517, Pattern\.compile\("\^The operation has been rejected by trigger \\"\[\^\\"\.\]\+\\\\\.ck_"\)/);
  const checkTriggers = sql.filter(statement => / EXECUTE REJECT$/.test(statement) && /^CREATE TRIGGER \S+ BEFORE (?:INSERT|UPDATE) ON \S+ IF \(/.test(statement) && !statement.includes('tb_sys_ledger_permit'));
  assert.equal(checkTriggers.length, sample.tables.reduce((total, table) => total + table.checks.length, 0) * 2, '입력·수정 트리거 둘씩');
  for (const statement of checkTriggers) assert.match(statement, /^CREATE TRIGGER ck_/, statement);
  assert.ok(!sql.some(statement => /^CREATE TRIGGER ck_/.test(statement) && statement.includes('tb_sys_ledger_permit')));

  // 블록 문장이 없어 Flyway 파일의 문장은 모두 세미콜론으로 끝난다. 블록 문장을 내기 시작하면 끝낼 형식을 정할 때까지 멈춘다.
  assert.ok(emission.statements.every(statement => !statement.raw));
  assert.equal(renderFlywayMigration([{ sql: 'CREATE TABLE t (id INT)' }, { sql: 'CREATE TRIGGER ck_t_i BEFORE INSERT ON t IF (new.id < 0) EXECUTE REJECT' }], 'cubrid'),
    'CREATE TABLE t (id INT);\nCREATE TRIGGER ck_t_i BEFORE INSERT ON t IF (new.id < 0) EXECUTE REJECT;\n');
  assert.deepEqual(fixedDegradations('cubrid'), ['check-cost', 'json-validity', 'timestamp-precision', 'skip-locked', 'null-order', 'parent-lock-wait']);

  // 행 잠금 대기는 주소가 아니라 앱이 연결마다 건다. 상한은 앱의 잠금 조회 상한과 같고, README 가 같은 문장을 말한다.
  const lockTimeoutMillis = Number(readFileSync(join(ROOT, 'api-server/src/main/resources/application.yml'), 'utf8').match(/^\s+lock:\r?\n\s+timeout:\s*(\d+)\s*$/m)?.[1]);
  const seconds = Number(dialect.match(/LOCK_WAIT_SECONDS = (\d+);/)[1]);
  assert.equal(seconds * 1000, lockTimeoutMillis);
  assert.match(dialect, /SESSION_LOCK_WAIT_SQL = "SET TRANSACTION LOCK TIMEOUT " \+ LOCK_WAIT_SECONDS;/);
  assert.ok(vendorReadme('cubrid', loadVendorLedger(ROOT)).includes(`\`SET TRANSACTION LOCK TIMEOUT ${seconds}\``));
  assert.doesNotMatch(VENDOR_SOURCE.cubrid.url, /lock/i, '주소에 잠금 인자를 두지 않는다');
});

test('SQL Server baselines end trigger batches with GO and its project keeps app, sa and edition apart', () => {
  // CREATE TRIGGER 는 배치의 첫 문장이어야 한다. Flyway 의 SQL Server 파서는 GO 로 배치를 나눈다.
  assert.equal(renderFlywayMigration([{ sql: 'CREATE TABLE t (id INT)' }, { sql: 'CREATE TRIGGER tr ON t AFTER DELETE AS BEGIN SET NOCOUNT ON; END', raw: true }, { sql: 'INSERT INTO t VALUES (1)' }], 'mssql'),
    'CREATE TABLE t (id INT);\nGO\nCREATE TRIGGER tr ON t AFTER DELETE AS BEGIN SET NOCOUNT ON; END\nGO\nINSERT INTO t VALUES (1);\n');
  const source = VENDOR_SOURCE.mssql;
  assert.equal(source.urlParameters, 'encrypt=false;lockTimeout=5000');
  assert.equal(source.dialect, 'nuri.foundation.core.persistence.NuriSqlServerDialect', '범위 잠금 없는 엔티티 잠금을 쓴다');
  assert.equal(VENDOR_ENGINES.mssql.integration.dialect, source.dialect, '통합 시험도 생성물과 같은 방언이다');
  const compose = projectVendorCompose(readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8').replace(/\r\n/g, '\n'), 'mssql');
  assert.ok(compose.includes(`image: ${VENDOR_ENGINES.mssql.image}\n`), '개발 compose 와 검증 엔진의 이미지가 같다');
  assert.match(compose, /127\.0\.0\.1:1433:1433/);
  assert.ok(compose.includes(`"url": "${source.composeUrl}"`));
  assert.match(compose, /^ {6}TZ: Asia\/Seoul$/m, '세션 시간대가 없어 서버 시계가 한국 시간이어야 한다');
  // 서버 콜레이션을 바꾸면 첫 기동의 재색인 중 상태 검사가 접속해 교착으로 서버가 꺼진다(실측). 한국어 콜레이션은 앱 DB 에 준다.
  assert.doesNotMatch(compose, /MSSQL_COLLATION/);
  assert.match(compose, /IF DB_ID\('egovdb'\) IS NULL CREATE DATABASE egovdb COLLATE Korean_100_CI_AS;/);
  // 이미지가 앱 DB·계정을 만들지 않아 상태 검사가 만든다. 되풀이해도 연결을 끊지 않게 이미 켠 설정은 다시 켜지 않는다.
  const healthcheck = compose.match(/^ {6}test: (.*)$/m)[1];
  assert.match(healthcheck, /SQLCMDPASSWORD=\\"\$\$\{MSSQL_SA_PASSWORD\}\\"/, '운영 sa 비밀번호에서도 동작한다');
  // 비밀은 인자에 두지 않는다 — 셸이 펼친 값이 컨테이너의 프로세스 목록에 보인다(독립 검토 지적). 앱 비밀번호의 작은따옴표는 두 번 쓴다.
  assert.doesNotMatch(healthcheck, / -P /);
  assert.match(healthcheck, /NURI_APP_LOGIN=\\"\$\$\{APP_DB_USER\}\\" NURI_APP_PASSWORD=\\"\$\$\(printf '%s' \\"\$\$\{APP_DB_PASSWORD\}\\" \| sed \\"s\/'\/''\/g\\"\)\\"/);
  assert.match(healthcheck, /case \\"\$\$\{APP_DB_USER\}\\" in ''\|\*\[!A-Za-z0-9_\]\*\) /, '계정 이름은 대괄호 식별자·따옴표 문자열에 쓰여 ] 와 \' 가 없게 영문·숫자·밑줄만 받는다');
  assert.ok(!healthcheck.split('-Q')[1].includes('APP_DB_PASSWORD'), 'SQL 본문에는 sqlcmd 변수만 있다');
  assert.match(healthcheck, /IF \(SELECT is_read_committed_snapshot_on FROM sys\.databases WHERE name = 'egovdb'\) = 0 ALTER DATABASE egovdb SET READ_COMMITTED_SNAPSHOT ON WITH ROLLBACK IMMEDIATE/);
  assert.match(healthcheck, /IF \(SELECT snapshot_isolation_state FROM sys\.databases WHERE name = 'egovdb'\) = 0 ALTER DATABASE egovdb SET ALLOW_SNAPSHOT_ISOLATION ON/);
  assert.match(healthcheck, /IF SUSER_ID\('\\\\\$\$\(NURI_APP_LOGIN\)'\) IS NULL CREATE LOGIN \[\\\\\$\$\(NURI_APP_LOGIN\)\] WITH PASSWORD = N'\\\\\$\$\(NURI_APP_PASSWORD\)'/);
  const prod = projectVendorComposeProd('    environment:\n      POSTGRES_USER: ${DB_USERNAME:?필요}\n      POSTGRES_PASSWORD: ${DB_PASSWORD:?필요}\n      SPRING_FLYWAY_LOCATIONS: classpath:db/migration\n', 'mssql');
  assert.match(prod, /^ {6}APP_DB_USER: \$\{DB_USERNAME/m);
  assert.match(prod, /^ {6}APP_DB_PASSWORD: \$\{DB_PASSWORD/m);
  assert.match(prod, /^ {6}MSSQL_SA_PASSWORD: \$\{DB_ADMIN_PASSWORD:\?/m, 'sa 비밀번호는 앱 비밀번호와 나눈다');
  assert.match(prod, /^ {6}MSSQL_PID: \$\{MSSQL_PID:\?/m, 'Developer 에디션은 운영에 쓸 수 없어 에디션을 받는다');
  const deploy = projectVendorDeploy(readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8').replace(/\r\n/g, '\n'), 'mssql');
  assert.ok(deploy.includes(`    "${source.composeUrl}") ;;\n`), '세미콜론이 셸 문법이 되지 않게 감싼다');
  const environment = projectVendorEnvironment(readFileSync(join(ROOT, '.env.example'), 'utf8').replace(/\r\n/g, '\n'), 'mssql');
  assert.match(environment, /^# 운영 번들 DB 의 sa 비밀번호\./m);
  assert.match(environment, /^# MSSQL_PID=$/m);
  // SQL Server 는 DDL 도 트랜잭션 안이라 실패한 V 파일이 반쯤 남지 않는다. 자동 커밋 벤더의 복구 문장을 쓰지 않는다.
  const ledger = loadVendorLedger(ROOT);
  const readme = vendorReadme('mssql', ledger);
  assert.match(readme, /SQL Server 는 DDL 도 트랜잭션 안에서 돌아/);
  assert.doesNotMatch(readme, /자동 커밋/);
  assert.match(readme, /NVARCHAR\(n\) COLLATE Korean_100_BIN2/);
  assert.match(vendorReadme('mysql', ledger), /MySQL 은 DDL 이 자동 커밋이라/, '다른 벤더의 문장은 그대로다');
});

test('SQL Server integration runs as the generated project does and observes locks with a server grant', () => {
  const { integration } = VENDOR_ENGINES.mssql;
  assert.match(VENDOR_ENGINES.mssql.image, /^mcr\.microsoft\.com\/mssql\/server:2022-latest@sha256:[a-f0-9]{64}$/);
  assert.equal(VENDOR_ENGINES.mssql.imageOrigin, 'official:mcr');
  assert.equal(integration.url(1433), `jdbc:sqlserver://127.0.0.1:1433;databaseName=vendorcheck;${VENDOR_SOURCE.mssql.urlParameters}`);
  assert.deepEqual(integration.grants, ['USE master', 'GRANT VIEW SERVER STATE TO vendorcheck', 'USE vendorcheck'], '서버 권한은 master 에서만 줄 수 있다');
  assert.equal(integration.administratorScript(['A', 'B']), 'A\nGO\nB\nGO\nEXIT\n');
  const variables = VENDOR_ENGINES.mssql.environment('p');
  assert.deepEqual([variables.TZ, variables.MSSQL_SA_PASSWORD], ['Asia/Seoul', 'p']);
  // 서버 콜레이션을 바꾸면 첫 기동의 시스템 DB 재색인과 준비 확인이 교착해 서버가 꺼진다(실측). 한국어 콜레이션은 앱 DB 를 만들 때 준다.
  assert.equal(variables.MSSQL_COLLATION, undefined);
  const seen = [];
  VENDOR_ENGINES.mssql.ready('x', args => { seen.push(args); return { status: 0 }; });
  assert.match(seen[0].at(-1), /CREATE DATABASE vendorcheck COLLATE Korean_100_CI_AS;/);
  // 계정 이름은 식별자 자리마다 대괄호로 감싼다 — 예약어(user)나 숫자로 시작하는 이름도 문법 오류가 되지 않는다(독립 검토 지적).
  assert.match(seen[0].at(-1), /CREATE LOGIN \[\\\$\(NURI_APP_LOGIN\)\] WITH .*CREATE USER \[\\\$\(NURI_APP_LOGIN\)\] FOR LOGIN \[\\\$\(NURI_APP_LOGIN\)\];.*ADD MEMBER \[\\\$\(NURI_APP_LOGIN\)\]'\)/);
  assert.match(seen[0].at(-1), /SQLCMDPASSWORD="\$MSSQL_SA_PASSWORD" NURI_APP_LOGIN="vendorcheck" NURI_APP_PASSWORD="\$\(printf '%s' "\$MSSQL_SA_PASSWORD"/, '앱 계정은 실행마다 만든 비밀번호를 환경으로만 받는다');
  assert.doesNotMatch(seen[0].at(-1), / -P /);
  assert.match(VENDOR_ENGINES.mssql.command('/tmp/run.sql'), /^SQLCMDPASSWORD="\$MSSQL_SA_PASSWORD" \S+ -C -x /, '문장 실행도 비밀을 인자에 두지 않고 값 안의 $( 를 치환하지 않는다');
  // sqlcmd 를 -h -1 -W 와 NOCOUNT 로 부르면 값만 낸다(2026-11-04 실측). 형식 밖 줄은 따옴표 이름이라 멈춘다.
  assert.throws(() => readCatalog({ id: 'mssql' }, 'mssql', () => ({ errors: [], sections: new Map([[0, ['bad-name']]]) })), /mssql columns 조회의 줄을 해석하지 못했다: bad-name/);
  assert.ok(VENDOR_UNIQUE_SIGNATURES.mssql && VENDOR_UNIQUE_COLUMNS.mssql && VENDOR_SEQUENCE_NEXT_VALUES.mssql);
  assert.deepEqual([...readSequenceNextValues({}, 'mssql', () => ({ errors: [], sections: new Map([[0, ['sq_a:1', 'sq_b:3', '@@COMPLETED']]]) }))], [['sq_a', 1], ['sq_b', 3]]);
});

test('the MySQL family states the columns of every key and unique as the catalog reports them', () => {
  const sample = model();
  sample.tables.find(table => table.name === 't_child').indexes.push({ name: 'ix_t_child_owner_parent', method: 'btree', where: null, unique: true, columns: [{ name: 'owner' }, { name: 'parent_id', descending: true }] });
  for (const adapter of [mysqlAdapter, mariadbAdapter]) {
    const emission = adapter.emitSchema(sample);
    // 기본 키 이름은 언제나 PRIMARY 다. 컬럼 조회도 그 이름으로 낸다.
    for (const table of sample.tables) assert.deepEqual(emission.uniqueColumns.get(`${table.name}.primary`), table.primaryKey.columns, `${adapter.id}: ${table.name}`);
    assert.deepEqual(emission.uniqueColumns.get('t_parent.uk_t_parent_code'), ['code']);
    assert.deepEqual(emission.uniqueColumns.get('t_child.uk_t_child_owner_url'), adapter.id === 'mysql' ? ['owner', 'url_hash'] : ['owner', 'url'], `${adapter.id}: 해시 유니크는 해시 컬럼이 든다`);
    // CREATE UNIQUE INDEX 도 제약 표에 나온다(2026-11-04 실측). 인덱스로 기대하면 대조가 indexes 누락·constraints 초과로 붉다.
    assert.ok(emission.expected.constraints.includes('t_child.ix_t_child_owner_parent') && !emission.expected.indexes.includes('t_child.ix_t_child_owner_parent'), adapter.id);
    assert.deepEqual(emission.uniqueColumns.get('t_child.ix_t_child_owner_parent'), ['owner', 'parent_id']);
    assert.ok(emission.expected.indexes.includes('t_child.ix_t_child_url'), `${adapter.id}: 일반 인덱스는 인덱스로 기대한다`);
    assert.ok(!emission.uniqueColumns.has('t_child.ix_t_child_url'));
  }
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
  // 어댑터가 있는 벤더는 모두 통합 엔진을 연다. 통합 값이 없는 엔진 이름은 그대로 멈춘다.
  assert.throws(() => parseIntegrationArgs(['--input', 'x.json', '--vendor', 'oracle', '--engine', 'nope']), /아직 돌릴 수 없는 엔진: nope/);
  assert.throws(() => parseIntegrationArgs(['--vendor', 'oracle']), /--input/);
  assert.deepEqual(parseIntegrationArgs(['--input', 'x.json', '--vendor', 'oracle', '--engine', 'oracle19']),
    { input: 'x.json', vendor: 'oracle', engine: 'oracle19' });
  for (const vendor of ['mysql', 'mariadb', 'mssql', 'cubrid']) assert.deepEqual(parseIntegrationArgs(['--input', 'x.json', '--vendor', vendor]), { input: 'x.json', vendor }, vendor);
});

test('CUBRID integration connects like the generated project and alone adds the lock observation container and the metadata strategy', () => {
  const { integration } = VENDOR_ENGINES.cubrid;
  const source = VENDOR_SOURCE.cubrid;
  const environment = integrationEnvironment('cubrid', integration, { port: 33000, password: 'not-a-secret', owner: 'token', name: 'egov-vendor-cubrid-x' });
  // 접속 인자·드라이버·방언이 생성물과 갈리면 시험이 앱과 다른 세션을 본다.
  assert.equal(environment.SPRING_DATASOURCE_URL, `jdbc:cubrid:127.0.0.1:33000:vendorcheck:::?${source.urlParameters}`);
  assert.ok(source.url.endsWith(`:::?${source.urlParameters}`) && source.composeUrl.endsWith(`:::?${source.urlParameters}`));
  assert.equal(environment.SPRING_DATASOURCE_DRIVER_CLASS_NAME, source.driverClass);
  assert.equal(environment.SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT, source.dialect);
  assert.equal(environment.APP_DATABASE_VENDOR, 'cubrid');
  // 잠금 대기는 SQL 로 볼 수 없어 시험이 그 컨테이너의 관리 명령으로 본다(VendorTestSql).
  assert.equal(environment.VENDOR_TEST_CONTAINER, 'egov-vendor-cubrid-x');
  // 묶음 추출(grouped)은 표를 찾지 못한다. 키 이름에 밑줄이 있어 환경 변수 이름이 아니라 JSON 으로 넘긴다. 생성물은 같은 값을 벤더 문서에 둔다.
  const json = JSON.parse(environment.SPRING_APPLICATION_JSON);
  const [[group, key, value]] = source.hibernateProperties;
  assert.deepEqual(json, { [`spring.jpa.properties.hibernate.${group}.${key}`]: value });
  assert.equal(value, 'individually');
  // 다른 벤더는 SQL 로 잠금을 보고 기본 추출 방식을 쓴다.
  for (const vendor of ['oracle', 'mysql', 'mariadb', 'mssql']) {
    const other = integrationEnvironment(vendor, VENDOR_ENGINES[vendor].integration, { port: 1, password: 'not-a-secret', owner: 'token', name: 'egov-vendor-x' });
    assert.ok(!('VENDOR_TEST_CONTAINER' in other) && !('SPRING_APPLICATION_JSON' in other), vendor);
  }
  // 앱 계정이 표를 가져야 Hibernate 검증과 표 수 조회가 앱의 스키마를 본다. 관리자 문장은 dba 로 돌고 첫 오류에서 실패로 끝난다.
  assert.equal(integration.username, 'vendorcheck');
  assert.deepEqual(integration.grants, []);
  assert.equal(integration.administratorScript(['A', 'B']), 'A;\nB;\n');
  assert.match(integration.administrator, /grep -qE '\^ERROR'/);
  // 개발 compose 와 검증 엔진은 같은 이미지·로캘·서버 시계다.
  const variables = VENDOR_ENGINES.cubrid.environment('p');
  assert.deepEqual([variables.CUBRID_LOCALE, variables.TZ], ['ko_KR.utf8', 'Asia/Seoul']);
});

test('the MySQL family integration connects like the generated project and grants only the schema and the lock views', () => {
  for (const [vendor, scheme, driver, dialect] of [['mysql', 'mysql', 'com.mysql.cj.jdbc.Driver', 'org.hibernate.dialect.MySQLDialect'],
    ['mariadb', 'mariadb', 'org.mariadb.jdbc.Driver', 'org.hibernate.dialect.MariaDBDialect']]) {
    const { integration } = VENDOR_ENGINES[vendor];
    const environment = integrationEnvironment(vendor, integration, { port: 33060, password: 'not-a-secret', owner: 'token' });
    // 시간대·콜레이션 인자가 생성물 주소와 갈리면 시험이 앱과 다른 세션을 본다(CURRENT_DATE 가 UTC 날짜가 된다).
    assert.equal(environment.SPRING_DATASOURCE_URL, `jdbc:${scheme}://127.0.0.1:33060/vendorcheck?${VENDOR_SOURCE[vendor].urlParameters}`, vendor);
    assert.ok(VENDOR_SOURCE[vendor].url.endsWith(`?${VENDOR_SOURCE[vendor].urlParameters}`) && VENDOR_SOURCE[vendor].composeUrl.endsWith(`?${VENDOR_SOURCE[vendor].urlParameters}`), vendor);
    assert.equal(environment.SPRING_DATASOURCE_USERNAME, 'vendorcheck');
    assert.equal(environment.SPRING_DATASOURCE_DRIVER_CLASS_NAME, driver);
    assert.equal(environment.SPRING_JPA_PROPERTIES_HIBERNATE_DIALECT, dialect);
    assert.equal(VENDOR_SOURCE[vendor].dialect, dialect, `${vendor}: 생성물과 시험의 방언이 같다`);
    assert.equal(VENDOR_SOURCE[vendor].driverClass, driver);
    assert.equal(environment.APP_DATABASE_VENDOR, vendor);
    assert.equal(integration.grants[0], "GRANT ALL PRIVILEGES ON vendorcheck.* TO 'vendorcheck'@'%'");
    // 앱 계정은 Flyway 와 격리 E2E 앱이 관리자 문장보다 먼저 붙으므로 이미지의 앱 계정 변수로 초기화 때 만든다.
    const variables = VENDOR_ENGINES[vendor].environment('p');
    const prefix = vendor === 'mysql' ? 'MYSQL' : 'MARIADB';
    assert.deepEqual([variables[`${prefix}_USER`], variables[`${prefix}_PASSWORD`], variables[`${prefix}_DATABASE`], variables[`${prefix}_ROOT_PASSWORD`]], ['vendorcheck', 'p', 'vendorcheck', 'p']);
    // 클라이언트로 넣은 행의 CURRENT_TIMESTAMP 기본값이 앱 세션과 같은 한국 시계를 쓴다.
    assert.match(VENDOR_ENGINES[vendor].batch.wrap('SELECT 1;'), /^SET NAMES utf8mb4;\nSET time_zone = '\+09:00';\n/, vendor);
  }
  // 2026-11-04 실측 최소 권한. MariaDB 의 INNODB_* 표는 DB 단위가 아닌 PROCESS 를, MySQL 은 performance_schema 표 넷의 SELECT 를 요구한다.
  assert.deepEqual(VENDOR_SOURCE.mysql.urlParameters, "sessionVariables=time_zone='%2B09:00',innodb_lock_wait_timeout=5&connectionCollation=utf8mb4_0900_bin");
  // MySQL 의 세션 잠금 대기는 앱의 잠금 조회 상한과 같다. 한쪽만 바꾸면 MySQL 만 다른 상한으로 돈다.
  const lockTimeoutMillis = Number(readFileSync(join(ROOT, 'api-server/src/main/resources/application.yml'), 'utf8').match(/^\s+lock:\r?\n\s+timeout:\s*(\d+)\s*$/m)?.[1]);
  assert.equal(Number(VENDOR_SOURCE.mysql.urlParameters.match(/innodb_lock_wait_timeout=(\d+)/)?.[1]) * 1000, lockTimeoutMillis);
  // SQL Server 도 잠금 조회 하나에 대기를 걸지 못해 접속 인자가 세션 대기를 묶는다(SET LOCK_TIMEOUT 은 풀로 샌다, 2026-11-04 실측).
  assert.equal(Number(VENDOR_SOURCE.mssql.urlParameters.match(/lockTimeout=(\d+)/)?.[1]), lockTimeoutMillis);
  assert.deepEqual(VENDOR_SOURCE.mariadb.urlParameters, "sessionVariables=time_zone='+09:00'&connectionCollation=utf8mb4_nopad_bin");
  assert.deepEqual(VENDOR_ENGINES.mariadb.integration.grants.slice(1), ["GRANT PROCESS ON *.* TO 'vendorcheck'@'%'"]);
  assert.deepEqual(VENDOR_ENGINES.mysql.integration.grants.slice(1), ['data_lock_waits', 'threads', 'user_variables_by_thread', 'data_locks'].map(table => `GRANT SELECT ON performance_schema.${table} TO 'vendorcheck'@'%'`));
  // 바이너리 로그가 켜진 8.4 에서 앱 계정의 트리거 생성은 이 인자 없이 1419 로 멈춘다(2026-11-04 실측). 개발 compose 도 같은 인자다.
  assert.ok(VENDOR_ENGINES.mysql.serverArgs.includes('--log-bin-trust-function-creators=1'));
  assert.match(VENDOR_SOURCE.mysql.composeService, /--log-bin-trust-function-creators=1/);
  for (const vendor of ['mysql', 'mariadb']) {
    assert.match(VENDOR_SOURCE[vendor].composeService, new RegExp(`--collation-server=${VENDOR_SOURCE[vendor].urlParameters.split('connectionCollation=')[1]}`), `${vendor}: 서버와 연결의 콜레이션이 같다`);
    assert.ok(VENDOR_ENGINES[vendor].serverArgs.includes(`--collation-server=${VENDOR_SOURCE[vendor].urlParameters.split('connectionCollation=')[1]}`), vendor);
  }
});

test('the administrator runs its statements in the format that stops its own client at the first error', () => {
  const seen = [];
  const capture = (args, options) => { seen.push({ args, input: options.input }); return { status: 0, stdout: '', stderr: '' }; };
  runAsAdministrator({ id: 'oracle', name: 'c', engine: VENDOR_ENGINES.oracle }, ['GRANT a TO b', 'GRANT c TO d'], capture);
  // Oracle 스크립트는 고치기 전과 바이트까지 같다.
  assert.equal(seen[0].input, 'WHENEVER SQLERROR EXIT FAILURE\nGRANT a TO b;\nGRANT c TO d;\nEXIT\n');
  assert.deepEqual(seen[0].args, ['exec', '-i', 'c', 'sh', '-c', 'sqlplus -S / as sysdba']);
  for (const vendor of ['mysql', 'mariadb']) {
    seen.length = 0;
    runAsAdministrator({ id: vendor, name: 'c', engine: VENDOR_ENGINES[vendor] }, VENDOR_ENGINES[vendor].integration.grants, capture);
    // sqlplus 명령이 MySQL 클라이언트에 가면 첫 줄에서 문법 오류다. --force 가 있으면 실패한 GRANT 를 건너뛰고 0 으로 끝난다.
    assert.doesNotMatch(seen[0].input, /WHENEVER|EXIT/, vendor);
    assert.equal(seen[0].input, `${VENDOR_ENGINES[vendor].integration.grants.map(statement => `${statement};`).join('\n')}\n`);
    const command = seen[0].args.at(-1);
    assert.match(command, new RegExp(`^MYSQL_PWD=\\$${vendor === 'mysql' ? 'MYSQL' : 'MARIADB'}_ROOT_PASSWORD ${vendor} -uroot `), vendor);
    assert.doesNotMatch(command, /--force/, `${vendor}: 첫 오류에서 멈춘다`);
    assert.throws(() => runAsAdministrator({ id: vendor, name: 'c', engine: VENDOR_ENGINES[vendor] }, ['GRANT x'], () => ({ status: 1, stdout: '', stderr: 'ERROR 1044' })),
      error => error.code === 'VENDOR_ADMIN_FAILED' && /ERROR 1044/.test(error.message), vendor);
  }
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

test('the Oracle adapter states the columns of every key and unique, and they reach the statement', () => {
  const sample = model();
  const emission = oracleAdapter.emitSchema(sample);
  const uniques = sample.tables.flatMap(table => [...table.uniques, ...(table.primaryKey ? [table.primaryKey] : [])].map(item => [`${table.name}.${item.name}`, item.columns]));
  assert.ok(uniques.length >= 3);
  for (const [name, columns] of uniques) assert.deepEqual(emission.uniqueColumns.get(name), columns, name);
  // 제약 경로와 함수 인덱스 경로 모두 컬럼이 문장에 있어야 이름 대조를 받는 이 값이 실제 스키마를 뜻한다.
  const statements = emission.statements.map(statement => statement.sql);
  for (const table of sample.tables) {
    for (const unique of table.uniques) {
      const statement = statements.find(sql => sql.includes(` ${unique.name} `));
      for (const name of unique.columns) assert.match(statement, new RegExp(`\\b${name}\\b`), `${unique.name}: ${name}`);
      if (unique.columns.length > 1 && unique.columns.some(name => table.columns.find(column => column.name === name).nullable)) {
        assert.equal([...statement.matchAll(/CASE WHEN/g)].length, unique.columns.length, `${unique.name}: 컬럼마다 CASE 하나`);
      }
    }
  }
});

test('nullable composite uniques keep accepting partly NULL rows', () => {
  const sample = model();
  const sql = adapter => adapter.emitSchema(sample).statements.map(statement => statement.sql).join('\n');
  // 벤더 DB 에서 도는 시험 가운데 부분 NULL 행을 넣는 것이 없어, 이 문장 고정이 조건 모양의 유일한 안전망이다.
  assert.match(sql(oracleAdapter), /CREATE UNIQUE INDEX uk_t_child_owner_url ON t_child \(CASE WHEN owner IS NOT NULL AND url IS NOT NULL THEN owner END, CASE WHEN owner IS NOT NULL AND url IS NOT NULL THEN url END\)/);
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

test('unique parity reads the column set of constraints, plain unique indexes and function indexes', () => {
  const lines = [
    ['tb_a.pk_tb_a=id', 'tb_a.uk_pair=a', 'tb_a.uk_pair=b', 'flyway_schema_history.flyway_schema_history_pk=installed_rank'],
    ['tb_a.uk_idx=c'],
    ['tb_a.uk_fn=CASE  WHEN ("A" IS NOT NULL AND "D" IS NOT NULL) THEN "A" END', 'tb_a.uk_fn=CASE  WHEN ("A" IS NOT NULL AND "D" IS NOT NULL) THEN "D" END', 'tb_a.uk_trim=TRIM("E")', 'tb_a.uk_idx=UPPER("F")', '@@COMPLETED', ''],
  ];
  const statements = [];
  const read = () => readUniqueColumns({}, 'oracle', (_, sql, options) => {
    statements.push(...sql);
    assert.ok(options.sessionPrefix.some(item => /SERVEROUTPUT ON/.test(item)), '식은 DBMS_OUTPUT 으로 나온다');
    return { errors: [], sections: new Map(lines.map((section, index) => [index, section])) };
  });
  const found = read();
  assert.ok(statements[2].raw, '식 조회는 PL/SQL 블록이다');
  assert.deepEqual([...found.get('tb_a.uk_pair').keys], ['a', 'b']);
  assert.deepEqual([...found.get('tb_a.uk_fn').keys], ['a', 'd'], 'CASE 의 값이 키다');
  assert.deepEqual([...found.get('tb_a.uk_trim').keys], ['e'], 'CASE 가 아닌 식은 참조 컬럼이 키다');
  assert.deepEqual([...found.get('tb_a.uk_idx').keys], ['c', 'f'], '일반 컬럼과 식이 섞인 인덱스는 합친다');

  const emission = columns => {
    const value = createEmission('oracle');
    for (const [name, list] of Object.entries(columns)) value.expectUnique('tb_a', name, list);
    return value;
  };
  const ignoreTables = ['flyway_schema_history'];
  const matching = { pk_tb_a: ['id'], uk_pair: ['a', 'b'], uk_idx: ['c', 'f'], uk_fn: ['a', 'd'], uk_trim: ['e'] };
  assert.doesNotThrow(() => assertUniqueColumns(emission(matching), found, { ignoreTables }));
  const parity = /키·유니크의 컬럼이 번역 결과와 다르다/;
  assert.throws(() => assertUniqueColumns(emission({ ...matching, uk_pair: ['a'] }), found, { ignoreTables }), error => error.code === 'VENDOR_PARITY_FAILED' && parity.test(error.message) && /uk_pair 기대 \(a\), 실제 키 \(a, b\)/.test(error.message));
  assert.throws(() => assertUniqueColumns(emission({ ...matching, uk_missing: ['z'] }), found, { ignoreTables }), /tb_a\.uk_missing 없음\(기대 z\)/);
  assert.throws(() => assertUniqueColumns(emission({ pk_tb_a: ['id'], uk_pair: ['a', 'b'], uk_idx: ['c', 'f'], uk_fn: ['a', 'd'] }), found, { ignoreTables }), /tb_a\.uk_trim 기대에 없는 유니크/, '일반 인덱스가 유니크가 된 번역도 붉다');
  assert.throws(() => assertUniqueColumns(emission(matching), found), /flyway_schema_history_pk 기대에 없는 유니크/, '지정한 표만 뺀다');

  // CASE 가 하나 빠지면 조건에 컬럼이 남아도 키가 줄어든다.
  lines[2] = ['tb_a.uk_fn=CASE  WHEN ("A" IS NOT NULL AND "D" IS NOT NULL) THEN "A" END', 'tb_a.uk_trim=TRIM("E")', 'tb_a.uk_idx=UPPER("F")'];
  assert.throws(() => assertUniqueColumns(emission(matching), read(), { ignoreTables }), /uk_fn 기대 \(a, d\), 실제 키 \(a\), 식 참조 \(a, d\)/);
  // 묶음 조건이 줄어도 부분 NULL 의미가 달라진다.
  lines[2] = ['tb_a.uk_fn=CASE  WHEN "A" IS NOT NULL THEN "A" END', 'tb_a.uk_fn=CASE  WHEN "D" IS NOT NULL THEN "D" END', 'tb_a.uk_trim=TRIM("E")', 'tb_a.uk_idx=UPPER("F")'];
  assert.doesNotThrow(() => assertUniqueColumns(emission(matching), read(), { ignoreTables }), '이 대조는 컬럼 집합만 본다. 조건의 모양은 어댑터 문장을 고정하는 시험(nullable composite uniques) 몫이다');

  assert.equal(readUniqueColumns({}, 'tibero', () => { throw new Error('부르지 않는다'); }), null, '조회가 없는 벤더는 대조를 건너뛴다');
  assert.throws(() => readUniqueColumns({}, 'oracle', () => ({ errors: [{ error: 'ORA-00942' }], sections: new Map() })), error => error.code === 'VENDOR_QUERY_FAILED');
  assert.deepEqual(Object.entries(VENDOR_ENGINES).filter(([id, engine]) => engine.integration && !VENDOR_UNIQUE_COLUMNS[id.replace(/\d+$/, '')]).map(([id]) => id), [], '통합 시험을 여는 벤더는 유니크 컬럼 조회가 있어야 한다');
  assert.deepEqual(Object.entries(VENDOR_ENGINES).filter(([id, engine]) => engine.integration && !VENDOR_SEQUENCE_NEXT_VALUES[id.replace(/\d+$/, '')]).map(([id]) => id), [], '통합 시험을 여는 벤더는 시퀀스 다음 값 조회가 있어야 한다');
});

test('the MySQL family reads every unique, constraint or index, from one query because the catalog cannot tell them apart', () => {
  // 2026-11-04 MySQL 8.4 실측 줄. 접두 유니크는 컬럼 이름만, CREATE UNIQUE INDEX 도 같은 조회에 나온다.
  const measured = ['m6_a.primary=id', 'm6_a.uq_m6_a_w=w', 'm6_a.ux_m6_a_zy=z', 'm6_a.ux_m6_a_zy=y', 'm6_b.v=v', '@@COMPLETED', ''];
  for (const vendor of ['mysql', 'mariadb']) {
    const statements = [];
    const found = readUniqueColumns({}, vendor, (_, sql) => {
      statements.push(...sql);
      return { errors: [], sections: new Map([[0, measured], [1, []], [2, []]]) };
    });
    assert.deepEqual([...found.keys()], ['m6_a.primary', 'm6_a.uq_m6_a_w', 'm6_a.ux_m6_a_zy', 'm6_b.v'], vendor);
    assert.deepEqual([...found.get('m6_a.ux_m6_a_zy').keys], ['z', 'y']);
    // 둘째·셋째 조회는 표식 순서만 맞추고 값을 내지 않는다. 제약과 독립 인덱스를 가르려 하면 MySQL 계열에서는 늘 비거나 둘로 나뉘어 붉다.
    assert.match(statements[1].sql, /WHERE 1 = 0$/, vendor);
    assert.match(statements[2].sql, /WHERE 1 = 0$/, vendor);
    assert.ok(statements[2].raw, vendor);
    // 값만 내는 배치라 형식 밖의 줄은 버리지 않고 멈춘다.
    assert.throws(() => readUniqueColumns({}, vendor, () => ({ errors: [], sections: new Map([[0, ['m6_a.bad-name=id']], [1, []], [2, []]]) })),
      error => error.code === 'VENDOR_QUERY_FAILED' && /유니크 컬럼 조회의 줄을 해석하지 못했다: m6_a\.bad-name=id/.test(error.message), vendor);
  }
  assert.match(VENDOR_UNIQUE_COLUMNS.mysql.constraints, /information_schema\.statistics s WHERE s\.table_schema = DATABASE\(\) AND s\.non_unique = 0 AND s\.column_name IS NOT NULL/);
  assert.match(VENDOR_UNIQUE_COLUMNS.mariadb.constraints, /c\.constraint_type IN \('PRIMARY KEY','UNIQUE'\)/);
  // 카탈로그 조회의 줄도 같은 기준이다. mysql 클라이언트는 -N -B 로 값만 낸다.
  const kinds = Object.keys(VENDOR_INTROSPECTION.mysql);
  assert.throws(() => readCatalog({}, 'mysql', () => ({ errors: [], sections: new Map(kinds.map((_, at) => [at, at === 0 ? ['bad-name.id'] : []])) })),
    error => error.code === 'VENDOR_QUERY_FAILED' && /columns 조회의 줄을 해석하지 못했다: bad-name\.id/.test(error.message));
  assert.deepEqual(readCatalog({}, 'mariadb', () => ({ errors: [], sections: new Map(kinds.map((_, at) => [at, at === 0 ? ['tb_a.id', '@@COMPLETED'] : []])) })).columns, ['tb_a.id']);
});

test('sequence next values and byte columns come from strict lines', () => {
  const answer = lines => () => ({ errors: [], sections: new Map([[0, lines]]) });
  assert.deepEqual([...readSequenceNextValues({}, 'oracle', answer(['sq_a:42', '  sq_b:1  ', '@@COMPLETED']))], [['sq_a', 42], ['sq_b', 1]]);
  assert.equal(readSequenceNextValues({}, 'tibero', answer([])), null);
  // csql 은 값 줄을 `<00001> 식: '값'` 으로 낸다(2026-11-06 실측). 시험의 첫 판은 이 모양을 받지 못해 원본 통합 실행에서 다음 값이 비었다.
  assert.deepEqual([...readSequenceNextValues({}, 'cubrid', answer(["<00001> lower(name)||':'||cast(...): 'sq_a:5'", 'sq_b:7', '@@COMPLETED']))], [['sq_a', 5], ['sq_b', 7]]);
  assert.match(VENDOR_SEQUENCE_NEXT_VALUES.cubrid, /CASE WHEN started = 1 THEN current_val \+ increment_val ELSE current_val END/, '쓰기 전 시리얼은 current_val 이 다음 값이다');
  // 2026-11-04 실측 줄. MySQL 은 Hibernate 표 시퀀스의 next_val, MariaDB 는 NOCACHE 시퀀스의 next_not_cached_value 다.
  assert.deepEqual([...readSequenceNextValues({}, 'mysql', answer(['m6_seq_a:41', 'm6_seq_b:7', '@@COMPLETED']))], [['m6_seq_a', 41], ['m6_seq_b', 7]]);
  assert.deepEqual([...readSequenceNextValues({}, 'mariadb', answer(['m6_seq_nocache:103']))], [['m6_seq_nocache', 103]]);
  assert.deepEqual([...readSequenceNextValues({}, 'mysql', answer([]))], [], '시퀀스가 없으면 표식만 나온다');
  assert.throws(() => readSequenceNextValues({}, 'mariadb', answer(['m6_seq 103'])), /시퀀스 다음 값 조회의 줄을 해석하지 못했다: m6_seq 103/);
  // 시퀀스 이름마다 표가 달라 문장을 만들어 돌린다. MariaDB 의 EXECUTE IMMEDIATE 는 부분 조회를 받지 않아(1970) 변수로 나눈다.
  assert.match(VENDOR_SEQUENCE_NEXT_VALUES.mysql, /next_val\) FROM `', t\.table_name, '`'\).*PREPARE nuri_seq FROM @nuri_seq_sql; EXECUTE nuri_seq; DEALLOCATE PREPARE nuri_seq$/);
  assert.match(VENDOR_SEQUENCE_NEXT_VALUES.mysql, /^SET SESSION group_concat_max_len = 1048576; /, 'GROUP_CONCAT 기본 상한이 시퀀스 목록을 자르지 않게 한다');
  assert.match(VENDOR_SEQUENCE_NEXT_VALUES.mariadb, /^SET @q = \(SELECT .*next_not_cached_value.*table_type = 'SEQUENCE'\); EXECUTE IMMEDIATE COALESCE\(@q, 'SELECT 1 FROM DUAL WHERE 0'\)$/);
  assert.throws(() => readSequenceNextValues({}, 'oracle', answer(['sq_a 42'])), error => error.code === 'VENDOR_QUERY_FAILED' && /시퀀스 다음 값 조회의 줄을 해석하지 못했다: sq_a 42/.test(error.message));
  assert.deepEqual(readByteColumns({}, 'oracle', answer(['tb_a.nm=100', 'tb_a.tk=4000'])), ['tb_a.nm=100', 'tb_a.tk=4000']);
  assert.deepEqual(readByteColumns({}, 'mysql', answer(['x'])), [], '바이트 의미가 없는 벤더는 비어 있다');
  assert.throws(() => readByteColumns({}, 'oracle', answer(['bad-name.nm=100'])), /바이트 컬럼 조회의 줄을 해석하지 못했다/);
  assert.deepEqual(addedByteColumns(['tb_a.tk=4000'], ['tb_a.tk=4000', 'tb_a.nm=100']), ['tb_a.nm=100'], '기준선의 바이트 컬럼은 어댑터의 저하다');
  assert.deepEqual(addedByteColumns(['tb_a.tk=4000'], ['tb_a.tk=1000']), [], '기준선 컬럼을 줄인 것은 길이 규칙이 본다');
  assert.deepEqual(addedByteColumns([], ['tb_a.tk=4000']), ['tb_a.tk=4000']);
});

test('an Oracle catalog line that cannot be read stops the run instead of disappearing', () => {
  const kinds = Object.keys(VENDOR_INTROSPECTION.oracle);
  const answer = (index, lines) => () => ({ errors: [], sections: new Map(kinds.map((_, at) => [at, at === index ? lines : []])) });
  const stops = (kind, line) => assert.throws(() => readCatalog({}, 'oracle', answer(kinds.indexOf(kind), [line])),
    error => error.code === 'VENDOR_QUERY_FAILED' && error.message.includes(`${kind} 조회의 줄을 해석하지 못했다: ${line}`) && /따옴표 없는 표준 이름/.test(error.message), line);
  stops('columns', '게시판.id');
  stops('columns', 'bad-name.id');
  stops('columns', 'bad name.id');
  stops('columns', 'x tb_quiet.id');
  stops('constraints', 'tb_ok.bad-constraint');
  stops('sequences', '.sq-bad');
  stops('constraints', 'bin$abc==$0.bin$def==$0');
  const good = readCatalog({}, 'oracle', answer(0, ['tb_ok.id', 'flyway_schema_history.installed_rank', '', '@@COMPLETED']));
  assert.deepEqual(good.columns, ['tb_ok.id', 'flyway_schema_history.installed_rank'], '빈 줄과 끝 표식은 값이 아니다');
  // 휴지통 이름이 조회에서 빠져야 이 판정이 DROP TABLE 을 거짓 실패로 만들지 않는다.
  for (const kind of ['columns', 'constraints', 'indexes', 'triggers']) assert.match(VENDOR_INTROSPECTION.oracle[kind], /NOT LIKE 'BIN\$%'/, kind);
  // csql 은 머리 줄을 내므로 다른 벤더는 줄 끝만 읽는다.
  const csql = readCatalog({}, 'cubrid', () => ({ errors: [], sections: new Map([[0, ["<00001>  expr: 'tb_a.id'", 'There are 1 rows']]]) }));
  assert.deepEqual(csql.columns, ['tb_a.id']);
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

// 한 행씩 넣으면 CUBRID 앱 첫 기동의 Flyway 가 시드에 2~5분을 썼다(2026-11-07 대표 E2E 의 브로커 SQL 로그, 행당 약 10ms).
test('CUBRID batches consecutive seed inserts per table without reordering rows or batching self references', () => {
  const sample = model();
  const parents = [{ id: 2, code: 'B', use_yn: 'Y', hash_vl: null, body: null, up_id: 1 }, { id: 1, code: 'A', use_yn: 'Y', hash_vl: null, body: null, up_id: null }];
  const children = Array.from({ length: 5 }, (_, index) => ({ id: index + 10, parent_id: 1, url: `u(${index});`, owner: index === 0 ? "o'x" : 'o' }));
  const rows = { t_child: children, t_parent: parents };
  const single = emitRows(sample, rows, cubridAdapter);
  const batched = cubridAdapter.emitSeed(sample, rows);
  const of = (statements, table) => statements.filter(statement => statement.startsWith(`INSERT INTO ${table} `));
  // 자기 참조 표는 부모를 먼저 넣는 한 행 문장 그대로다.
  assert.deepEqual(of(batched, 't_parent'), of(single, 't_parent'));
  // 나머지 표는 한 문장이 같은 행을 같은 순서로 넣는다. 값 속의 괄호·쌍반점·따옴표는 행 경계가 아니다.
  const tuple = statement => statement.slice(statement.indexOf(' VALUES ') + ' VALUES '.length);
  const prefix = of(single, 't_child')[0].slice(0, of(single, 't_child')[0].indexOf(' VALUES ') + ' VALUES '.length);
  assert.deepEqual(of(batched, 't_child'), [`${prefix}${of(single, 't_child').map(tuple).join(', ')}`]);
  assert.ok(batched.indexOf(of(batched, 't_child')[0]) > batched.indexOf(of(batched, 't_parent').at(-1)), 'FK 부모 표가 먼저다');
  // 행 수·글자 수 상한에서 끊고, 다른 문장이나 다른 컬럼 목록을 넘어 묶지 않는다.
  const tuples = statement => (statement.match(/\), \(/g) ?? []).length + 1;
  assert.deepEqual(of(batchSeedInserts(sample, single, 2), 't_child').map(tuples), [2, 2, 1]);
  // 크기 상한은 문장 전체(머리·구분자 포함)의 UTF-8 바이트다. 첫 두 행이 꼭 맞는 상한이면 두 행씩 끊기고, 어느 문장도 상한을 넘지 않는다.
  const twoRows = Buffer.byteLength(`${prefix}${of(single, 't_child').slice(0, 2).map(tuple).join(', ')}`, 'utf8');
  const capped = of(batchSeedInserts(sample, single, 100, twoRows), 't_child');
  assert.deepEqual(capped.map(tuples), [2, 2, 1]);
  for (const statement of capped) assert.ok(Buffer.byteLength(statement, 'utf8') <= twoRows, statement);
  // 한글은 글자 하나가 3바이트다. 글자 수로 세면 넘는 문장이 생긴다. 상한보다 큰 한 행은 그 행만 한 문장이다.
  const hangul = emitRows(sample, { t_child: [1, 2, 3].map(id => ({ id, parent_id: null, url: '가'.repeat(300), owner: 'o' })) }, cubridAdapter);
  const hangulLimit = Buffer.byteLength(`${prefix}${hangul.slice(0, 2).map(tuple).join(', ')}`, 'utf8');
  assert.deepEqual(of(batchSeedInserts(sample, hangul, 100, hangulLimit), 't_child').map(tuples), [2, 1]);
  assert.deepEqual(of(batchSeedInserts(sample, hangul, 100, 10), 't_child').map(tuples), [1, 1, 1]);
  assert.equal(CUBRID_SEED_BYTES_PER_INSERT, 128 * 1024);
  const mixed = ['INSERT INTO t_child (id) VALUES (1)', 'ALTER TABLE t_child AUTO_INCREMENT = 2', 'INSERT INTO t_child (id) VALUES (2)', 'INSERT INTO t_child (id, url) VALUES (3, \'x\')'];
  assert.deepEqual(batchSeedInserts(sample, mixed), mixed);
  assert.ok(CUBRID_SEED_ROWS_PER_INSERT > 1);
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
  // 승격 표시다. 벤더를 올리는 변경이 이 줄을 함께 고친다(설계서 §17). 원장과 대조하면 selectableVendors 를 그 자신과 비교하게 된다.
  assert.deepEqual(selectableVendors(ledger), ['postgresql', 'oracle', 'mariadb', 'mysql', 'mssql', 'cubrid']);
  for (const id of Object.keys(VENDOR_ADAPTERS)) assert.ok(ledger.vendors.some(vendor => vendor.id === id));
  // 사유는 화면에 그대로 나간다.
  for (const vendor of ledger.vendors.filter(row => row.status !== 'certified')) assert.match(vendor.reason, /습니다\.$/, `${vendor.id}: 사유는 화면에 나가는 문장이라 '…습니다.' 로 끝낸다`);
});

/** 실제 원장을 바꿔 임시 폴더에 쓰고 검증 함수로 다시 읽는다. change 가 원장 전체를 고칠 수 있다. */
function ledgerCopy(t, change) {
  const directory = mkdtempSync(join(tmpdir(), 'vendor-ledger-'));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  const ledger = asPreviewVendors(JSON.parse(readFileSync(join(ROOT, VENDOR_LEDGER_PATH), 'utf8')));
  change(id => ledger.vendors.find(vendor => vendor.id === id), ledger);
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

/** 어댑터 소스가 선언할 수 있는 저하 종류. 계획에는 모델이 없고 시험 모델은 일부 분기만 지나므로 호출 지점을 센다. 읽지 못하는 모양의 호출이 있으면 붉다. */
function declaredDegradationKinds(adapterFile) {
  const source = readFileSync(join(ROOT, adapterFile), 'utf8');
  const suffixed = [...source.matchAll(/emission\.degrade\(`[^`]*:([a-z-]+)`/g)].map(match => match[1]);
  const bare = [...source.matchAll(/emission\.degrade\(index\.name\b/g)].map(() => 'index');
  const pushed = [...source.matchAll(/emission\.degradations\.push\(\{ name: '([a-z-]+)'/g)].map(match => match[1]);
  assert.equal(suffixed.length + bare.length, [...source.matchAll(/emission\.degrade\(/g)].length, `${adapterFile}: 읽지 못한 저하 선언이 있다`);
  assert.equal(pushed.length, [...source.matchAll(/emission\.degradations\.push\(/g)].length, `${adapterFile}: 읽지 못한 고정 저하가 있다`);
  return new Set([...suffixed, ...bare, ...pushed]);
}

test('every degradation an adapter can declare has a sentence in the ledger, in both directions', () => {
  const ledger = loadVendorLedger(ROOT);
  const oracle = ledger.vendors.find(vendor => vendor.id === 'oracle');
  const kinds = oracle.notices.degradations.map(row => row.kind);
  assert.deepEqual([...kinds].sort(), [...declaredDegradationKinds('scripts/project-composer-vendor-oracle.mjs')].sort());
  // 시험 모델은 인덱스 분기를 지난다. 이름에서 읽은 종류가 소스에서 센 종류와 같은 체계인지 본다.
  const emitted = oracleAdapter.emitSchema(model()).degradations;
  assert.ok(emitted.length > fixedDegradations('oracle').length, '모델 유래 저하가 없으면 이 대조는 비어 있다');
  assert.deepEqual(unshownDegradations(oracle, emitted), []);
  for (const kind of emitted.map(row => degradationKind(row.name))) assert.ok(kinds.includes(kind), kind);
  assert.deepEqual(unshownDegradations(oracle, [{ name: 'ix_a' }, { name: 'tb_a.b:length' }, { name: 'tb_a.b:new-kind' }, { name: 'new-fixed' }]), ['new-kind', 'new-fixed']);
  assert.deepEqual(unshownDegradations({ id: 'mysql' }, [{ name: 'ix_a' }]), ['index'], '문장이 없는 벤더는 모두 붉다');
  // 다른 어댑터도 같은 표기로 선언한다. 승격 때 이 대조가 그대로 걸린다.
  for (const file of ['mysql', 'mssql', 'cubrid']) {
    for (const kind of declaredDegradationKinds(`scripts/project-composer-vendor-${file}.mjs`)) {
      assert.ok(MODEL_DEGRADATION_KINDS.includes(kind) || fixedDegradations(file).includes(kind), `${file}: 모르는 종류 ${kind}`);
    }
  }
});

/**
 * 어댑터의 모든 저하 분기를 지나는 시험 모델. 시험 스냅숏에 부분 인덱스(partial)와 긴 단일 문자열 유니크(MySQL prefix, Oracle length)를 더한다.
 * 지연 FK(deferrable)와 GIN 인덱스(index)는 시험 스냅숏에 이미 있다.
 */
function everyDegradationModel() {
  const value = snapshot();
  value.indexes.push({ table_name: 't_child', name: 'ix_t_child_owner_live', definition: 'CREATE INDEX ix_t_child_owner_live ON public.t_child USING btree (owner) WHERE (parent_id IS NOT NULL)' });
  value.constraints.push(constraint('t_parent', 'uk_t_parent_body', 'u', 'UNIQUE (body)'));
  // FK 가 참조하는 NULL 허용 유일 키. SQL Server 의 필터 유일 인덱스는 FK 대상이 못 돼 NULL 한 행 제한이 남는다.
  value.constraints.push(constraint('t_parent', 'uk_t_parent_hash', 'u', 'UNIQUE (hash_vl)'),
    constraint('t_child', 'fk_t_child_owner_hash', 'f', 'FOREIGN KEY (owner) REFERENCES t_parent(hash_vl)', 't_parent'));
  // 시퀀스 기본값. CUBRID 는 DEFAULT 에 시퀀스를 쓸 수 없다(default). 다른 벤더는 그대로 옮긴다.
  value.columns.push(column('t_child', 'seq_no', 'bigint', { position: 5, default: "nextval('sq_alone'::regclass)" }));
  // 기본키를 아무도 참조하지 않는 표의 NULL 허용 유일 키를 FK 가 참조한다. CUBRID 는 둘을 맞바꿔 그 칸이 NOT NULL 이 된다(not-null).
  value.columns.push(column('t_code', 'id', 'bigint', { nullable: false, position: 1 }), varchar('t_code', 'code', 20, { position: 2 }), varchar('t_child', 'code_ref', 20, { position: 6 }));
  value.constraints.push(constraint('t_code', 'pk_t_code', 'p', 'PRIMARY KEY (id)'), constraint('t_code', 'uk_t_code_code', 'u', 'UNIQUE (code)'),
    constraint('t_child', 'fk_t_child_code', 'f', 'FOREIGN KEY (code_ref) REFERENCES t_code(code)', 't_code'));
  return buildVendorModel({ snapshot: value, extras });
}

// 두 벤더가 한 어댑터 파일을 함께 쓰면 파일의 선언 지점은 벤더마다 닿는 것이 다르다(MariaDB 는 긴 유니크를 해시로 받아 접두 저하가 없다).
// 그래서 문장은 파일이 아니라 벤더가 실제로 낼 수 있는 저하와 양방향으로 맞춘다. 닿지 않는 종류의 문장은 화면에 거짓을 보인다.
test('every CI vendor shows exactly the degradations its own translation can reach, and the probe model reaches every declaration', () => {
  const ledger = loadVendorLedger(ROOT);
  const branches = everyDegradationModel();
  const reached = vendorId => [...new Set(VENDOR_ADAPTERS[vendorId].emitSchema(branches).degradations.map(row => degradationKind(row.name)))].sort();
  const ciVendors = ledger.vendors.filter(vendor => vendor.ci);
  assert.deepEqual(ciVendors.map(vendor => vendor.id), ['oracle', 'mariadb', 'mysql', 'mssql', 'cubrid']);
  for (const vendor of ciVendors) {
    assert.deepEqual(vendor.notices.degradations.map(row => row.kind).sort(), reached(vendor.id), `${vendor.id}: 표시 문장과 번역이 낼 수 있는 저하가 다르다`);
    assert.deepEqual(unshownDegradations(vendor, VENDOR_ADAPTERS[vendor.id].emitSchema(branches).degradations), [], vendor.id);
    // 승격 전(preview)에도 생성할 수 있으므로 인증 조건의 문장 대조를 지금 지난다.
    assert.deepEqual(vendorNoticeProblems(vendor), [], vendor.id);
    for (const row of vendor.notices.degradations) assert.match(row.text, /니다\.$/, `${vendor.id} ${row.kind}: 화면 문장은 '…습니다.' 로 끝낸다`);
    assert.match(vendor.notices.image, /니다\.$/, vendor.id);
  }
  // 시험 모델이 어댑터 소스의 모든 선언 지점에 닿아야 위 대조가 빈틈이 없다. 분기를 더하고 모델에 사례를 더하지 않으면 여기서 붉다.
  for (const [file, vendors] of [['oracle', ['oracle']], ['mysql', ['mysql', 'mariadb']], ['mssql', ['mssql']], ['cubrid', ['cubrid']]]) {
    assert.deepEqual([...new Set(vendors.flatMap(reached))].sort(), [...declaredDegradationKinds(`scripts/project-composer-vendor-${file}.mjs`)].sort(), file);
  }
  // CUBRID 의 고정 저하 넷(2026-11-05 사용자 승인 제한 지원)은 모델과 상관없이 늘 안내한다. 한국 날짜 기본값은 옮겨져 저하가 아니다(2026-11-06 실측).
  const cubridKinds = ledger.vendors.find(vendor => vendor.id === 'cubrid').notices.degradations.map(row => row.kind);
  for (const kind of ['check-cost', 'timestamp-precision', 'skip-locked', 'json-validity']) assert.ok(cubridKinds.includes(kind), kind);
  const kstDate = buildVendorModel({ snapshot: { columns: [column('t_day', 'id', 'bigint', { nullable: false, position: 1 }),
    varchar('t_day', 'ymd', 8, { position: 2, default: "to_char((now() AT TIME ZONE 'Asia/Seoul'::text), 'YYYYMMDD'::text)" })],
  constraints: [constraint('t_day', 'pk_t_day', 'p', 'PRIMARY KEY (id)')], indexes: [], triggers: [], sequences: [] }, extras: { functions: [], comments: [], identitySequences: [], sequenceValues: [] } });
  assert.ok(!cubridAdapter.emitSchema(kstDate).degradations.some(row => degradationKind(row.name) === 'default'), '한국 날짜 기본값은 DB 가 채운다');
  assert.ok(!/한국 날짜/.test(ledger.vendors.find(vendor => vendor.id === 'cubrid').notices.degradations.find(row => row.kind === 'default').text), '옮겨진 기본값을 저하로 말하지 않는다');
  assert.ok(reached('mysql').includes('prefix') && !reached('mariadb').includes('prefix'), 'MariaDB 는 긴 유니크를 엔진 해시로 받는다');
  // 정렬 순서는 스키마가 아니라 엔진의 동작이라 모델과 상관없이 늘 안내한다(설계서 §5 NULL 순서).
  for (const vendorId of ['mysql', 'mariadb', 'mssql']) assert.ok(reached(vendorId).includes('null-order'), `${vendorId}: NULL 을 가장 작은 값으로 정렬한다`);
  assert.ok(!reached('oracle').includes('null-order'), 'Oracle 은 PostgreSQL 과 같은 순서다');
  // CHECK 와 FK 가 한 오류 번호를 나누는 것은 SQL Server 뿐이라, 메시지 언어에 달린 응답 차이도 SQL Server 만 안내한다(설계서 §19 오류 번호).
  assert.deepEqual(['oracle', 'mysql', 'mariadb', 'mssql'].filter(vendorId => reached(vendorId).includes('error-language')), ['mssql']);
});

test('certification needs the sentences the screen shows', t => {
  const certified = change => () => loadVendorLedger(ledgerCopy(t, vendor => { certifyVendor(vendor('oracle')); change(vendor('oracle').notices); }));
  assert.doesNotThrow(certified(() => {}));
  assert.throws(certified(notices => { notices.degradations = notices.degradations.filter(row => row.kind !== 'empty-string'); }), /oracle: 표시 문장이 없는 저하\(empty-string\)/);
  assert.throws(certified(notices => { notices.degradations.push({ kind: 'gone', summary: 'x', text: 'y' }); }), /oracle: 어댑터에 없는 저하의 표시 문장\(gone\)/);
  assert.throws(certified(notices => { notices.degradations[0].text = ''; }), /oracle: 표시 문장이 비었다\(empty-string\)/);
  assert.throws(certified(notices => { delete notices.image; }), /oracle: 화면에 보일 저하·이미지 안내\(notices\)가 없다/);
  assert.throws(certified(notices => { delete notices.degradations; }), /oracle: 화면에 보일 저하·이미지 안내\(notices\)가 없다/);
  assert.throws(() => loadVendorLedger(ledgerCopy(t, (vendor, ledger) => { certifyVendor(vendor('oracle')); delete ledger.removedPostgresTools; })), /oracle: 빠지는 도구의 표시 문장\(removedPostgresTools\)이 없다/);
  assert.doesNotThrow(() => loadVendorLedger(ledgerCopy(t, vendor => { delete vendor('oracle').notices; })), 'preview 는 문장 없이도 그대로다');
});

/** 시험 스냅숏에 부분 인덱스 하나를 더한다. 유일 여부만 바꿔 저하와 번역 불가를 가른다. */
const withPartialIndex = unique => {
  const value = snapshot();
  value.indexes.push({ table_name: 't_child', name: 'ix_t_child_owner_live',
    definition: `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ix_t_child_owner_live ON public.t_child USING btree (owner) WHERE (parent_id IS NOT NULL)` });
  return value;
};

// 계획에는 모델이 없어 모델 유래 저하는 생성할 때만 전부 보인다. 생성 경로 자체를 돌려 대조가 쓰기 전에 멈추는지 본다.
test('generation stops before writing anything when the real model has a degradation the screen does not show', t => {
  const input = { snapshot: withPartialIndex(false), extras, rows: {} };
  const project = directory => () => projectVendorSources(directory, { vendorId: 'oracle', input, inputText: '{}', layout: 'multi-module' });
  const unshown = ledgerCopy(t, vendor => { vendor('oracle').notices.degradations = vendor('oracle').notices.degradations.filter(row => row.kind !== 'partial'); });
  assert.throws(project(unshown), { message: '표시 문장이 없는 벤더 저하: partial. config/db-vendors.json 의 notices 에 더한다.' });
  assert.deepEqual(readdirSync(unshown), ['config'], '멈추기 전에 아무것도 쓰지 않는다');
  // 문장이 있으면 대조를 지나 기준선을 쓴다. 이 폴더에는 소스가 없어 첫 소스 파일을 읽을 때 멈춘다.
  const shown = ledgerCopy(t, () => {});
  assert.throws(project(shown), { code: 'ENOENT' });
  assert.match(readFileSync(join(shown, vendorBaselinePaths('oracle').migration), 'utf8'), /^CREATE INDEX ix_t_child_owner_live ON t_child \(owner\);$/m);
});

test('a partial unique index stops the vendors that drop the condition instead of widening uniqueness', () => {
  const unique = buildVendorModel({ snapshot: withPartialIndex(true), extras });
  for (const adapter of [oracleAdapter, mysqlAdapter, mariadbAdapter, cubridAdapter]) {
    assert.throws(() => adapter.emitSchema(unique), error => isGap(error) && error.message === 'ix_t_child_owner_live: 조건부 유일 인덱스는 조건 없이 옮길 수 없다', adapter.id);
  }
  // 조건을 그대로 옮기는 벤더는 막지 않는다. 키가 NULL 인 행은 유일 제약처럼 걸러 여럿 받는다.
  assert.ok(mssqlAdapter.emitSchema(unique).statements.some(({ sql }) => sql === 'CREATE UNIQUE INDEX ix_t_child_owner_live ON t_child (owner) WHERE parent_id IS NOT NULL AND owner IS NOT NULL'),
    'mssql: 부분 유일 인덱스는 조건과 NULL 거름을 함께 둔다');
  // 유일하지 않은 부분 인덱스는 지금처럼 성능 저하로 둔다.
  const plain = oracleAdapter.emitSchema(buildVendorModel({ snapshot: withPartialIndex(false), extras }));
  assert.ok(plain.degradations.some(row => row.name === 'ix_t_child_owner_live:partial'));
  assert.ok(mssqlAdapter.emitSchema(buildVendorModel({ snapshot: withPartialIndex(false), extras })).statements.some(({ sql }) => sql === 'CREATE INDEX ix_t_child_owner_live ON t_child (owner) WHERE parent_id IS NOT NULL'),
    'mssql: 유일하지 않은 부분 인덱스는 NULL 을 거르지 않는다');
});

/** 시험 스냅숏에 btree 인덱스 하나를 더한다. 유일 여부만 바꿔 같은 정의의 유일·비유일 판을 만든다. */
const withIndex = (name, body, unique) => {
  const value = snapshot();
  value.indexes.push({ table_name: 't_child', name, definition: `CREATE ${unique ? 'UNIQUE ' : ''}INDEX ${name} ON public.t_child USING btree (${body})` });
  return buildVendorModel({ snapshot: value, extras });
};
/** 모델 문법은 식 유일 인덱스를 받지 않는다(parseIndex). 어댑터가 그런 모델을 받아도 유일성을 버리지 않는지 보려고 모델을 직접 고친다. */
const withModelIndex = index => {
  const value = model();
  value.tables.find(table => table.name === 't_child').indexes.push({ method: 'btree', where: null, ...index });
  return value;
};
const statementsOf = (adapter, sample) => adapter.emitSchema(sample).statements.map(statement => statement.sql);
const stopsWith = (adapter, sample, message) => assert.throws(() => adapter.emitSchema(sample), error => isGap(error) && error.message === message, `${adapter.id}: ${message}`);

test('a standalone unique index with a nullable key gets the treatment the vendor gives the unique constraint', () => {
  // 모델의 독립 유일 인덱스는 지금 스키마에 없다. 생기면 PostgreSQL 처럼 일부 NULL 행을 여럿 받아야 한다(설계서 §2 의미 프로브).
  const unique = withIndex('ix_t_child_owner_parent', 'owner, parent_id DESC', true);
  const whole = 'owner IS NOT NULL AND parent_id IS NOT NULL';
  const oracle = oracleAdapter.emitSchema(unique);
  // DESC 는 두지 않는다. Oracle 의 내림차순 열은 NULL 을 '00' 으로 담아 (NULL, 1) 두 행을 다시 중복으로 거부한다(Oracle 23 실측).
  assert.ok(oracle.statements.some(({ sql }) => sql === `CREATE UNIQUE INDEX ix_t_child_owner_parent ON t_child (CASE WHEN ${whole} THEN owner END, CASE WHEN ${whole} THEN parent_id END)`),
    'oracle: 독립 유일 인덱스도 CASE 함수 인덱스로 옮기고 DESC 는 두지 않는다');
  assert.deepEqual(oracle.uniqueColumns.get('t_child.ix_t_child_owner_parent'), ['owner', 'parent_id'], 'oracle: 키 대조가 함수 인덱스의 컬럼을 기대한다');
  const cubrid = statementsOf(cubridAdapter, unique);
  assert.ok(cubrid.includes('CREATE UNIQUE INDEX ix_t_child_owner_parent ON t_child (uq_key_2)') && cubrid.includes('ALTER TABLE t_child ADD COLUMN uq_key_2 VARCHAR(2500)'),
    'cubrid: 독립 유일 인덱스도 그림자 키로 옮긴다');
  assert.ok(statementsOf(mssqlAdapter, unique).includes(`CREATE UNIQUE INDEX ix_t_child_owner_parent ON t_child (owner, parent_id DESC) WHERE ${whole}`), 'mssql: 독립 유일 인덱스도 NULL 을 거른다');
  // MySQL 계열의 유일 인덱스는 NULL 이 든 행을 PostgreSQL 처럼 여럿 받는다.
  for (const adapter of [mysqlAdapter, mariadbAdapter]) assert.ok(statementsOf(adapter, unique).includes('CREATE UNIQUE INDEX ix_t_child_owner_parent ON t_child (owner, parent_id DESC)'), adapter.id);
  // 같은 정의의 비유일 판은 지금처럼 일반 인덱스다.
  const plain = withIndex('ix_t_child_owner_parent', 'owner, parent_id DESC', false);
  for (const adapter of Object.values(VENDOR_ADAPTERS)) {
    assert.ok(statementsOf(adapter, plain).includes('CREATE INDEX ix_t_child_owner_parent ON t_child (owner, parent_id DESC)'), `${adapter.id}: 비유일 판은 일반 인덱스`);
  }
  assert.equal(oracleAdapter.emitSchema(plain).uniqueColumns.has('t_child.ix_t_child_owner_parent'), false);
  // Oracle 의 TRIM 은 공백뿐인 값을 NULL 로 만들고, CUBRID 그림자 키는 컬럼 값만 잇는다. 식 키는 NULL 의미를 지킬 수 없다.
  const expression = withModelIndex({ name: 'ix_t_child_trim_parent', unique: true, columns: [{ name: 'owner', expression: 'trim' }, { name: 'parent_id' }] });
  for (const adapter of [oracleAdapter, cubridAdapter]) stopsWith(adapter, expression, 'ix_t_child_trim_parent: 식이 든 복합 유일 인덱스는 NULL 의미를 지켜 옮길 수 없다');
});

test('an Oracle unique index keeps NULL rows apart by dropping DESC, which only the non-unique version keeps', () => {
  // NULL 허용 단일 컬럼의 내림차순 유일 인덱스는 NULL 두 행을 거부한다. PostgreSQL 은 받는다(Oracle 23 실측).
  assert.ok(statementsOf(oracleAdapter, withIndex('ix_t_child_owner_desc', 'owner DESC', true)).includes('CREATE UNIQUE INDEX ix_t_child_owner_desc ON t_child (owner)'), 'oracle: 유일 인덱스는 오름차순');
  assert.ok(statementsOf(oracleAdapter, withIndex('ix_t_child_owner_desc', 'owner DESC', false)).includes('CREATE INDEX ix_t_child_owner_desc ON t_child (owner DESC)'), 'oracle: 비유일 인덱스는 DESC 를 지킨다');
  // NULL 이 들지 않는 키는 '00' 이 생기지 않으므로 정렬 방향을 지킨다.
  assert.ok(statementsOf(oracleAdapter, withIndex('ix_t_child_id_desc', 'id DESC', true)).includes('CREATE UNIQUE INDEX ix_t_child_id_desc ON t_child (id DESC)'), 'oracle: NOT NULL 유일 인덱스는 DESC 를 지킨다');
});

/** 시험 스냅숏의 t_child 문자열 길이를 바꾸고 컬럼·인덱스를 더한다. CUBRID 그림자 키의 길이 한계를 본다. */
const withShadowShape = ({ lengths = {}, columns = [], indexes = [] }) => {
  const value = snapshot();
  for (const [name, length] of Object.entries(lengths)) value.columns.find(row => row.table_name === 't_child' && row.column_name === name).character_maximum_length = length;
  value.columns.push(...columns);
  value.indexes.push(...indexes.map(([name, body]) => ({ table_name: 't_child', name, definition: `CREATE UNIQUE INDEX ${name} ON public.t_child USING btree (${body})` })));
  return buildVendorModel({ snapshot: value, extras });
};

test('the CUBRID shadow key stops when a value could be longer than the cast that joins it', () => {
  // 그림자 키는 값을 VARCHAR(1100) 으로 바꿔 VARCHAR(2500) 에 잇는다. 더 길면 잘리거나 거부돼 끝 글자만 다른 두 값을 같게 보거나 정상 행을 막는다.
  assert.doesNotThrow(() => cubridAdapter.emitSchema(withShadowShape({ lengths: { url: 1100 } })), '한계 안의 유일 제약은 지금처럼 옮긴다');
  stopsWith(cubridAdapter, withShadowShape({ lengths: { url: 1101 } }), 'uk_t_child_owner_url: 그림자 키에 1100자를 넘을 수 있는 컬럼이 있어 유일성을 지켜 옮길 수 없다');
  stopsWith(cubridAdapter, withShadowShape({ columns: [column('t_child', 'memo', 'text', { position: 5 })], indexes: [['ix_t_child_owner_memo', 'owner, memo']] }),
    'ix_t_child_owner_memo: 그림자 키에 1100자를 넘을 수 있는 컬럼이 있어 유일성을 지켜 옮길 수 없다');
  // 컬럼마다 한계 안이어도 이은 키가 2500자를 넘을 수 있으면 멈춘다. 둘째 판은 길이 하나만 줄여 한계 안으로 들인다.
  const wide = note => withShadowShape({ lengths: { url: 1100, owner: 1100 }, columns: [varchar('t_child', 'note', note, { position: 5 })], indexes: [['ix_t_child_wide', 'url, owner, note']] });
  // 키 = 컬럼마다 '길이:값' 을 ':' 로 잇는다. 1100·1100·285 는 1105+1105+289+구분자 2 = 2501자, 284 면 2500자다.
  stopsWith(cubridAdapter, wide(285), 'ix_t_child_wide: 그림자 키가 2500자를 넘을 수 있어 유일성을 지켜 옮길 수 없다');
  assert.doesNotThrow(() => cubridAdapter.emitSchema(wide(284)), '이은 키가 2500자 안이면 옮긴다');
  // 숫자는 부호·앞의 0·소수점까지 센다. numeric(1,1) 의 -0.9 는 4자라 1100·1100·278 과 이으면 2501자다.
  const fraction = note => withShadowShape({ lengths: { url: 1100, owner: 1100 },
    columns: [varchar('t_child', 'note', note, { position: 5 }), { ...column('t_child', 'rate', 'numeric', { position: 6 }), numeric_precision: 1, numeric_scale: 1 }],
    indexes: [['ix_t_child_rate', 'url, owner, note, rate']] });
  stopsWith(cubridAdapter, fraction(278), 'ix_t_child_rate: 그림자 키가 2500자를 넘을 수 있어 유일성을 지켜 옮길 수 없다');
  assert.doesNotThrow(() => cubridAdapter.emitSchema(fraction(277)), '숫자를 넣어도 2500자 안이면 옮긴다');
});

test('a unique index a vendor could keep only by cutting its key or dropping its uniqueness stops the translation', () => {
  // 앞 768·700자 접두는 끝 글자만 다른 두 주소를 중복으로 거부하고, 인덱스를 빼거나 INCLUDE 로 옮기면 중복을 받는다.
  for (const [name, body] of [['ix_t_child_url_unique', 'url'], ['ix_t_child_url_owner', 'url, owner']]) {
    const unique = withIndex(name, body, true);
    for (const adapter of [mysqlAdapter, mariadbAdapter]) stopsWith(adapter, unique, `${name}: 접두로 자른 유일 인덱스는 앞부분이 같은 다른 값을 거부한다`);
    stopsWith(mssqlAdapter, unique, `${name}: 1700바이트를 넘는 유일 인덱스는 유일성을 지켜 옮길 수 없다`);
  }
  // 같은 정의의 비유일 판은 지금처럼 접두·뺌·INCLUDE 로 옮긴다.
  const single = withIndex('ix_t_child_url_unique', 'url', false);
  for (const adapter of [mysqlAdapter, mariadbAdapter]) assert.ok(statementsOf(adapter, single).includes('CREATE INDEX ix_t_child_url_unique ON t_child (url(768))'), `${adapter.id}: 비유일 단일 컬럼은 접두`);
  assert.ok(mssqlAdapter.emitSchema(single).degradations.some(row => row.name === 'ix_t_child_url_unique'), 'mssql: 비유일 단일 컬럼은 저하로 뺀다');
  const composite = withIndex('ix_t_child_url_owner', 'url, owner', false);
  for (const adapter of [mysqlAdapter, mariadbAdapter]) assert.ok(statementsOf(adapter, composite).includes('CREATE INDEX ix_t_child_url_owner ON t_child (url(700), owner)'), `${adapter.id}: 비유일 복합은 접두`);
  assert.ok(statementsOf(mssqlAdapter, composite).includes('CREATE INDEX ix_t_child_url_owner ON t_child (owner) INCLUDE (url)'), 'mssql: 비유일 복합은 INCLUDE');
  // 식 인덱스의 번역(계산 컬럼·함수 키)은 유일하지 않다. 유일 판을 그대로 옮기면 중복을 받는다.
  const trimmed = unique => withModelIndex({ name: 'ix_t_child_owner_trim', unique, columns: [{ name: 'owner', expression: 'trim' }] });
  for (const adapter of [mysqlAdapter, mariadbAdapter, mssqlAdapter]) {
    stopsWith(adapter, trimmed(true), 'ix_t_child_owner_trim: 식 유일 인덱스는 유일성을 지켜 옮기지 않는다');
    assert.doesNotThrow(() => adapter.emitSchema(trimmed(false)), `${adapter.id}: 비유일 식 인덱스는 지금처럼 옮긴다`);
  }
});

test('every removed asset and gate belongs to exactly one tool group shown before generating', () => {
  const ledger = loadVendorLedger(ROOT);
  const removed = readVendorAssetLedger(ROOT);
  const listed = ledger.removedPostgresTools.groups.flatMap(group => group.paths);
  assert.deepEqual([...listed].sort(), [...removed.assets, ...removed.gates.map(row => row.file)].sort());
  for (const group of ledger.removedPostgresTools.groups) assert.match(group.reason, /니다\.$/, group.label);
});

test('the plan notes say what a vendor changes in the heading alone, and PostgreSQL gets none', t => {
  const ledger = loadVendorLedger(ROOT);
  const oracle = ledger.vendors.find(vendor => vendor.id === 'oracle');
  const notes = vendorDegradationNotes(ledger, { database: { vendor: 'oracle' } });
  assert.deepEqual(notes.map(note => note.to), ['vendor:oracle:behavior', 'vendor:oracle:tools', 'vendor:oracle:image']);
  for (const row of oracle.notices.degradations) {
    assert.ok(notes[0].heading.includes(row.summary), row.kind);
    assert.ok(notes[0].reasons.some(reason => reason.reason === row.text), row.kind);
  }
  for (const group of ledger.removedPostgresTools.groups) assert.ok(notes[1].heading.includes(group.label), group.label);
  assert.equal(notes[2].heading, oracle.notices.image);
  assert.ok(/라이선스/.test(notes[2].heading) && /개발용/.test(notes[2].heading));
  assert.deepEqual(vendorDegradationNotes(ledger, { database: { vendor: 'postgresql' } }), []);
  assert.deepEqual(vendorDegradationNotes(ledger, {}), []);
  // 엔진 응답. PostgreSQL 계획은 기능 저하만 그대로 둔다.
  const catalog = loadProjectComposerCatalog(ROOT);
  const engine = createComposerEngine({ loadCatalog: () => catalog, loadVendors: () => loadVendorLedger(ledgerCopy(t, certify('oracle'))) });
  const recipe = vendor => ({ schemaVersion: 1, project: { name: 'vendorcheck' }, sourceRef: 'HEAD', selection: { preset: 'demo' }, database: { vendor }, backendLayout: 'multi-module' });
  withPreviewEnv(undefined, () => {
    const [postgres, opened] = [engine.plan(recipe('postgresql')), engine.plan(recipe('oracle'))];
    assert.ok(postgres.degradationNotes.every(note => !note.vendor), 'PostgreSQL 계획에 벤더 안내가 없다');
    assert.deepEqual(opened.degradationNotes.filter(note => note.vendor), notes);
    assert.deepEqual(opened.degradationNotes.filter(note => !note.vendor), postgres.degradationNotes);
    assert.deepEqual(opened.degraded, postgres.degraded, '구성의 저하 값은 벤더로 바뀌지 않는다');
  });
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

test('the preview switch opens the tool path only: the screen path keeps reading the ledger', t => {
  const catalog = loadProjectComposerCatalog(ROOT);
  const recipe = { schemaVersion: 1, project: { name: 'vendorcheck' }, sourceRef: 'HEAD', selection: { preset: 'core' }, database: { vendor: 'mysql' }, backendLayout: 'multi-module' };
  // 승격 전 원장을 준다. 실제 원장의 MySQL 은 인증돼 있어 스위치 없이도 열린다.
  const engine = createComposerEngine({ loadCatalog: () => catalog, loadVendors: () => loadVendorLedger(ledgerCopy(t, () => {})) });
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
  assert.equal(renderFlywayMigration([{ sql: 'CREATE TABLE t (id NUMBER)' }, { sql: 'BEGIN NULL; END;', raw: true }], 'oracle'),
    'CREATE TABLE t (id NUMBER);\nBEGIN NULL; END;\n/\n');
  // MySQL 계열은 슬래시가 문법 오류다. 트리거 본문의 세미콜론이 문장을 끊지 않게 대상 DB 대조의 클라이언트 배치와 같은 구분자로 감싼다.
  const trigger = "CREATE TRIGGER tr_a BEFORE UPDATE ON t FOR EACH ROW BEGIN SIGNAL SQLSTATE '55000' SET MESSAGE_TEXT = 'append-only t'; END";
  for (const vendor of ['mysql', 'mariadb']) {
    assert.equal(renderFlywayMigration([{ sql: 'CREATE TABLE t (id INT)' }, { sql: trigger, raw: true }, { sql: 'INSERT INTO t VALUES (1)' }], vendor),
      `CREATE TABLE t (id INT);\nDELIMITER $$\n${trigger}$$\nDELIMITER ;\nINSERT INTO t VALUES (1);\n`, vendor);
  }
  assert.throws(() => renderFlywayMigration([{ sql: 'x', raw: true }], 'cubrid'), /블록 문장을 끝낼 형식이 없는 벤더: cubrid/);
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
  // 원본은 벤더마다 시험 드라이버 줄을 둔다. 고른 벤더의 줄은 런타임 드라이버와 겹치고 다른 벤더의 줄은 쓰지 않으므로 모두 뺀다.
  const allDrivers = build.replace(/(testRuntimeOnly 'com\.oracle[^\n]*\n)/, "$1    testRuntimeOnly 'org.mariadb.jdbc:mariadb-java-client:3.5.11'\n    testRuntimeOnly 'com.mysql:mysql-connector-j:26.10.0'\n");
  for (const vendor of ['oracle', 'mysql', 'mariadb']) {
    const result = projectVendorBuild(allDrivers, vendor);
    assert.doesNotMatch(result, /testRuntimeOnly|vendorIntegrationTest/, vendor);
    assert.match(result, new RegExp(`^ {4}implementation '${VENDOR_SOURCE[vendor].flywayPlugin}'\\n {4}runtimeOnly '${VENDOR_SOURCE[vendor].driverCoordinate}'\\n {4}testImplementation libs\\.h2\\n`, 'm'), vendor);
  }
  assert.equal(VENDOR_SOURCE.mysql.flywayPlugin, 'org.flywaydb:flyway-mysql');
  assert.equal(VENDOR_SOURCE.mariadb.flywayPlugin, 'org.flywaydb:flyway-mysql');
  // 시험 드라이버는 원본 빌드 파일에 실제로 있는 그 줄이어야 지울 수 있다. 원본 빌드의 줄은 소스 투영 값과 같은 판이다.
  const source = readFileSync(join(ROOT, 'api-server/build.gradle'), 'utf8').replace(/\r\n/g, '\n');
  assert.doesNotMatch(projectVendorBuild(source, 'mysql'), /testRuntimeOnly '(?:com\.oracle|org\.mariadb|com\.mysql)/, '원본 빌드의 벤더 시험 드라이버 줄이 모두 빠진다');
  for (const line of source.match(/^ *testRuntimeOnly '(?:com\.oracle|org\.mariadb|com\.mysql)[^']*'$/gm) ?? []) {
    assert.ok(Object.values(VENDOR_SOURCE).some(vendor => line.includes(`'${vendor.driverCoordinate}'`)), `원본 시험 드라이버의 판이 소스 투영 값과 다르다: ${line.trim()}`);
  }
});

test('the CUBRID driver repository reaches only a CUBRID project, as a top-level repository for the runtime driver', () => {
  const cubrid = VENDOR_SOURCE.cubrid;
  const repository = `maven { url = uri('${cubrid.driverRepository.url}'); content { includeGroup '${cubrid.driverRepository.group}' } }`;
  assert.deepEqual(cubrid.driverRepository, { url: 'https://maven.cubrid.org', group: 'cubrid' }, 'Central 밖 저장소는 cubrid 그룹으로 좁힌다(2026-11-05 사용자 결정)');
  assert.equal(cubrid.driverCoordinate.split(':')[0], cubrid.driverRepository.group);
  assert.equal(cubrid.flywayPlugin, 'org.flywaydb:flyway-database-cubrid:10.26.0');
  // 원본은 벤더 통합 시험 블록 안에만 저장소와 시험 드라이버를 둔다. 그 줄이 투영이 지우는 모양이고 판이 소스 투영 값과 같아야 지운 뒤 같은 드라이버가 된다.
  const source = readFileSync(join(ROOT, 'api-server/build.gradle'), 'utf8').replace(/\r\n/g, '\n');
  const integrationBlock = source.slice(source.indexOf("if (project.hasProperty('vendorIntegration'))"));
  assert.ok(integrationBlock.includes(`\n    repositories { ${repository} }\n    dependencies { testRuntimeOnly '${cubrid.driverCoordinate}' }\n`), '원본의 CUBRID 줄이 투영이 아는 모양과 판이다');
  assert.equal(source.split('maven.cubrid.org').length - 1, 1, '원본의 CUBRID 저장소는 통합 시험 블록의 한 줄뿐이다');

  for (const vendor of Object.keys(VENDOR_SOURCE)) {
    const projected = projectVendorBuild(source, vendor);
    assert.doesNotMatch(projected, /testRuntimeOnly 'cubrid:/, `${vendor}: 시험 드라이버 줄은 남지 않는다`);
    assert.doesNotMatch(projected, /Maven Central 에 없다\. cubrid 그룹만/, `${vendor}: 지운 줄의 주석도 남지 않는다`);
    assert.match(projected, /if \(project\.hasProperty\('vendorIntegration'\)\) \{\n {4}\/\/ 생성물의 번역 기준선을/, `${vendor}: 통합 시험 블록의 나머지는 그대로다`);
    if (vendor !== 'cubrid') {
      assert.doesNotMatch(projected, /maven\.cubrid\.org|cubrid:cubrid-jdbc/, `${vendor}: 다른 벤더 프로젝트에는 CUBRID 저장소·드라이버가 없다`);
      continue;
    }
    // CUBRID 프로젝트는 운영 드라이버를 받아야 하므로 저장소를 최상위에 둔다. 통합 시험 블록 안의 저장소는 평소 빌드에 보이지 않는다.
    assert.match(projected, new RegExp(`^ {4}runtimeOnly '${cubrid.driverCoordinate.replaceAll('.', '\\.')}'$`, 'm'), '운영 드라이버로 바뀐다');
    assert.match(projected, new RegExp(`^ {4}implementation '${cubrid.flywayPlugin.replaceAll('.', '\\.')}'$`, 'm'));
    assert.match(projected, /^plugins \{\n[\s\S]*?^\}\n\n\/\/ cubrid JDBC 드라이버는 Maven Central 에 없다\. 그 그룹만 이 저장소에서 받는다\.\nrepositories \{\n {4}maven \{ url = uri\('https:\/\/maven\.cubrid\.org'\); content \{ includeGroup 'cubrid' \} \}\n\}\n\ndependencies \{/m);
    assert.equal(projected.split('maven.cubrid.org').length - 1, 1);
    assert.doesNotMatch(projected, /flyway-database-postgresql|libs\.postgresql\b/, 'PostgreSQL 드라이버·플러그인이 남지 않는다');
  }
  // 단일모듈은 루트 빌드 파일이다. buildscript 뒤의 plugins 블록 다음에 둔다.
  const single = "buildscript {\n    dependencies {\n    }\n}\n\nplugins {\n    id 'java'\n}\n\nallprojects {\n    repositories {\n        mavenCentral()\n    }\n}\n"
    + "// Dependencies originally declared by api-server.\ndependencies {\n    implementation 'org.flywaydb:flyway-database-postgresql'\n    implementation libs.postgresql\n}\n";
  assert.equal(projectVendorBuild(single, 'cubrid'), single.replace("    id 'java'\n}\n", `    id 'java'\n}\n\n// cubrid JDBC 드라이버는 Maven Central 에 없다. 그 그룹만 이 저장소에서 받는다.\nrepositories {\n    ${repository}\n}\n`)
    .replace("implementation 'org.flywaydb:flyway-database-postgresql'", `implementation '${cubrid.flywayPlugin}'`).replace('implementation libs.postgresql', `runtimeOnly '${cubrid.driverCoordinate}'`));
  // 지울 자리를 못 찾으면(원본 줄 모양이 바뀌면) 다른 벤더 프로젝트에 저장소가 새지 않게 멈춘다. 둘 자리가 없어도 멈춘다.
  const reshaped = source.replace(`    repositories { ${repository} }\n`, `    repositories {\n        ${repository}\n    }\n`);
  assert.throws(() => projectVendorBuild(reshaped, 'oracle'), /maven\.cubrid\.org 저장소 줄 1개/);
  assert.throws(() => projectVendorBuild(source.replace(/^plugins \{/m, 'plugins  {'), 'cubrid'), /JDBC 드라이버 저장소/);
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
  // CUBRID 는 표 메타를 표마다 읽어야 Hibernate validate 가 표를 찾는다. UUID 매핑과 생성 키는 방언이 맡아 설정에 두지 않는다.
  const cubrid = vendorApplicationDocument('cubrid');
  assert.ok(cubrid.endsWith('      hibernate:\n        dialect: nuri.foundation.core.persistence.NuriCubridDialect\n        hbm2ddl:\n          jdbc_metadata_extraction_strategy: individually\n'), cubrid);
  assert.match(cubrid, /^ {4}vendor: cubrid$/m);
  assert.doesNotMatch(cubrid, /uuid|use_get_generated_keys/i);
  for (const vendor of ['oracle', 'mysql', 'mariadb', 'mssql']) assert.doesNotMatch(vendorApplicationDocument(vendor), /hbm2ddl|extraction_strategy/, vendor);
  // 드라이버가 현재 스키마를 답하지 않아 Flyway 이력 표의 스키마를 접속 계정으로 준다. 시험의 Flyway 적용도 같은 값이다(엔진 환경).
  assert.match(cubrid, /^ {2}flyway:\n(?: {4}.+\n)* {4}default-schema: \$\{spring\.datasource\.username\}$/m);
  assert.equal(VENDOR_ENGINES.cubrid.integration.environment.VENDOR_FLYWAY_DEFAULT_SCHEMA, VENDOR_ENGINES.cubrid.integration.username);
  for (const vendor of ['oracle', 'mysql', 'mariadb', 'mssql']) assert.doesNotMatch(vendorApplicationDocument(vendor), /default-schema/, vendor);
  // 통합 시험도 같은 값으로 돈다(엔진의 SPRING_APPLICATION_JSON).
  const [[group, key, value]] = VENDOR_SOURCE.cubrid.hibernateProperties;
  assert.equal(JSON.parse(VENDOR_ENGINES.cubrid.integration.environment.SPRING_APPLICATION_JSON)[`spring.jpa.properties.hibernate.${group}.${key}`], value);
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

test('the vendor folder takes only migrations after the baseline, compared the way Flyway compares versions', () => {
  assert.deepEqual(vendorMigrationNameProblems(['V1_0__vendor_baseline.sql', 'V1_1__extra.sql', 'V1_10__more.sql', 'V2_0__next.sql', 'V1_0_1__patch.sql', 'V1_0_0_1__deep.sql', 'V1.2__dotted.sql', 'V2__major.sql', 'notes.txt']), []);
  const lower = ['R__repeat.sql', 'V0_9__before.sql', 'V1_0__other.sql', 'V1_0_0__same.sql', 'V1__same.sql', 'V0_0_1__before.sql', 'U1_1__undo.sql', 'V1_1_no_separator.sql'];
  assert.deepEqual(vendorMigrationNameProblems(lower), lower);
  assert.equal(VENDOR_BASELINE_VERSION, '1.0');
  assert.match(vendorBaselinePaths('oracle').migration, /\/V1_0__vendor_baseline\.sql$/, '기준선 버전은 파일 이름과 같다');
});

test('the baseline and the input are compared with the source lock before a container starts', () => {
  const root = mkdtempSync(join(tmpdir(), 'vendor-lock-'));
  const migration = 'api-server/src/main/resources/db/vendor/oracle/V1_0__vendor_baseline.sql';
  const input = 'config/vendor/oracle/vendor-input.json';
  try {
    assert.deepEqual(vendorLockProblems(root, 'oracle'), ['reusable-base-lock.json 이 없어 번역 기준선을 대조하지 못한다. 벤더 생성물에서 돌린다'], '잠금이 없으면 통과가 아니다');
    mkdirSync(join(root, dirname(migration)), { recursive: true });
    mkdirSync(join(root, dirname(input)), { recursive: true });
    writeFileSync(join(root, migration), 'CREATE TABLE tb_a (id NUMBER(10));\r\n');
    writeFileSync(join(root, input), '{"snapshot":{}}\n');
    const lock = { vendorProjection: { vendor: 'oracle', migration, input, migrationSha256: artifactTextSha256(root, migration), inputSha256: artifactTextSha256(root, input) } };
    const writeLock = value => writeFileSync(join(root, 'reusable-base-lock.json'), JSON.stringify(value));
    writeLock(lock);
    assert.deepEqual(vendorLockProblems(root, 'oracle'), []);
    assert.match(vendorLockProblems(root, 'mysql')[0], /벤더\(oracle\)가 mysql 가 아니다/);
    writeFileSync(join(root, dirname(migration), 'V1_1__later.sql'), 'ALTER TABLE tb_a ADD nm VARCHAR2(10 CHAR);\n');
    assert.deepEqual(vendorLockProblems(root, 'oracle'), [], '기준선 뒤의 V 파일은 잠금과 무관하다');
    writeFileSync(join(root, migration), 'CREATE TABLE tb_a (id NUMBER(10));\n');
    assert.deepEqual(vendorLockProblems(root, 'oracle'), [], '줄 끝만 다른 것은 변경이 아니다');
    writeFileSync(join(root, migration), 'CREATE TABLE tb_a (id NUMBER(19));\n');
    assert.deepEqual(vendorLockProblems(root, 'oracle'), [`번역 기준선(${migration})이 생성 때와 다르다`]);
    writeFileSync(join(root, migration), 'CREATE TABLE tb_a (id NUMBER(10));\n');
    writeFileSync(join(root, input), '{"snapshot":{"x":1}}\n');
    assert.deepEqual(vendorLockProblems(root, 'oracle'), [`번역 입력(${input})이 생성 때와 다르다`]);
    rmSync(join(root, input));
    assert.deepEqual(vendorLockProblems(root, 'oracle'), [`번역 입력(${input})이 없다`], '지운 입력은 ENOENT 가 아니라 문제로 돌아온다');
    rmSync(join(root, migration));
    assert.deepEqual(vendorLockProblems(root, 'oracle'), [`번역 기준선(${migration})이 없다`, `번역 입력(${input})이 없다`]);
    assert.throws(() => assertVendorLock('oracle', root), error => error.code === 'VENDOR_INTEGRATION_FAILED' && /이 없다.*고치거나 지운 파일을 되돌린다/.test(error.message));
    writeLock({ profile: 'core' });
    assert.match(vendorLockProblems(root, 'oracle')[0], /벤더\(없음\)가 oracle 가 아니다/, 'PostgreSQL 생성물의 잠금에는 투영이 없다');
  } finally {
    rmSync(root, { recursive: true, force: true });
  }
  const source = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  const start = source.indexOf('export function runVendorIntegration');
  assert.ok(source.indexOf('assertVendorLock(vendorId)', start) > 0 && source.indexOf('assertVendorLock(vendorId)', start) < source.indexOf('startVendorEngine(engine', start), '컨테이너를 띄우기 전에 본다');
  assert.ok(source.indexOf('assertVendorLock(vendorId)', start) < source.indexOf('readFileSync(inputFile', start) && source.indexOf('readFileSync(inputFile', start) < source.indexOf('startVendorEngine(engine', start), '지운 입력이 잠금 대조의 문구로 끝나게 대조 뒤에 읽는다');
  assert.doesNotMatch(source, /readFileSync\(args\.input/, '명령 입구에서 읽으면 잠금 대조보다 앞선다');
});

test('the host cannot switch off Hibernate validate, and the report carries what the contexts really used', () => {
  const { integration } = VENDOR_ENGINES.oracle;
  const child = childEnvironment('oracle', integration, { port: 1, password: 'x', owner: 'y' }, { EXTRA: '1' }, { SPRING_JPA_HIBERNATE_DDL_AUTO: 'none', PATH: 'p' });
  assert.equal(child.SPRING_JPA_HIBERNATE_DDL_AUTO, 'validate');
  assert.equal(child.PATH, 'p');
  assert.equal(child.EXTRA, '1');
  const source = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  assert.doesNotMatch(source, /\.\.\.process\.env, \.\.\.integrationEnvironment/, '자식 환경은 한 곳에서 만든다');
  assert.deepEqual(appliedHibernateCheck('A validate\nB validate\n'), { ddlAuto: 'validate', contexts: 2 });
  assert.deepEqual(appliedHibernateCheck('A validate\r\nB none\r\n'), { ddlAuto: null, contexts: 2 }, '값이 갈리면 통과로 읽히지 않는다');
  assert.deepEqual(appliedHibernateCheck('A none\n'), { ddlAuto: 'none', contexts: 1 });
  assert.deepEqual(appliedHibernateCheck(''), { ddlAuto: null, contexts: 0 }, '단언한 문맥이 없으면 증거가 아니다');
  const extension = readFileSync(join(ROOT, 'api-server/src/test/java/nuri/api/schema/VendorOwnershipExtension.java'), 'utf8');
  // 판정 자체는 SchemaConformanceRulesTest 가 DB 없이 붉힌다. 여기서는 확장이 그 판정을 Hibernate 가 받은 설정 전체에 걸고 그 결과를 남기는지 본다.
  assert.match(extension, /^ *SchemaCheck check = schemaCheck\(factory\.getProperties\(\), /m, '프로필 문자열이나 hbm2ddl.auto 하나가 아니라 Hibernate 가 받은 설정 전체로 적용 동작을 구한다');
  assert.match(extension, /ActionGrouping\.interpret\(contributors, settings\)/, '우선순위는 Hibernate 자신의 해석기로 정한다');
  assert.match(extension, /testClass\.getSimpleName\(\) \+ " " \+ check\.reported\(\)/, '보고서에는 판정을 거친 적용 동작을 남긴다');
  assert.match(extension, /^ *if \(!check\.problems\(\)\.isEmpty\(\)\) \{\s*throw new IllegalStateException\("Hibernate 스키마 검사가/m, 'validate 검증이 그대로 돌지 않으면 그 시험 클래스가 붉다');
});

test('the Flyway steps hand the child only the target the tool chose, so the second step applies every later migration', () => {
  const { integration } = VENDOR_ENGINES.oracle;
  const host = { PATH: 'p', VENDOR_FLYWAY_TARGET: '1.1', Vendor_Flyway_Target: '1.1', VENDOR_TEST_OWNER: 'host' };
  const targets = env => Object.entries(env).filter(([key]) => key.toUpperCase() === 'VENDOR_FLYWAY_TARGET');
  const rest = flywayEnvironment('oracle', integration, { port: 1, password: 'x' }, 'classpath:db/vendor/oracle', undefined, host);
  assert.deepEqual(targets(rest), [], '나머지를 적용하는 호출은 호스트의 target 을 표기와 상관없이 키째 지운다');
  assert.equal(rest.VENDOR_FLYWAY_LOCATION, 'classpath:db/vendor/oracle');
  assert.equal(rest.VENDOR_TEST_OWNER, '', '적용 단계에는 소유 토큰을 넘기지 않는다');
  assert.equal(rest.PATH, 'p');
  const baseline = flywayEnvironment('oracle', integration, { port: 1, password: 'x' }, 'classpath:db/vendor/oracle', VENDOR_BASELINE_VERSION, host);
  assert.deepEqual(targets(baseline), [['VENDOR_FLYWAY_TARGET', VENDOR_BASELINE_VERSION]], '기준선 호출은 도구의 기준선 버전 하나만 넘긴다');
  assert.deepEqual(targets(host), [['VENDOR_FLYWAY_TARGET', '1.1'], ['Vendor_Flyway_Target', '1.1']], '호스트 환경은 고치지 않는다');
  const tool = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  const migrate = tool.slice(tool.indexOf('function migrateWithFlyway'), tool.indexOf('export function conformanceCatalog'));
  assert.match(migrate, /env: flywayEnvironment\(vendorId, integration, handle, location, target\)/, 'Flyway 단계의 자식 환경은 한 곳에서 만든다');
  assert.doesNotMatch(migrate, /childEnvironment\(/);
  const java = readFileSync(join(ROOT, 'api-server/src/test/java/nuri/api/schema/VendorFlywayMigrate.java'), 'utf8');
  assert.match(java, /^ *\.filter\(info -> info\.getState\(\)\.isResolved\(\) && !info\.getState\(\)\.isApplied\(\)\)/m,
    '나머지 적용 뒤 pending 뿐 아니라 target 위에 남은 마이그레이션도 남지 않았는지 본다');
  assert.match(java, /^ *if \(!unapplied\.isEmpty\(\)\) \{\s*throw new IllegalStateException\("기준선 뒤 마이그레이션이 적용되지 않고 남았다/m);
  // target 이 새면 Java 는 두 번째 호출을 기준선 단계로 받는다. 그때 기준선 뒤 파일 하나가 적용돼도 통과하지 않게 DB 에 남은 것 전부를 센다.
  assert.match(java, /^ *if \(applied != 1 \|\| inDatabase\.size\(\) != 1\) \{\s*throw new IllegalStateException\("번역 기준선 하나만 적용돼야 한다/m,
    '기준선 단계는 이번 적용 수와 함께 DB 에 적용된 마이그레이션이 기준선 하나뿐인지 본다');
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
  const output = readUniqueSignatures({}, 'oracle', () => ({ errors: [], sections: new Map([[0, ['tb_a.uk_keep=10', '  tb_a.sys_c0012=11  ', 'tb_a.uk_on_plain_index=a#b']]]) }));
  assert.deepEqual(output, ['tb_a.uk_keep=10', 'tb_a.sys_c0012=11', 'tb_a.uk_on_plain_index=a#b'], '일반 인덱스로 집행되는 제약은 컬럼 목록이 값이다');
  assert.throws(() => readUniqueSignatures({}, 'oracle', () => ({ errors: [], sections: new Map([[0, ['garbage line']]]) })), /유니크 서명 조회의 줄을 해석하지 못했다: garbage line/);
  assert.match(VENDOR_UNIQUE_SIGNATURES.oracle, /constraint_type = 'U' AND i\.uniqueness = 'NONUNIQUE'/, '일반 인덱스로 집행되는 유니크 제약도 서명에 든다');
  assert.throws(() => readUniqueSignatures({}, 'tibero', () => ({ errors: [], sections: new Map() })), /유니크 서명 조회가 없다/);
  assert.throws(() => readUniqueSignatures({}, 'oracle', () => ({ errors: [{ error: 'ORA-00942' }], sections: new Map() })), /유니크 서명 조회 실패: ORA-00942/);
});

test('the MySQL family signs a unique with its sorted key list, and its session prefix keeps the marker', () => {
  const prefixes = [];
  const answer = lines => (_, statements, options) => { prefixes.push(options.sessionPrefix); return { errors: [], sections: new Map([[0, lines]]) }; };
  // 2026-11-04 MySQL 8.4 실측 줄: 복합 키는 '#' 로, 접두는 '$' 로, 함수 키 부분은 식의 해시로 나온다.
  assert.deepEqual(readUniqueSignatures({}, 'mysql', answer(['m6_a.ux_m6_a_zy=y#z', 'm6_a.uq_m6_a_w=w$768', 'm6_a.primary=id', 'm6_a.ux_m6_a_fn=expr_57cfb0cbf690', '@@COMPLETED'])),
    ['m6_a.ux_m6_a_zy=y#z', 'm6_a.uq_m6_a_w=w$768', 'm6_a.primary=id', 'm6_a.ux_m6_a_fn=expr_57cfb0cbf690']);
  assert.deepEqual(readUniqueSignatures({}, 'mariadb', answer(['m6_a.ux_m6_a_name=name#other', 'm6_b.ux_m6_b_long=longv'])), ['m6_a.ux_m6_a_name=name#other', 'm6_b.ux_m6_b_long=longv']);
  // 세미콜론 없는 접두(SET LINESIZE 4000)는 mysql 클라이언트가 다음 표식 줄과 한 문장으로 읽어 표식이 사라진다(2026-11-04 실측 1064).
  assert.deepEqual(prefixes, [['SET SESSION group_concat_max_len = 1048576;'], ['SET SESSION group_concat_max_len = 1048576;']]);
  prefixes.length = 0;
  readUniqueSignatures({}, 'oracle', answer(['tb_a.uk_keep=10']));
  assert.deepEqual(prefixes, [['SET LINESIZE 4000']], 'Oracle 접두는 그대로다');
  assert.throws(() => readUniqueSignatures({}, 'mysql', answer(['m6_a.ux=upper(`y`)'])), /유니크 서명 조회의 줄을 해석하지 못했다/);
  // 인덱스 ID 는 표 재빌드마다 바뀌어(실측) 서명이 아니다. 키 목록·접두·식 해시가 값이다.
  assert.match(VENDOR_UNIQUE_SIGNATURES.mysql, /IF\(s\.sub_part IS NULL, '', CONCAT\('\$', s\.sub_part\)\)/);
  assert.match(VENDOR_UNIQUE_SIGNATURES.mysql, /LEFT\(SHA2\(s\.expression, 256\), 12\)/);
  assert.doesNotMatch(`${VENDOR_UNIQUE_SIGNATURES.mysql}${VENDOR_UNIQUE_SIGNATURES.mariadb}`, /INDEX_ID|INNODB_/i);
});

test('the CI vendor job is a certification condition and only opens a vendor whose integration engine exists', () => {
  const ledger = JSON.parse(readFileSync(join(ROOT, 'config/db-vendors.json'), 'utf8'));
  // 단계 5-1 은 CUBRID 의 벤더 잡을 승격 전(preview)에 열었고, 5-2 가 main 의 벤더 잡 통과 뒤 증거를 기록해 올렸다(DEC-OPS-400·402).
  assert.deepEqual(ledger.vendors.filter(vendor => vendor.ci).map(vendor => vendor.id), ['oracle', 'mariadb', 'mysql', 'mssql', 'cubrid']);
  assert.equal(ledger.vendors.find(vendor => vendor.id === 'cubrid').status, 'certified');
  const gate = JSON.parse(readFileSync(join(ROOT, 'config/governance/gates.json'), 'utf8')).gateSets.find(set => set.id === 'GATESET-VENDOR-CONFORMANCE');
  assert.equal(gate.requiredCiContext, 'backend-build', '카탈로그 게이트가 required 잡에서 돌아야 승격할 수 있다');
  const certifiedRow = ledger.vendors.find(vendor => vendor.id === 'oracle');
  const load = mutate => {
    const copy = asPreviewVendors(JSON.parse(JSON.stringify(ledger)));
    mutate(copy.vendors.find(vendor => vendor.id === certifiedRow.id), copy);
    const root = mkdtempSync(join(tmpdir(), 'vendor-ci-'));
    try {
      mkdirSync(join(root, 'config'));
      writeFileSync(join(root, 'config/db-vendors.json'), JSON.stringify(copy));
      return loadVendorLedger(root);
    } finally { rmSync(root, { recursive: true, force: true }); }
  };
  assert.throws(() => load(vendor => { vendor.status = 'certified'; delete vendor.ci; }), /oracle: CI 벤더 잡\(ci\)이 없다/);
  // 어댑터가 있는 벤더는 모두 통합 엔진을 연다. 엔진이 없는 벤더(Tibero)를 켜면 잡이 늘 실패한다.
  assert.throws(() => load((_, copy) => { copy.vendors.find(vendor => vendor.id === 'tibero').ci = true; }), /tibero: ci 는 통합 시험 엔진이 있는 벤더의 true 만 쓴다/);
  assert.throws(() => load(vendor => { vendor.ci = 'yes'; }), /oracle: ci 는 통합 시험 엔진이 있는 벤더의 true 만 쓴다/);
});

test('the vendor CI entry generates the representative preset and leaves the PostgreSQL recipes as they were', () => {
  const sourceRef = 'a'.repeat(40);
  const recipe = args => composerVerificationRecipe({ sourceRef, preset: 'demo', ...args });
  assert.deepEqual(recipe({ layout: 'multi-module' }), { schemaVersion: 1, project: { name: 'composer-multi-module' }, sourceRef,
    selection: { domains: ['mail', 'schedule'] }, database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });
  assert.deepEqual(recipe({ layout: 'single-module' }), { schemaVersion: 1, project: { name: 'composer-single-module' }, sourceRef,
    selection: { domains: ['board', 'survey'] }, database: { vendor: 'postgresql' }, backendLayout: 'single-module' });
  assert.deepEqual(recipe({ layout: 'multi-module', vendor: 'oracle' }), { schemaVersion: 1, project: { name: 'composer-oracle-multi-module' }, sourceRef,
    selection: { preset: 'demo' }, database: { vendor: 'oracle' }, backendLayout: 'multi-module' });
  assert.deepEqual(parseComposerVerificationArgs(['--layout', 'single-module']), { layout: 'single-module', vendor: undefined });
  assert.deepEqual(parseComposerVerificationArgs(['--layout', 'multi-module', '--vendor', 'oracle']), { layout: 'multi-module', vendor: 'oracle' });
  for (const bad of [[], ['--layout'], ['--vendor', 'oracle'], ['--layout', 'multi-module', '--engine', 'oracle19'], ['--layout', 'multi-module', '--vendor']]) {
    assert.throws(() => parseComposerVerificationArgs(bad), /Usage: verify-project-composer/, bad.join(' '));
  }
});

test('the baseline is compared before anything else is applied, and the catalog test runs before the fixtures', () => {
  const source = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  const start = source.indexOf('export function runVendorIntegration');
  const order = ['migrateWithFlyway(vendorId, integration, handle, migrate, flyway, VENDOR_BASELINE_VERSION)', 'assertVendorApplied(handle, input, vendorId',
    'const baseline = conformanceCatalog', 'const baselineUniques = readUniqueSignatures', 'const baselineByteColumns = readByteColumns', 'migrateWithFlyway(vendorId, integration, handle, migrate, flyway);', 'unchangedUniques(baselineUniques', 'byteColumns: addedByteColumns(baselineByteColumns', 'runVendorConformance(vendorId', 'runAsAdministrator(handle', 'markOwner(handle)'];
  const positions = order.map(text => source.indexOf(text, start));
  assert.ok(positions.every(position => position > 0), '순서를 보는 문장이 사라졌다');
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right), '기준선 정확 대조는 나머지 적용 앞, 카탈로그 시험은 권한 부여와 소유 표시 앞이다');
  const migrate = readFileSync(join(ROOT, 'api-server/src/test/java/nuri/api/schema/VendorFlywayMigrate.java'), 'utf8');
  assert.match(migrate, /applied != 1/, '기준선 단계는 하나만 적용됐는지 본다');
});

// CI 벤더 잡은 정상 경로만 돌리므로 호출이 빠져도 잡이 붉지 않는다. 판정 함수의 시험은 실행 경로에 이어졌는지 보지 못한다.
test('the verdicts stay wired into the run the CI job takes', () => {
  const tool = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  assert.match(tool, /^ *if \(ddlAuto !== 'validate'\) \{\s*failure = new Error\(`Hibernate validate/m, '단언한 문맥이 없거나 값이 다르면 실행이 실패한다');
  const verify = readFileSync(join(ROOT, 'scripts/project-composer-vendor-verify.mjs'), 'utf8');
  const applied = verify.slice(verify.indexOf('export function assertVendorApplied'), verify.indexOf('export function applyVendor'));
  assert.match(applied, /^ *if \(uniqueColumns\) assertUniqueColumns\(emission, uniqueColumns, \{ ignoreTables \}\);/m, '기준선 대조가 키·유니크의 컬럼을 본다');
  assert.match(applied, /^ *const behindSequences = sequenceNext \? expectedNext\.sequences\.filter\(/m, '기준선 대조가 시퀀스의 다음 값을 본다');
  assert.match(applied, /^ *if \(behindSequences\.length\) \{[\s\S]*?throw error;/m, '시퀀스의 다음 값이 뒤처지면 멈춘다');
  const catalog = readFileSync(join(ROOT, 'api-server/src/test/java/nuri/api/harness/VendorCatalogConformanceTest.java'), 'utf8');
  assert.match(catalog, /^ *if \(oracle\) \{\s*addOracleConstraintsOnPlainIndexes\(connection, uniques\);/m, '일반 인덱스로 집행되는 유니크 제약도 미러 규칙이 본다');
  assert.match(catalog, /^ *List<String> problems = new ArrayList<>\(SchemaConformanceRules\.tableProblems\(/m, '표의 저장 표기 규칙이 돈다');
  assert.match(catalog, /^ *report\("바이트 길이 컬럼과 엔티티 길이의 불일치", SchemaConformanceRules\.byteLengthProblems\(/m, '바이트 길이 규칙이 돈다');
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
  assert.equal(integrationEnvironment('oracle', VENDOR_ENGINES.oracle.integration, { port: 1, password: 'x', owner: 'y' }).SPRING_JPA_HIBERNATE_DDL_AUTO, 'validate', '벤더 실행은 validate 를 강제한다');
});

test('the README procedure names a command that exists and what it does not cover', () => {
  const ledger = loadVendorLedger(ROOT);
  const readme = vendorReadme('oracle', ledger);
  for (const row of ledger.vendors.find(vendor => vendor.id === 'oracle').notices.degradations) assert.ok(readme.includes(`- ${row.text}`), `README 에 저하가 없다: ${row.kind}`);
  for (const group of ledger.removedPostgresTools.groups) assert.ok(readme.includes(group.label), group.label);
  assert.ok(readme.includes(`npm run ${VENDOR_SCHEMA_ALIAS}`));
  assert.match(readme, /db\/vendor\/oracle/);
  assert.match(readme, /V1_1__/);
  for (const limit of ['파괴적 DDL', '명명 예외', 'CHECK·트리거', '새 권한 코드', '새 Java 소스', '제약·인덱스·시퀀스·컬럼·뷰의 저장 표기']) assert.ok(readme.includes(limit), limit);
  // §6.1 의 Oracle 한계 가운데 도입자가 스키마를 바꿀 때 닿는 둘(설계서 §6.1 이 복구 절차를 이 절로 가리킨다).
  assert.match(readme, /^4\. Oracle 은 DDL 이 자동 커밋이라 `V` 파일이 중간에 실패하면 .*Flyway 이력의 실패 행이 남고.*`repair`.*`npm run verify:vendor-schema` 로 일회용 DB 에서 먼저 돌린다\.$/m,
    'DDL 자동 커밋 뒤 반쯤 남은 스키마의 복구를 안내한다');
  assert.match(readme, /^- CLOB 컬럼의 비교·정렬: .*`=`·`DISTINCT`·`ORDER BY`·`GROUP BY`·인덱스를 쓸 수 없다\./m, 'CLOB 의 비교·정렬 제한을 안내한다');
  assert.match(readme, /인증이 아니다/);
  // 첫 단계는 거버넌스의 소스 결속 검사다. 벤더 인증 원장의 증거는 생성물에서 판정하지 않는다(vendorEvidenceStaleErrors).
  assert.match(readme, /소스가 바뀌면 첫 단계\(거버넌스의 원본 소스 결속 검사\)에서 멈추는 것이 정상이고/, '전체 검증이 멈추는 첫 단계를 소스 결속 검사로 말한다');
  assert.doesNotMatch(readme, /인증 증거가 낡았다고/, '벤더 인증 증거가 생성물에서 낡는다고 읽히면 안 된다');

  // 이미지 안내도 저하 문장처럼 원장에서 온다. 원장 문구만 고쳐도 README 가 따라 바뀌어야 한다.
  const oracle = ledger.vendors.find(vendor => vendor.id === 'oracle');
  assert.ok(readme.includes(`\n\n${oracle.notices.image}\n\n`), 'README 의 이미지 안내가 원장 문장이다');
  const edited = structuredClone(ledger);
  edited.vendors.find(vendor => vendor.id === 'oracle').notices.image = '원장에서 고친 이미지 안내입니다.';
  const editedReadme = vendorReadme('oracle', edited);
  assert.ok(editedReadme.includes('\n\n원장에서 고친 이미지 안내입니다.\n\n') && !editedReadme.includes(oracle.notices.image), '원장 문구를 고치면 README 도 바뀐다');

  // 이 절은 벤더 생성물에만 붙는다. PostgreSQL 생성물의 README 는 원본 그대로다.
  const project = readFileSync(join(ROOT, 'scripts/project-composer-vendor-project.mjs'), 'utf8').replace(/\r\n/g, '\n');
  assert.equal(project.match(/\bvendorReadme\(/g)?.length, 2, 'README 절은 정의와 projectVendorSources 안의 한 번에서만 쓴다');
  assert.match(project.slice(project.indexOf('export function projectVendorSources')), /^ {2}writeFileSync\(readme, `\$\{readFileSync\(readme, 'utf8'\)\.replace\(\/\\s\*\$\/, '\\n'\)\}\$\{vendorReadme\(vendorId, ledger\)\}`, 'utf8'\);$/m);
  const generator = readFileSync(join(ROOT, 'scripts/generate-reusable-base-source.mjs'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(generator, /^ {2}const vendorInput = vendorId === 'postgresql' \? null : /m, 'PostgreSQL 구성에는 번역 입력이 없다');
  assert.deepEqual(generator.match(/\bprojectVendorSources\(/g), ['projectVendorSources('], '생성기는 투영을 한 곳에서만 부른다');
  assert.match(generator, /^ {2}const vendorProjection = vendorInput && projectVendorSources\(/m, '투영은 번역 입력이 있는 벤더 구성에서만 돈다');
  assert.doesNotMatch(readme, /그쪽에도 맞춰 두어야/, '실행되지 않는 파일에 맞추라는 옛 안내가 돌아오면 안 된다');
  // 본문은 원본 그대로라 PostgreSQL 절차가 남는다. 절의 첫 문단이 어느 쪽을 따를지 말해야 한다.
  assert.equal(readme.split('\n## 데이터베이스\n\n')[1]?.split('\n\n')[0], VENDOR_README_PRECEDENCE, '절 첫머리가 본문보다 우선한다고 말한다');
  assert.match(VENDOR_README_PRECEDENCE, /PostgreSQL 설치·시드·이관·스키마 검증 안내는 이 프로젝트에 맞지 않고 이 절이 우선한다/);
});

test('the MySQL family README states its own limits and none of the Oracle ones', () => {
  const ledger = loadVendorLedger(ROOT);
  for (const [vendor, subject] of [['mysql', 'MySQL 은'], ['mariadb', 'MariaDB 는']]) {
    const readme = vendorReadme(vendor, ledger);
    for (const row of ledger.vendors.find(item => item.id === vendor).notices.degradations) assert.ok(readme.includes(`- ${row.text}`), `${vendor}: README 에 저하가 없다: ${row.kind}`);
    assert.match(readme, new RegExp(`^4\\. ${subject} DDL 이 자동 커밋이라 \`V\` 파일이 중간에 실패하면 .*\`repair\`.*\`npm run verify:vendor-schema\` 로 일회용 DB 에서 먼저 돌린다\\.$`, 'm'), `${vendor}: DDL 자동 커밋 뒤 복구`);
    assert.match(readme, new RegExp(`db/vendor/${vendor}`));
    // 운영 DB_URL 에서 인자가 빠지면 서버 시간대가 UTC 일 때 한국 0~9시의 CURRENT_DATE 가 전날이 된다(2026-11-04 실측).
    for (const parameter of VENDOR_SOURCE[vendor].urlParameters.split('&')) assert.ok(readme.includes(`\`${parameter}\``), `${vendor}: ${parameter}`);
    assert.match(readme, /READ COMMITTED/);
    assert.match(readme, /log_bin_trust_function_creators/);
    assert.match(readme, /3,072바이트/);
    // Oracle 의 한계는 이 DB 에 없다. 남기면 도입자가 없는 제약을 피해 쓴다.
    for (const oracleOnly of ['VARCHAR2', 'CLOB', 'SYS_C', '일반 인덱스로 집행되는 유니크 제약', '바이트 길이가 된 컬럼', 'Oracle']) assert.ok(!readme.includes(oracleOnly), `${vendor}: ${oracleOnly}`);
    for (const limit of ['파괴적 DDL', '명명 예외', 'CHECK·트리거', '새 권한 코드', '새 Java 소스', '이름 없이 만든 제약']) assert.ok(readme.includes(limit), `${vendor}: ${limit}`);
    assert.equal(readme.split('\n## 데이터베이스\n\n')[1]?.split('\n\n')[0], VENDOR_README_PRECEDENCE);
  }
  assert.match(vendorReadme('mysql', ledger), /오류 1419/, 'MySQL 은 바이너리 로그가 기본으로 켜져 있다');
  assert.match(vendorReadme('mariadb', ledger), /해시 인덱스/, 'MariaDB 는 긴 유니크를 해시로 받는다');
});

test('the REUSABLE_BASE layout lines name the vendor schema check and the removed migration module only for a vendor, and keep the PostgreSQL lines byte for byte', () => {
  const postgres = reusableBaseLayoutLines('single-module');
  assert.equal(postgres,
    '- Gradle 프로젝트는 루트 하나이며 기존 디렉터리는 논리 소스 영역이다. 테스트 자원과 offline migration 실행은 별도 source set으로 격리한다.\n' +
    '- 실행: `./gradlew bootRun`; 온라인 JAR: `./gradlew bootJar` → `build/libs/app.jar`. Windows는 `./gradlew` 대신 `gradlew.bat`을 사용한다.\n' +
    '- 전체 테스트: `./gradlew allTests`; 하네스/DB 검사: `./gradlew harnessTest schemaValidationTest`; 오프라인 이관: `npm run verify:migration`.\n' +
    '- 폴더별 `build.gradle`은 원본 출처 자료이며 활성 Gradle 설정은 루트 `build.gradle`과 `settings.gradle`이다.\n',
    'PostgreSQL 단일모듈 문장은 그대로다');
  assert.equal(reusableBaseLayoutLines('multi-module'), '- 기존 Gradle 모듈과 의존 경계를 유지한다.\n', 'PostgreSQL 멀티모듈 문장은 그대로다');
  // 벤더 멀티모듈은 settings.gradle 에서 이관 모듈이 빠지므로(projectVendorSettings) '기존 모듈을 유지한다'고 말하면 틀린다.
  assert.equal(projectVendorSettings("include 'foundation'\ninclude 'migration-tool'\n"), "include 'foundation'\n");
  assert.equal(reusableBaseLayoutLines('multi-module', { vendor: 'oracle' }), '- 이관 모듈(migration-tool)을 뺀 나머지 Gradle 모듈과 의존 경계를 유지한다.\n',
    '벤더 멀티모듈 줄은 빠진 이관 모듈을 말한다');

  const vendor = reusableBaseLayoutLines('single-module', { vendor: 'oracle' });
  assert.ok(vendor.includes(`npm run ${VENDOR_SCHEMA_ALIAS}`), '벤더 스키마 검사 명령을 안내한다');
  assert.match(vendor, /`\.\/gradlew harnessTest`/);
  // 벤더 생성물에는 이관 소스 세트·별칭이 없고 스키마 시험은 검증에서 빠진다(reusable-layout-runtime, verify-reusable-artifact).
  for (const absent of ['schemaValidationTest', 'verify:migration', 'offline migration', '오프라인 이관']) assert.ok(!vendor.includes(absent), absent);

  // 문장 함수만 시험하면 생성기가 벤더를 넘기지 않아도 초록이다. 생성물 REUSABLE_BASE.md 를 읽는 시험은 없다.
  const generator = readFileSync(join(ROOT, 'scripts/generate-reusable-base-source.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const calls = generator.slice(generator.indexOf('async function main')).match(/reusableBaseLayoutLines\([^)]*\)/g) ?? [];
  assert.ok(calls.length > 0, '생성기 main 이 배치 줄을 쓴다');
  for (const call of calls) assert.equal(call, 'reusableBaseLayoutLines(args.layout, { vendor: vendorInput ? vendorId : null })', '생성기 main 이 벤더를 넘긴다');
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
  const unicodeOk = 'CHARSET=AL32UTF8\nHANGUL=Typ=96 Len=3 CharacterSet=AL32UTF8: ea,b0,80\n';
  const oracle19 = probe => cmd => { seen.push(cmd[0]); return { stdout: cmd[0] === 'logs' ? 'DATABASE IS READY TO USE' : cmd.at(-1).includes('NLS_CHARACTERSET') ? probe : 'Grant succeeded', stderr: '' }; };
  assert.equal(VENDOR_ENGINES.oracle19.ready('x', oracle19(unicodeOk)), true);
  for (const id of ['mysql', 'mariadb', 'mssql', 'cubrid']) assert.equal(VENDOR_ENGINES[id].ready('x', cmd => { seen.push(cmd[0]); return { status: 0 }; }), true, id);
  assert.deepEqual(seen, ['logs', 'logs', 'exec', 'exec', 'exec', 'exec', 'exec', 'exec']);
  // [2026-11-04] 한글이 '?' 로 저장된 19c 기록이 시험 중간에 늦게 멈췄다. 유니코드가 아닌 DB 는 준비 때 그 값을 남기고 바로 멈춘다.
  //   읽은 값이 하나라도 다르면 던지고, 읽지 못한 값은 아직 모르는 것이라 준비 대기가 다시 묻는다(false). 읽지 못함을 실패로 보면 접속 직후의 일시 오류에도 멈춘다.
  const notReady = (probe, pattern) => assert.throws(() => VENDOR_ENGINES.oracle19.ready('x', oracle19(probe)), error => error.code === 'VENDOR_ENGINE_NOT_READY' && pattern.test(error.message), probe);
  const askAgain = probe => assert.equal(VENDOR_ENGINES.oracle19.ready('x', oracle19(probe)), false, probe);
  const hangul = bytes => `HANGUL=Typ=96 Len=3 CharacterSet=AL32UTF8: ${bytes}\n`;
  notReady(`CHARSET=WE8MSWIN1252\n${hangul('3f')}`, /NLS_CHARACTERSET=WE8MSWIN1252, '가' 저장 바이트=3f/);
  notReady(`CHARSET=AL32UTF8\n${hangul('3f')}`, /NLS_CHARACTERSET=AL32UTF8, '가' 저장 바이트=3f/);
  notReady('CHARSET=WE8MSWIN1252\n', /NLS_CHARACTERSET=WE8MSWIN1252, '가' 저장 바이트=읽지 못함/);
  notReady(`CHARSET=WE8MSWIN1252\n${hangul('ea,b0,80')}`, /NLS_CHARACTERSET=WE8MSWIN1252, '가' 저장 바이트=ea,b0,80/);
  notReady(hangul('3f'), /NLS_CHARACTERSET=읽지 못함, '가' 저장 바이트=3f/);
  askAgain('ORA-01017: invalid username/password\n');
  askAgain('');
  askAgain('CHARSET=AL32UTF8\n');
  askAgain(hangul('ea,b0,80'));
  // 초기화 중의 임시 서버는 소켓만 열고 앱 계정은 초기화 끝에 생긴다. 앱 계정의 TCP 접속이 되어야 Flyway 와 시험이 붙을 수 있다.
  for (const [id, client, variable] of [['mysql', 'mysql', 'MYSQL_PASSWORD'], ['mariadb', 'mariadb', 'MARIADB_PASSWORD']]) {
    let command = null;
    assert.equal(VENDOR_ENGINES[id].ready('x', cmd => { command = cmd.at(-1); return { status: 1 }; }), false, `${id}: 접속하지 못하면 준비가 아니다`);
    assert.equal(command, `MYSQL_PWD=$${variable} ${client} -h127.0.0.1 --protocol=TCP -uvendorcheck -e "select 1" vendorcheck`, id);
  }

  const removed = [];
  const noId = (dockerArgs) => { removed.push(dockerArgs[0]); return { status: 0, stdout: 'not an id', stderr: '' }; };
  assert.throws(() => launchVendorContainer('oracle', { runDocker: noId, requireContainerId: true }), error => error.code === 'VENDOR_ENGINE_NOT_READY' && /ID 를 받지 못했다/.test(error.message));
  assert.deepEqual(removed, ['run', 'rm'], 'ID 를 못 받으면 소유를 증명할 수 없어 지운다');
  assert.equal(launchVendorContainer('oracle', { runDocker: () => ({ status: 0, stdout: '', stderr: '' }) }).containerId, null, '다른 호출자는 ID 를 요구하지 않는다');
});

test('a vendor container that failed to start says why, even when the pull output fills the stderr', () => {
  const failureOf = result => {
    const docker = args => (args[0] === 'run' ? result : { status: 0, stdout: '', stderr: '' });
    try { launchVendorContainer('oracle', { runDocker: docker }); } catch (error) { return error; }
    return assert.fail('기동 실패여야 한다');
  };
  const timedOut = { status: null, stdout: '', error: Object.assign(new Error('spawnSync docker ETIMEDOUT'), { code: 'ETIMEDOUT' }) };
  const pulling = 'Unable to find image locally\n23-slim: Pulling from gvenzl/oracle-free\n';
  const partial = failureOf({ ...timedOut, stderr: pulling });
  assert.equal(partial.code, 'VENDOR_ENGINE_NOT_READY');
  assert.match(partial.message, /못했다: spawnSync docker ETIMEDOUT Unable to find image/, '받던 중의 출력이 있어도 시간 초과를 말한다');
  assert.match(failureOf({ ...timedOut, stderr: 'x'.repeat(1000) }).message, /못했다: spawnSync docker ETIMEDOUT x+$/, '긴 출력에 잘리지 않는다');
  assert.match(failureOf({ ...timedOut, stderr: '' }).message, /못했다: spawnSync docker ETIMEDOUT$/);
  assert.match(failureOf({ status: 1, stdout: '', stderr: 'no space left' }).message, /못했다: no space left$/, '실행 오류가 없으면 stderr 만 말한다');
  assert.match(failureOf({ status: 1, stdout: '', stderr: '' }).message, /못했다: 종료 코드 1$/, '둘 다 없어도 undefined 를 내지 않는다');
});

test('the runner wires the closed Docker environment, one API environment and the result plan', () => {
  const runner = readFileSync(join(ROOT, 'scripts/run-isolated-e2e.mjs'), 'utf8').replace(/\r\n/g, '\n');
  assert.match(runner, /const runDocker = boundedVendorDocker\(engines\.dockerIn\(clean\)\);/);
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
  assert.match(runner, /databaseEnvironment = \{ DB_URL: `jdbc:postgresql:\/\/127\.0\.0\.1:\$\{databasePort\}\/authz_e2e`, DB_USERNAME: 'egov', DB_PASSWORD: password,\n\s+\.\.\.\(rehearsal \? \{ NURI_AUTHORIZATION_ISOLATED_CUTOVER: 'true', NURI_AUTHORIZATION_DISPOSABLE_DATABASE_ACK: 'CONFIRMED_DISPOSABLE_AUTHZ_DATABASE' \} : \{\}\) \};/, 'PostgreSQL 값은 그대로다');
  // 리허설 여부(GAP-COMPOSE-003)는 PostgreSQL 컨테이너를 만들기 전에 정한다. 원본 저장소에서 켜지는지는 e2e-isolation.test.mjs 가 본다.
  assert.ok(runner.indexOf('const rehearsal = rehearsesAuthorizationContract(root);') > 0
    && runner.indexOf('const rehearsal = rehearsesAuthorizationContract(root);') < runner.indexOf("'postgres:17-alpine'"), '리허설 판정이 DB 컨테이너보다 먼저다');

  assert.deepEqual(resolveVendorEngine('oracle', undefined, VENDOR_ENGINES).id, 'oracle');
  assert.deepEqual(resolveVendorEngine('oracle', 'oracle19', VENDOR_ENGINES).id, 'oracle19');
  assert.throws(() => resolveVendorEngine('oracle', 'mysql', VENDOR_ENGINES), /oracle 프로젝트의 대표 묶음을 mysql 엔진으로 실행할 수 없다/);
  const withoutIntegration = { ...VENDOR_ENGINES, cubrid: { ...VENDOR_ENGINES.cubrid, integration: undefined } };
  assert.throws(() => resolveVendorEngine('cubrid', undefined, withoutIntegration), /cubrid 프로젝트의 대표 묶음을 cubrid 엔진으로 실행할 수 없다/, '통합 값이 없는 엔진은 열지 않는다');
  assert.equal(resolveVendorEngine('cubrid', undefined, VENDOR_ENGINES).id, 'cubrid');
  assert.deepEqual(vendorDatabaseEnvironment(VENDOR_ENGINES.cubrid, '49153', 'secret', '1'),
    { DB_URL: `jdbc:cubrid:127.0.0.1:49153:vendorcheck:::?${VENDOR_SOURCE.cubrid.urlParameters}`, DB_USERNAME: 'vendorcheck', DB_PASSWORD: 'secret', ADMIN_INITIAL_PASSWORD: '1' });
  assert.throws(() => resolveVendorEngine('mysql', 'oracle19', VENDOR_ENGINES), /mysql 프로젝트의 대표 묶음을 oracle19 엔진으로/);
  assert.throws(() => resolveVendorEngine('mysql', 'mariadb', VENDOR_ENGINES), /mysql 프로젝트의 대표 묶음을 mariadb 엔진으로/, '같은 어댑터를 써도 다른 벤더의 엔진이다');
  for (const vendor of ['mysql', 'mariadb']) {
    assert.equal(resolveVendorEngine(vendor, undefined, VENDOR_ENGINES).id, vendor);
    assert.deepEqual(vendorDatabaseEnvironment(VENDOR_ENGINES[vendor], '49153', 'secret', '1'),
      { DB_URL: `jdbc:${vendor}://127.0.0.1:49153/vendorcheck?${VENDOR_SOURCE[vendor].urlParameters}`, DB_USERNAME: 'vendorcheck', DB_PASSWORD: 'secret', ADMIN_INITIAL_PASSWORD: '1' }, vendor);
  }
  assert.throws(() => resolveVendorEngine('oracle', 'nope', VENDOR_ENGINES), /nope 엔진으로/);

  const readme = vendorReadme('oracle', loadVendorLedger(ROOT));
  assert.match(readme, /node scripts\/run-isolated-e2e\.mjs --representative/);
  assert.doesNotMatch(readme, /시작할 때 멈춘다/);
  const removedAssets = JSON.parse(readFileSync(join(ROOT, 'config/governance/vendor-removed-assets.json'), 'utf8'));
  const row = Object.values(removedAssets).flat().find(entry => entry?.file === 'scripts/e2e-isolation.test.mjs');
  assert.match(row.coveredBy, /assertOwnedVendorDatabase/, '제거 사유가 지금 실행기와 맞아야 한다');
  assert.match(row.reason, /공통 판정.*원본 저장소에서만/, '함께 빠지는 공통 판정의 전수 사례를 적는다');
  assert.match(row.coveredBy, /validateIsolationManifest, assertIsolatedTarget/, '대신 도는 공통 판정 시험을 적는다');
});

// 대체 시험이 도는 자리를 사실대로 적는다. 이 시험 파일은 생성물에도 복사되므로 생성물 안에서는 그쪽 별칭과 실제 워크플로를 본다.
test('the isolation replacement cases run in the source operational contracts, and a generated project does not run them', () => {
  const removedAssets = JSON.parse(readFileSync(join(ROOT, 'config/governance/vendor-removed-assets.json'), 'utf8'));
  const row = Object.values(removedAssets).flat().find(entry => entry?.file === 'scripts/e2e-isolation.test.mjs');
  assert.match(row.coveredBy, /원본 저장소의 운영 계약\(test:operational-contracts\)에서 도는 scripts\/project-composer-vendor\.test\.mjs/);
  const isArtifact = existsSync(join(ROOT, 'reusable-base-lock.json'));
  const readText = path => readFileSync(join(ROOT, path), 'utf8').replace(/\r\n/g, '\n');
  const contracts = JSON.parse(readText('package.json')).scripts['test:operational-contracts'];
  if (isArtifact) assert.equal(contracts, artifactAliases['test:operational-contracts']);
  else assert.match(contracts, /"scripts\/\*\.test\.mjs"/);
  // 파일을 직접 적어도, glob 이나 폴더로 돌려도 원장 문장이 틀린 것이다.
  for (const layout of ['multi-module', 'single-module']) {
    for (const scope of ['contracts', 'backend', 'frontend', 'full', 'vendor-schema']) {
      for (const argument of verificationSteps(scope, layout, { vendor: 'oracle' }).flatMap(step => step.args)) {
        assert.doesNotMatch(argument, /project-composer-vendor\.test|\*|^scripts\/?$/, `생성물 검증이 돌리게 되면 원장 문장을 고친다: ${layout} ${scope}`);
      }
    }
  }
  assert.equal(artifactAliases.verify, ARTIFACT_COMMAND);
  const workflow = isArtifact ? readText('.github/workflows/ci.yml') : reusableArtifactEntrypoints('core',
    JSON.parse(readText('.github/required-checks.json')).criticalSteps.find(step => step.name === 'Run gitleaks (working tree + incremental)').run, readText('.github/workflows/ci.yml')).workflow;
  assert.match(workflow, /^ +run: node scripts\/verify-reusable-artifact\.mjs$/m);
  assert.doesNotMatch(workflow, /\.test\.mjs|node --test|npm (?:run )?test/, '생성물 ci.yml 이 돌리게 되면 원장 문장을 고친다');
});

/** 실제 launchVendorContainer 와 엔진 값을 쓰고 docker 만 바꾼다. inspect 는 run 인자로 만들어 배선한 라벨·환경이 판정까지 닿는지 본다. */
function isolatedVendorDatabase({ engineId = 'oracle', pollsUntilReady = 1, runFails = false, logFails = false, logFile = null, timedOut = [] } = {}) {
  const directory = mkdtempSync(join(tmpdir(), 'vendor-isolated-'));
  const manifest = { ...vendorManifest(), databaseId: '' };
  const steps = [];
  const calls = [];
  const containerId = 'c'.repeat(64);
  let started;
  let polls = 0;
  const reports = [];
  const warnings = [];
  const fakeDocker = (args, options) => {
    calls.push({ args, options });
    if (timedOut.includes(args[1] === '--tail' ? 'tail' : args[0])) {
      steps.push(`timeout ${args[1] === '--tail' ? 'tail' : args[0]}`);
      return { status: null, signal: 'SIGTERM', stdout: '', stderr: '', error: Object.assign(new Error('spawnSync docker ETIMEDOUT'), { code: 'ETIMEDOUT' }) };
    }
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
    if (args[0] === 'exec') {
      steps.push('exec');
      return { status: 0, stdout: args.at(-1).includes('NLS_CHARACTERSET') ? 'CHARSET=AL32UTF8\nHANGUL=Typ=96 Len=3 CharacterSet=AL32UTF8: ea,b0,80\n' : 'Grant succeeded', stderr: '' };
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
    container.Config.Image = started.args.find(arg => arg === VENDOR_ENGINES[engineId].image);
    container.Config.Env = started.args.flatMap((arg, index, all) => (arg === '--env' ? [`${all[index + 1]}=${started.env[all[index + 1]]}`] : []));
    return container;
  };
  const state = { change: value => value };
  const inspect = id => { steps.push(`inspect ${id}`); return state.change(live()); };
  const seen = [];
  let database;
  try {
    database = launchIsolatedVendorDatabase({ runtime: { module: { dockerIn: environment => { seen.push(environment); return fakeDocker; }, launchVendorContainer }, id: engineId, engine: VENDOR_ENGINES[engineId] },
      runId: manifest.runId, clean: { PATH: 'tools' }, manifest, inspect, logFile: logFile ?? join(directory, 'database.log'),
      report: message => reports.push(message), warn: message => warnings.push(message) });
  } catch (error) {
    rmSync(directory, { recursive: true, force: true });
    throw error;
  }
  return { database, manifest, steps, calls, state, reports, warnings, directory, seen, logFile: join(directory, 'database.log'), inspected: `inspect ${containerId}`, containerId, password: () => started.env.ORACLE_PASSWORD };
}

test('an isolated vendor database checks cancellation and ownership on every wait', async () => {
  const fixture = isolatedVendorDatabase({ pollsUntilReady: 3 });
  try {
    assert.deepEqual(fixture.seen, [{ PATH: 'tools' }], '실행기가 판정한 데몬과 같은 닫힌 환경으로 docker 를 부른다');
    assert.equal(fixture.manifest.databaseId, fixture.containerId);
    const order = [];
    const port = await fixture.database.waitReady(() => order.push(fixture.steps.length), { wait: async () => fixture.steps.push('wait') });
    assert.equal(port, '49153');
    assert.deepEqual(fixture.steps, ['run', fixture.inspected, 'poll', 'wait', fixture.inspected, 'poll', 'wait', fixture.inspected, 'poll'], '준비를 묻기 전마다 소유를 본다');
    assert.equal(order.length, 3, '준비를 묻기 전마다 취소를 본다');
  } finally { rmSync(fixture.directory, { recursive: true, force: true }); }
});

// 19c 의 준비 판정은 CREATE USER·GRANT 를 쓴다. 기다리는 동안 이름이 다른 컨테이너로 옮겨 가면 판정한 것과 쓰는 대상이 달라진다.
test('the 19c readiness writes only after the ownership check and only to the container the check pinned', async () => {
  const noWait = async () => {};
  const owned = isolatedVendorDatabase({ engineId: 'oracle19', pollsUntilReady: 2 });
  const lost = isolatedVendorDatabase({ engineId: 'oracle19', pollsUntilReady: 2 });
  const foreign = isolatedVendorDatabase({ engineId: 'oracle19' });
  const otherRun = value => { value.Config.Labels['egov.e2e.run'] = 'f'.repeat(24); return value; };
  try {
    await owned.database.waitReady(() => {}, { wait: async () => owned.steps.push('wait') });
    assert.deepEqual(owned.steps, ['run', owned.inspected, 'poll', 'wait', owned.inspected, 'poll', 'exec', 'exec'], '쓰기와 문자 집합 확인도 소유 판정 뒤에 돈다');
    const name = owned.calls[0].args[owned.calls[0].args.indexOf('--name') + 1];
    const targets = owned.calls.filter(({ args }) => args[0] === 'logs' || args[0] === 'exec').map(({ args }) => args[1]);
    assert.deepEqual([...new Set(targets)], [owned.containerId], '대상은 판정한 ID 다');
    assert.ok(!owned.calls.slice(1).some(({ args }) => args.includes(name)), '이름으로 부르지 않는다');

    await assert.rejects(lost.database.waitReady(() => {}, { wait: async () => { lost.state.change = otherRun; } }), /isolation verification failed/, '기다리는 동안 소유를 잃으면 멈춘다');
    assert.ok(!lost.steps.includes('exec'), '소유를 잃은 뒤에는 쓰지 않는다');

    foreign.state.change = otherRun;
    await assert.rejects(foreign.database.waitReady(() => {}, { wait: noWait }), /isolation verification failed/);
    assert.deepEqual(foreign.steps, ['run', foreign.inspected], '남의 컨테이너에는 준비도 묻지 않는다');
  } finally { for (const fixture of [owned, lost, foreign]) rmSync(fixture.directory, { recursive: true, force: true }); }
});

test('every docker call of an isolated vendor run has its own limit, and a call that timed out still reaches the deadline, the cancel and the cleanup', async () => {
  const noWait = async () => {};
  const normal = isolatedVendorDatabase({ engineId: 'oracle19' });
  const blocked = isolatedVendorDatabase({ pollsUntilReady: 99, timedOut: ['logs'] });
  const cancelled = isolatedVendorDatabase({ pollsUntilReady: 99, timedOut: ['logs'] });
  const silentLogs = isolatedVendorDatabase({ timedOut: ['tail'] });
  const stuckRemoval = isolatedVendorDatabase({ timedOut: ['rm'] });
  try {
    await normal.database.waitReady(() => {}, { wait: noWait });
    normal.database.cleanUp();
    const limits = Object.fromEntries(normal.calls.map(({ args, options }) => [args[1] === '--tail' ? 'tail' : args[0], options.timeout]));
    assert.deepEqual(limits, { run: 3_600_000, logs: 30_000, exec: 30_000, tail: 30_000, rm: 300_000 }, 'docker run 은 이미지를 받으므로 짧게 묶지 않고, 나머지는 멈추면 끊는다');
    assert.ok(normal.calls[0].options.env, '실행기가 넘긴 환경도 유지한다');

    let clock = 0;
    let turns = 0;
    await assert.rejects(blocked.database.waitReady(() => { turns += 1; }, { wait: noWait, now: () => { clock += 200_000; return clock; } }), /oracle 가 300초 안에 준비되지 않았다/, '시간 초과는 준비 안 됨으로 끝나 시한을 본다');
    assert.ok(turns >= 2, '시간 초과 뒤에도 취소를 본다');

    let active = true;
    await assert.rejects(cancelled.database.waitReady(() => { if (!active) throw new Error('Isolated E2E: run was cancelled.'); }, { wait: async () => { active = false; } }), /run was cancelled/, '시간 초과 뒤의 취소가 닿는다');

    silentLogs.database.cleanUp();
    assert.deepEqual(silentLogs.warnings, ['Isolated E2E: 벤더 DB 로그를 남기지 못했다.']);
    assert.equal(silentLogs.steps.at(-1), `rm -f -v ${silentLogs.containerId}`, '로그가 멈춰도 지운다');

    stuckRemoval.database.cleanUp();
    assert.match(stuckRemoval.reports[0], /벤더 DB 컨테이너를 지우지 못했다/, '지우기가 멈추면 남은 컨테이너를 알린다');
  } finally { for (const fixture of [normal, blocked, cancelled, silentLogs, stuckRemoval]) rmSync(fixture.directory, { recursive: true, force: true }); }
  assert.throws(() => isolatedVendorDatabase({ timedOut: ['run'] }), /^Error: Isolated E2E: oracle 컨테이너를 띄우지 못했다: spawnSync docker ETIMEDOUT/, 'stderr 가 비어도 원인을 말한다');
});

test('a termination signal starts the abort once and keeps listening, so a second signal cannot kill the cleanup', () => {
  const target = new EventEmitter();
  let aborts = 0;
  const stopListening = onTermination(() => { aborts += 1; }, target);
  for (const signal of ['SIGHUP', 'SIGTERM', 'SIGINT', 'SIGHUP']) {
    target.emit(signal);
    assert.equal(target.listenerCount(signal), 1, `${signal} 뒤에도 받는다`);
  }
  assert.equal(aborts, 1, '중단은 한 번만 시작한다');
  stopListening();
  for (const signal of ['SIGHUP', 'SIGTERM', 'SIGINT']) assert.equal(target.listenerCount(signal), 0, `${signal} 등록을 걷는다`);
});

test('cleanup runs every step after an earlier one throws and reports the first failure', async () => {
  const ran = [];
  await assert.rejects(runCleanupSteps([
    () => { ran.push('manifest'); throw new Error('첫 실패'); },
    async () => { ran.push('children'); throw new Error('둘째 실패'); },
    () => { ran.push('database'); },
  ]), /^Error: 첫 실패$/);
  assert.deepEqual(ran, ['manifest', 'children', 'database']);
  await assert.doesNotReject(runCleanupSteps([() => undefined, async () => undefined]));
});

test('every Gradle call of the vendor integration leaves no daemon and keeps its own failure conditions', () => {
  const source = readFileSync(join(ROOT, 'scripts/project-composer-vendor-integration.mjs'), 'utf8');
  const calls = source.match(/spawnSync\(`"\$\{gradlew\}"`, \[[^\]]*\]/g);
  assert.equal(calls.length, 3, 'Flyway·카탈로그·시나리오');
  for (const call of calls) assert.match(call, /\.\.\.VENDOR_GRADLE_OPTIONS/, call);
  assert.ok(VENDOR_GRADLE_OPTIONS.includes('--no-daemon'));
  assert.ok(!VENDOR_GRADLE_OPTIONS.includes('--warning-mode'), '경고를 실패로 바꾸지 않는다');
});

test('a vendor failure leaves the masked end of the database log before the container goes away', t => {
  const printed = [];
  t.mock.method(console, 'error', text => printed.push(String(text)));
  const handle = { name: 'egov-vendor-x', password: 'Vd1_secret' };
  const scenario = ({ failure = new Error('시험 실패'), logs, target = handle }) => {
    printed.length = 0;
    const order = [];
    const remove = () => { order.push('rm'); return { status: 0 }; };
    // 수집기 안에서 단언하면 수집 실패를 삼키는 try/catch 에 사라진다. 그래서 끝난 뒤 본다.
    let logRead = null;
    const readLogs = (args, options) => { order.push(args.join(' ')); logRead = { options }; return logs(); };
    if (failure) assert.throws(() => stopVendorEngineReporting(target, failure, remove, readLogs), /^Error: 시험 실패$/, '원래 실패를 가리지 않는다');
    else stopVendorEngineReporting(target, null, remove, readLogs);
    if (logRead) assert.equal(logRead.options?.timeout, 30_000, '로그 수집도 멈추지 않는다');
    return order;
  };
  const noisy = Array.from({ length: 100 }, (_, index) => `line ${index} ${'x'.repeat(index === 99 ? 500 : 1)}`).join('\n');
  assert.deepEqual(scenario({ logs: () => ({ status: 0, stdout: `${noisy}\nstarted with Vd1_secret\n`, stderr: 'ORA-27102: out of memory\n' }) }), ['logs --tail 20 egov-vendor-x', 'rm'], '지우기 전에 읽는다');
  const output = printed.join('\n');
  assert.match(output, /ORA-27102: out of memory/);
  assert.ok(!output.includes('Vd1_secret'), '비밀번호를 내지 않는다');
  assert.ok(output.split('\n').length <= 21, 'Gradle 실패 요약을 밀어내지 않는다');
  assert.ok(output.split('\n').every(line => line.length <= 300), '줄도 자른다');

  scenario({ logs: () => ({ status: 0, stdout: 'started with Vd1_secret\n', stderr: '' }) });
  assert.match(printed.join('\n'), /started with \[password\]/);

  assert.deepEqual(scenario({ logs: () => { throw new Error('docker gone'); } }), ['logs --tail 20 egov-vendor-x', 'rm'], '로그 수집 실패가 정리를 막지 않는다');
  assert.deepEqual(printed, []);
  assert.deepEqual(scenario({ logs: () => ({ status: null, stdout: '', stderr: '', error: new Error('ETIMEDOUT') }) }), ['logs --tail 20 egov-vendor-x', 'rm']);
  assert.deepEqual(printed, []);
  const silent = () => ({ status: 0, stdout: '', stderr: '' });
  assert.deepEqual(scenario({ failure: null, logs: silent }), ['rm'], '실패가 없으면 읽지 않는다');
  assert.deepEqual(scenario({ target: { name: 'egov-vendor-x' }, logs: silent }), ['rm'], '비밀번호를 모르면 가릴 수 없어 읽지 않는다');
});

test('a vendor engine that never became ready reports the database log, not only the timeout', t => {
  const printed = [];
  t.mock.method(console, 'error', text => printed.push(String(text)));
  let clock = 0;
  t.mock.method(Date, 'now', () => { clock += 400_000; return clock; });
  const calls = [];
  let password;
  const runDocker = (args, options) => {
    calls.push(args[1] === '--tail' ? 'tail' : args[0]);
    if (args[0] === 'run') { password = options.env.ORACLE_PASSWORD; return { status: 0, stdout: '', stderr: '' }; }
    if (args[0] === 'logs') return { status: 0, stdout: `password is ${password}\n`, stderr: 'ORA-27102: out of memory\n' };
    return { status: 0, stdout: '', stderr: '' };
  };
  assert.throws(() => startVendorEngine('oracle', { runDocker }), error => error.code === 'VENDOR_ENGINE_NOT_READY' && /300초 안에 준비되지 않았다/.test(error.message));
  assert.deepEqual(calls, ['run', 'logs', 'tail', 'rm']);
  const output = printed.join('\n');
  assert.match(output, /ORA-27102: out of memory/);
  assert.match(output, /password is \[password\]/);
  assert.ok(!output.includes(password));
});

test('the vendor commands reach the log tail through the default reader, and a removal of another container does not read logs', () => {
  const engine = readFileSync(join(ROOT, 'scripts/project-composer-vendor-engine.mjs'), 'utf8');
  assert.match(engine, /readLogs = remove === stopVendorEngine \? docker : null\)/, '통합·차등·적용 대조는 기본 정리로 로그를 남긴다');
  for (const file of ['project-composer-vendor-integration.mjs', 'project-composer-vendor-verify.mjs', 'project-composer-vendor-differential.mjs']) {
    assert.match(readFileSync(join(ROOT, 'scripts', file), 'utf8'), /stopVendorEngineReporting\(handle, failure\);/, file);
  }
  const reads = [];
  assert.throws(() => withDisposablePostgres(() => { throw new Error('대조 실패'); }, args => { reads.push(args[0]); return { status: 0, stdout: '', stderr: '' }; }), /대조 실패/);
  assert.ok(!reads.includes('logs'), '기준 PostgreSQL 은 벤더 DB 가 아니다');
});

test('the database log reaches the job failure tail without pushing out the Gradle summary', t => {
  const printed = [];
  t.mock.method(console, 'error', text => printed.push(String(text)));
  const header = { profile: 'demo', layout: 'multi-module', command: 'node scripts/project-composer-vendor-integration.mjs' };
  const database = Array.from({ length: 19 }, (_, index) => `database line ${index}`).join('\n');
  assert.throws(() => stopVendorEngineReporting({ name: 'egov-vendor-x', password: 'Vd1_secret' }, new Error('통합 시험 실패'), () => ({ status: 0 }),
    () => ({ status: 0, stdout: `${database}\nstarted with Vd1_secret\n`, stderr: 'ORA-27102: out of memory\n' })), /통합 시험 실패/);
  const directory = mkdtempSync(join(tmpdir(), 'vendor-log-tail-'));
  try {
    const log = join(directory, 'verify.log');
    const gradle = Array.from({ length: 100 }, (_, index) => `gradle line ${index}`);
    writeFileSync(log, [`[reusable-verify] demo/multi-module: ${header.command}`, ...gradle, 'BUILD FAILED in 7m', ...printed, '[vendor-integration] VENDOR_INTEGRATION_FAILED: 통합 시험 실패', '[종료 코드 1 · 가림 0건]', ''].join('\n'));
    const tail = verificationLogTail(log, header, { roots: [], home: '', env: {} });
    assert.equal(tail.length, 40);
    assert.ok(tail.includes('ORA-27102: out of memory'), 'DB 원인이 작업 실패에 닿는다');
    assert.ok(tail.includes('started with [password]') && !tail.join('\n').includes('Vd1_secret'), '작업 로그에도 비밀번호가 없다');
    assert.ok(tail.includes('BUILD FAILED in 7m') && tail.some(line => line.startsWith('gradle line')), 'Gradle 실패 요약이 남는다');
    assert.equal(tail.at(-1), '[vendor-integration] VENDOR_INTEGRATION_FAILED: 통합 시험 실패');
  } finally { rmSync(directory, { recursive: true, force: true }); }
});

test('a vendor run stops waiting when it is cancelled, loses the container or runs out of time, and can still clean up', async () => {
  const noWait = async () => {};
  const cancelled = isolatedVendorDatabase({ pollsUntilReady: 99 });
  const dead = isolatedVendorDatabase({ pollsUntilReady: 99 });
  const late = isolatedVendorDatabase({ pollsUntilReady: 99 });
  try {
    await assert.rejects(cancelled.database.waitReady(() => { throw new Error('Isolated E2E: run was cancelled.'); }, { wait: noWait }), /run was cancelled/);
    assert.equal(cancelled.steps.filter(step => step === 'poll').length, 0, '취소하면 더 묻지 않는다');

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

test('a cancelled run reports the cancellation, not the failure of the child it killed', async () => {
  const exits = code => spawn(process.execPath, ['-e', `process.exit(${code})`], { stdio: 'ignore', windowsHide: true });
  const target = new EventEmitter();
  let aborted = false;
  const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 60000)'], { stdio: 'ignore', windowsHide: true });
  const stopListening = onTermination(() => { aborted = true; child.kill(); }, target);
  try {
    const outcome = awaitChildExit(child, 'playwright', () => aborted);
    target.emit('SIGHUP');
    await assert.rejects(outcome, /^Error: Isolated E2E: run was cancelled\.$/, '취소가 죽인 자식은 실패가 아니라 취소로 끝난다');
  } finally {
    stopListening();
    if (child.exitCode === null && child.signalCode === null) child.kill();
  }
  await assert.rejects(awaitChildExit(exits(0), 'playwright', () => true), /^Error: Isolated E2E: run was cancelled\.$/, '종료 코드보다 취소를 먼저 본다');
  await assert.rejects(awaitChildExit(exits(1), 'playwright', () => false), /^Error: Isolated E2E: playwright failed; inspect its private run log\.$/, '취소가 아니면 실패를 그대로 말한다');
  await assert.doesNotReject(awaitChildExit(exits(0), 'playwright', () => false));
});

test('main keeps the vendor checks wired where a fake docker cannot see them', () => {
  const runner = readFileSync(join(ROOT, 'scripts/run-isolated-e2e.mjs'), 'utf8').replace(/\r\n/g, '\n');
  const main = runner.slice(runner.indexOf('export async function main'));
  assert.match(main, /const vendor = assertIsolatedRunnerSupportsProject\(root, \{ representative: representative\.enabled \}\);/, '구성 판정을 main 에서 건너뛰지 않는다');
  assert.match(main, /await awaitChildExit\(launch\(name, command, args, cwd, environment, outputFile\), name, \(\) => aborted\);/, '자식의 종료 코드보다 취소를 먼저 본다');
  const caught = '} catch (error) { executionFailure = error; }';
  assert.equal(main.split(caught).length, 2, 'playwright 실행의 catch 는 하나다');
  const afterPlaywright = main.slice(main.indexOf(caught) + caught.length);
  const firstStatement = afterPlaywright.split('\n').map(line => line.trim()).find(line => line && !line.startsWith('//'));
  assert.equal(firstStatement, 'assertActive();', '취소로 삼킨 실패 뒤에는 결과 파일을 읽기 전에 취소로 끝낸다');
  assert.ok(afterPlaywright.indexOf('readFileSync(reportPath') > afterPlaywright.indexOf('assertActive();'), '결과 파일보다 취소를 먼저 본다');
  assert.match(main, /verifyOwner: \(\) => \{ assertActive\(\); verifyRuntime\(\); \}/, '픽스처 쓰기 전마다 취소와 소유를 본다');
  const positions = ['launchIsolatedVendorDatabase({', 'cleanUpVendorDatabase = database.cleanUp;', 'verifyRuntime = database.verify;', 'await database.waitReady(assertActive);'].map(text => main.indexOf(text));
  assert.ok(positions.every(position => position >= 0), `벤더 DB 배선이 없다: ${positions}`);
  assert.deepEqual(positions, [...positions].sort((left, right) => left - right), '대기가 실패해도 지우도록 정리를 먼저 받는다');
  const closing = main.slice(main.lastIndexOf('} finally {'));
  assert.match(closing, /if \(cleanUpVendorDatabase\) cleanUpVendorDatabase\(\);/, '어떻게 끝나든 벤더 DB 를 지운다');
  assert.ok(closing.indexOf('await runCleanupSteps([') < closing.indexOf('unlinkSync(manifestFile)') && closing.indexOf('unlinkSync(manifestFile)') < closing.indexOf('cleanUpVendorDatabase()'), '앞 단계가 던져도 벤더 DB 정리까지 간다');
  assert.match(main, /const stopListening = onTermination\(abort\);/, 'SIGINT·SIGTERM·SIGHUP 을 계속 받는다');
  assert.doesNotMatch(main, /process\.once\('SIG/, 'once 는 두 번째 신호에 프로세스를 죽인다');
  assert.match(closing, /stopListening,\n\s+\]\);/, '정리가 끝난 뒤에 등록을 걷는다');
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
  const missing = () => ({ status: null, error: Object.assign(new Error('spawnSync docker ENOENT'), { code: 'ENOENT' }) });
  assert.throws(() => withDisposablePostgres(() => assert.fail('돌면 안 된다'), missing),
    error => /spawnSync docker ENOENT/.test(error.message) && !/남았다|undefined/.test(error.message), 'Docker 가 없으면 남은 컨테이너도 없다');
});

test('a trigger probe whose count cannot be read is a query failure, not a parity difference', () => {
  const steps = (errorAt = () => false, value = '1') => (handle, statements) => {
    const sections = new Map(statements.map(({ sql }, index) => [index, /^SELECT COUNT/.test(sql) ? [value] : []]));
    return { sections, errors: statements.flatMap(({ sql }, index) => (errorAt(sql) ? [{ index, error: 'ORA-00942' }] : [])) };
  };
  const rejectsCount = sql => /^SELECT COUNT/.test(sql);
  assert.throws(() => intentFailures({}, 'oracle', steps(rejectsCount)), error => error.code === 'VENDOR_QUERY_FAILED' && /oracle 트리거 확인 조회 실패/.test(error.message), '조회 오류');
  assert.throws(() => intentFailures({}, 'oracle', steps(() => false, 'x')), error => error.code === 'VENDOR_QUERY_FAILED', '읽을 수 없는 수');
  const wrong = intentFailures({}, 'oracle', steps(() => false, '2'));
  assert.ok(wrong.some(item => /→ 2 \(기대 1\)/.test(item)), '값이 다르면 그대로 대조 실패다');
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
  assert.match(projected, /^ {6}ADMIN_INITIAL_PASSWORD: \$\{ADMIN_INITIAL_PASSWORD:-\}$/m, '개발 시드가 없어 관리자 비밀번호를 환경값으로 받는다');
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
  assert.match(environment, /^# 운영 번들 DB 의 SYS 비밀번호\./m);
});

test('the MySQL family stack keeps the app and root credentials apart and every projected file keeps its connection arguments', () => {
  const compose = readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8').replace(/\r\n/g, '\n');
  const deploySource = readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8').replace(/\r\n/g, '\n');
  for (const [vendor, prefix] of [['mysql', 'MYSQL'], ['mariadb', 'MARIADB']]) {
    const source = VENDOR_SOURCE[vendor];
    const projected = projectVendorCompose(compose, vendor);
    assert.ok(projected.includes(`image: ${VENDOR_ENGINES[vendor].image}\n`), `${vendor}: 개발 compose 와 검증 엔진의 이미지가 같다`);
    assert.match(projected, /127\.0\.0\.1:3306:3306/, '호스트 공개는 루프백으로 좁힌다');
    assert.ok(projected.includes(`"url": "${source.composeUrl}"`), `${vendor}: 앱이 접속 인자를 가진 주소로 붙는다`);
    assert.match(projected, new RegExp(`^ {2}${source.composeVolume}:$`, 'm'));
    assert.doesNotMatch(projected, /postgres/);
    assert.match(projected, /^ {6}TZ: Asia\/Seoul$/m);
    // 앱 계정(egov)과 root 를 나눈다. 앱 접속 JSON 의 자격과 같은 앱 계정이 이미지 초기화로 생긴다.
    assert.match(projected, new RegExp(`^ {6}${prefix}_USER: egov\\n {6}${prefix}_PASSWORD: egov123$`, 'm'));
    const prod = projectVendorComposeProd('    environment:\n      POSTGRES_USER: ${DB_USERNAME:?필요}\n      POSTGRES_PASSWORD: ${DB_PASSWORD:?필요}\n      SPRING_FLYWAY_LOCATIONS: classpath:db/migration\n', vendor);
    assert.match(prod, new RegExp(`^ {6}${prefix}_USER: \\$\\{DB_USERNAME`, 'm'));
    assert.match(prod, new RegExp(`^ {6}${prefix}_PASSWORD: \\$\\{DB_PASSWORD`, 'm'));
    assert.match(prod, new RegExp(`^ {6}${prefix}_ROOT_PASSWORD: \\$\\{DB_ADMIN_PASSWORD`, 'm'), 'root 비밀번호는 앱 비밀번호와 나눈다');
    assert.match(prod, new RegExp(`SPRING_FLYWAY_LOCATIONS: classpath:db/vendor/${vendor}`));
    // 접속 인자의 따옴표와 & 는 셸 문법이다. case 패턴을 큰따옴표로 감싸 글자 그대로 맞춘다.
    const deploy = projectVendorDeploy(deploySource, vendor);
    assert.ok(deploy.includes(`    "${source.composeUrl}") ;;\n`), `${vendor}: 배포 스크립트가 접속 인자까지 같은 주소만 받는다`);
    assert.match(deploy, /DB_PASSWORD DB_ADMIN_PASSWORD/);
    const environment = projectVendorEnvironment(readFileSync(join(ROOT, '.env.example'), 'utf8').replace(/\r\n/g, '\n'), vendor);
    assert.ok(environment.includes(`\nDB_URL=${source.url}\n`), vendor);
    assert.match(environment, /^# 운영 번들 DB 의 root 비밀번호\./m);
    const profile = projectVendorProfile('    url: ${DB_URL:jdbc:postgresql://localhost:5432/egovdb?currentSchema=public&prepareThreshold=0}\n    driver-class-name: org.postgresql.Driver\n', vendor);
    assert.equal(profile, `    url: \${DB_URL:${source.url}}\n    driver-class-name: ${source.driverClass}\n`, `${vendor}: 주소의 따옴표가 치환 기호로 읽히지 않는다`);
    assert.match(vendorApplicationDocument(vendor), new RegExp(`dialect: ${source.dialect.replaceAll('.', '\\.')}`));
  }
  assert.match(VENDOR_SOURCE.mariadb.composeService, /healthcheck\.sh", "--connect", "--innodb_initialized"/);
  assert.match(VENDOR_SOURCE.mysql.composeService, /mysqladmin ping -h 127\.0\.0\.1/, '초기화 중의 임시 서버는 TCP 를 열지 않는다');
});

test('the CUBRID stack runs the engine image, keeps the app and dba credentials apart and is ready only on the app account with dba locked', () => {
  const source = VENDOR_SOURCE.cubrid;
  const compose = projectVendorCompose(readFileSync(join(ROOT, 'docker-compose.yml'), 'utf8').replace(/\r\n/g, '\n'), 'cubrid');
  assert.ok(compose.includes(`image: ${VENDOR_ENGINES.cubrid.image}\n`), '개발 compose 와 검증 엔진의 이미지가 같다');
  assert.match(compose, /^ {6}- "127\.0\.0\.1:33000:33000"$/m, '브로커 포트를 루프백에만 연다');
  assert.ok(compose.includes(`"url": "${source.composeUrl}"`));
  assert.equal(source.composeUrl, 'jdbc:cubrid:db:33000:egovdb:::?charset=utf-8');
  assert.doesNotMatch(compose, /postgres/);
  // 서버 시계가 한국 시간이어야 앱이 기동한다(CubridSqlDialect.assertSession). 로캘이 다르면 한글을 바이트로 센다. 검증 엔진과 같은 값이다.
  const engine = VENDOR_ENGINES.cubrid.environment('p');
  for (const name of ['TZ', 'CUBRID_LOCALE', 'CUBRID_VOLUME_SIZE']) assert.match(compose, new RegExp(`^ {6}${name}: ${engine[name].replaceAll('.', '\\.')}$`, 'm'), name);
  assert.match(compose, /^ {6}CUBRID_DB: egovdb$/m);
  assert.match(compose, /^ {6}- cubrid_data:\/home\/cubrid\/CUBRID\/databases$/m);
  assert.match(compose, /^ {2}cubrid_data:$/m);
  // 앱 접속 JSON 의 자격과 같은 앱 계정을 상태 검사가 만든다.
  assert.match(compose, /^ {6}APP_DB_USER: egov\n {6}APP_DB_PASSWORD: egov123$/m);
  const healthcheck = compose.match(/^ {6}test: (.*)$/m)[1];
  // 준비 판정은 컨테이너의 실효 앱 자격으로 한 실제 접속이다. 개발 값을 글자로 박으면 운영 자격에서 영구 unhealthy 가 된다.
  assert.ok(healthcheck.endsWith('gosu cubrid csql -u \\"$${APP_DB_USER}\\" -p \\"$${APP_DB_PASSWORD}\\" -c \\"select 1 from db_root\\" egovdb@localhost </dev/null"]'), healthcheck);
  assert.doesNotMatch(healthcheck, /egov123/);
  assert.match(healthcheck, /CREATE USER \$\$\{APP_DB_USER\} PASSWORD '\$\$\(printf '%s' \\"\$\$\{APP_DB_PASSWORD\}\\" \| sed \\"s\/'\/''\/g\\"\)'/, '앱 비밀번호의 작은따옴표는 두 번 쓴다');
  assert.match(healthcheck, /ALTER USER dba PASSWORD '\$\$\(printf '%s' \\"\$\$\{DBA_PASSWORD\}\\" \| sed/);
  assert.match(healthcheck, /case \\"\$\$\{APP_DB_USER\}\\" in ''\|\*\[!A-Za-z0-9_\]\*\|\[Dd\]\[Bb\]\[Aa\]\|\[Pp\]\[Uu\]\[Bb\]\[Ll\]\[Ii\]\[Cc\]\) /, '계정 이름은 따옴표 없는 식별자라 영문·숫자·밑줄만, dba·public 은 거부한다');
  // dba 가 비밀번호 없이 접속되는 동안은 준비가 아니다. dba 잠금은 앱 계정 접속이 된 뒤에만 건다 — 거꾸로면 앱 계정을 만들 수 없게 된다.
  const command = cubridHealthcheckCommand({ user: 'APP', password: 'PW', dbaPassword: 'DBA', database: 'db' });
  const start = command.indexOf('if gosu cubrid csql -u dba -c "select 1 from db_root" db@localhost');
  const branch = start < 0 ? '' : command.slice(start, command.indexOf('exit 1; fi;', start) + 'exit 1; fi;'.length);
  assert.ok(branch.length > 0 && branch.indexOf('CREATE USER APP') < branch.indexOf('-u "APP" -p "PW"') && branch.indexOf('-u "APP" -p "PW"') < branch.indexOf('ALTER USER dba'), branch);
  assert.match(branch, /-c "select 1 from db_root" db@localhost <\/dev\/null >\/dev\/null 2>&1 && gosu cubrid csql -u dba -c "ALTER USER dba/);
  assert.ok(branch.endsWith('2>&1; exit 1; fi;'), '비밀번호 없는 dba 를 찾은 회차는 늘 준비가 아니다');
  assert.match(command, /^case "APP" in .*; if \[ -z "DBA" \]; then echo 'dba password is required' >&2; exit 1; fi; /, '빈 dba 비밀번호는 잠그지 못하므로 멈춘다');
  // 명령 치환이 끝 줄바꿈을 지워 만든 비밀번호와 알려진 비밀번호가 달라진다. 첫 csql 앞에서 두 비밀번호를 모두 거른다.
  assert.match(command, /; if ! \[ "\$\(printf '%s' "PW" \| tr -d '\\r\\n'\)" = "PW" \] \|\| ! \[ "\$\(printf '%s' "DBA" \| tr -d '\\r\\n'\)" = "DBA" \]; then echo 'passwords must not contain line breaks' >&2; exit 1; fi; if gosu cubrid csql -u dba /,
    '줄바꿈이 든 비밀번호는 계정을 만들기 전에 멈춘다');
  assert.match(healthcheck, /tr -d '\\\\r\\\\n'/, 'compose 문자열에서는 역슬래시를 한 번 더 이스케이프해 셸에 \\r\\n 으로 닿는다');
  assert.ok(command.endsWith('; gosu cubrid csql -u "APP" -p "PW" -c "select 1 from db_root" db@localhost </dev/null'));
  // 비밀번호 없는 dba 의 접속 시도는 입력을 닫는다. 비밀번호를 건 뒤에 묻는 입력을 기다리지 않는다.
  for (const call of command.split('gosu cubrid csql -u dba').slice(1)) assert.match(call, /^ -c "[^"]*(?:"[^"]*"[^"]*)*" db@localhost <\/dev\/null /, call);

  // 운영 오버레이는 앱 자격과 dba 비밀번호를 따로 필수로 받는다.
  const prod = projectVendorComposeProd('    environment:\n      POSTGRES_USER: ${DB_USERNAME:?필요}\n      POSTGRES_PASSWORD: ${DB_PASSWORD:?필요}\n      SPRING_FLYWAY_LOCATIONS: classpath:db/migration\n', 'cubrid');
  assert.match(prod, /^ {6}APP_DB_USER: \$\{DB_USERNAME/m);
  assert.match(prod, /^ {6}APP_DB_PASSWORD: \$\{DB_PASSWORD/m);
  assert.match(prod, /^ {6}DBA_PASSWORD: \$\{DB_ADMIN_PASSWORD:\?/m, 'dba 비밀번호는 앱 비밀번호와 나눈다');
  assert.match(prod, /SPRING_FLYWAY_LOCATIONS: classpath:db\/vendor\/cubrid/);
  // 주소의 ? 는 case 패턴의 글자 하나 대응이라 큰따옴표로 감싸 글자 그대로 맞춘다.
  const deploy = projectVendorDeploy(readFileSync(join(ROOT, 'scripts/deploy.sh'), 'utf8').replace(/\r\n/g, '\n'), 'cubrid');
  assert.ok(deploy.includes(`    "${source.composeUrl}") ;;\n`));
  assert.match(deploy, /DB_PASSWORD DB_ADMIN_PASSWORD/);
  const environment = projectVendorEnvironment(readFileSync(join(ROOT, '.env.example'), 'utf8').replace(/\r\n/g, '\n'), 'cubrid');
  assert.ok(environment.includes(`\nDB_URL=${source.url}\n`));
  assert.match(environment, /^# 운영 번들 DB 의 dba 비밀번호\./m);
  assert.match(environment, /^# dba 비밀번호\(DB_ADMIN_PASSWORD\)는 DB 상태 검사가 앱 계정을 만든 뒤 처음 한 번 건다\./m);
  const profile = projectVendorProfile('    url: ${DB_URL:jdbc:postgresql://localhost:5432/egovdb?currentSchema=public&prepareThreshold=0}\n    driver-class-name: org.postgresql.Driver\n', 'cubrid');
  assert.equal(profile, `    url: \${DB_URL:${source.url}}\n    driver-class-name: ${source.driverClass}\n`);

  // README 는 CUBRID 의 한계를 말하고 다른 벤더의 문장을 싣지 않는다. 재지 않은 것은 재지 않았다고 말한다.
  const ledger = loadVendorLedger(ROOT);
  const readme = vendorReadme('cubrid', ledger);
  for (const row of ledger.vendors.find(vendor => vendor.id === 'cubrid').notices.degradations) assert.ok(readme.includes(`- ${row.text}`), row.kind);
  assert.ok(readme.includes(`\`${source.urlParameters}\``));
  for (const phrase of ['SYS_DATETIME', 'ko_KR.utf8', 'EXECUTE REJECT', '`ck_`', '기본키만 참조', '그림자 키', 'DB_ADMIN_PASSWORD', '이름 없이 만든 제약', 'db/vendor/cubrid']) assert.ok(readme.includes(phrase), phrase);
  assert.match(readme, /^4\. CUBRID 에서 `V` 파일이 중간에 실패했을 때 .*재지 않았다\. .*`npm run verify:vendor-schema` 로 일회용 DB 에서 먼저 돌린다\.$/m);
  for (const other of ['VARCHAR2', 'CLOB', 'SYS_C', 'NVARCHAR', 'utf8mb4', 'Oracle', 'SQL Server', 'MySQL', '자동 커밋이라', '유니크의 엔티티 미러']) assert.ok(!readme.includes(other), other);
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
