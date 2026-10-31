import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { buildVendorModel, parseExpression, tablesInDependencyOrder, VendorTranslationGap } from './project-composer-vendor-model.mjs';
import { assertCatalogParity, assertCoverage, createEmission, emitRows, exactNumber, nextValues, renderExpression, violationExpression } from './project-composer-vendor-sql.mjs';
import { loadVendorLedger, selectableVendors, translateForAllVendors, VENDOR_ADAPTERS, VENDOR_IDS } from './project-composer-vendors.mjs';
import { clobLiteral, oracleAdapter } from './project-composer-vendor-oracle.mjs';
import { mariadbAdapter, mysqlAdapter } from './project-composer-vendor-mysql.mjs';
import { mssqlAdapter } from './project-composer-vendor-mssql.mjs';
import { cubridAdapter } from './project-composer-vendor-cubrid.mjs';
import { probeRows } from './project-composer-vendor-differential.mjs';
import { collectResults, parseCount } from './project-composer-vendor-engine.mjs';

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
