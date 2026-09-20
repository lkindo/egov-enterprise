import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { assertSchemaPreserved, buildCompositionAdminSeed, canonicalConstraintDefinition, projectCompositionMenus,
  schemaSnapshotHash, schemaSnapshotSql, selectSchemaSnapshot, verifyResolvedDbComposition } from './project-composer-db.mjs';
import { generatedMigrationSessionSql, parseDbGenerationArgs, safeDbOutputPath, sanitizePgDump } from './generate-reusable-base-db.mjs';

test('DB CLI keeps legacy profile defaults and rejects ambiguous or missing composition input', () => {
  assert.deepEqual(parseDbGenerationArgs(['--profile', 'core']), {
    profile: 'core', composition: undefined, container: 'egov-e2e-postgres', output: undefined,
    allowDirty: false, allowNonReleaseRef: false, writeMenuSnapshot: false,
  });
  assert.equal(parseDbGenerationArgs(['--composition', 'build/request.json']).composition, 'build/request.json');
  for (const args of [[], ['--composition'], ['--composition', '--allow-dirty'],
    ['--profile', 'core', '--composition', 'request.json'], ['--composition', 'a.json', '--composition', 'b.json'], ['--database', 'oracle']]) {
    assert.throws(() => parseDbGenerationArgs(args));
  }
});

test('pg_dump preserves the caller search path and all migrations share one ordered reapply session', () => {
  const clear = "SELECT pg_catalog.set_config('search_path', '', false);";
  const retained = ["SET statement_timeout = 0;", "SELECT pg_catalog.set_config('search_path', 'public', false);",
    "CREATE TABLE public.tb_probe (id integer);", `-- ${clear}`, "SELECT 'search_path' AS setting;", "SELECT pg_catalog.set_config('application_name', '', false);"];
  const baseline = sanitizePgDump(Buffer.from([retained[0], clear, ...retained.slice(1)].join('\r\n')), 'session contract');
  assert.ok(!baseline.split('\n').includes(clear), 'unqualified Flyway repeatables must keep their configured schema');
  for (const line of retained) assert.ok(baseline.split('\n').includes(line), `unrelated dump SQL must survive: ${line}`);
  const parts = { baseline, metaSeed: 'INSERT INTO public.meta_probe VALUES (1);',
    frameworkSeed: Buffer.from('INSERT INTO tb_probe VALUES (1);'), adminSeed: 'SELECT id FROM tb_probe;' };
  assert.equal(generatedMigrationSessionSql(parts), [baseline, parts.metaSeed, parts.frameworkSeed.toString(), parts.adminSeed].join('\n'));
  for (const key of Object.keys(parts)) assert.throws(() => generatedMigrationSessionSql({ ...parts, [key]: undefined }), /every baseline and seed/);
});

test('DB output rejects existing paths, lexical escapes and junction escapes before database access', () => {
  const outputRoot = resolve('build/reusable-base');
  mkdirSync(outputRoot, { recursive: true });
  const inside = mkdtempSync(join(outputRoot, 'path-contract-'));
  const outside = mkdtempSync(join(tmpdir(), 'composer-db-output-'));
  const link = join(inside, 'outside-link');
  let linked = false;
  try {
    const output = join(inside, 'new', 'project');
    assert.equal(safeDbOutputPath(output, 'custom', 'test'), output);
    assert.throws(() => safeDbOutputPath(inside, 'custom', 'test'), /덮어쓰지/);
    assert.throws(() => safeDbOutputPath(outside, 'custom', 'test'), /아래여야/);
    symlinkSync(outside, link, process.platform === 'win32' ? 'junction' : 'dir');
    linked = true;
    assert.throws(() => safeDbOutputPath(join(link, 'new', 'project'), 'custom', 'test'), /물리 경로/);
  } finally {
    if (linked) unlinkSync(link);
    rmSync(inside, { recursive: true, force: true });
    rmSync(outside, { recursive: true, force: true });
  }
});

const snapshot = {
  columns: ['tb_bbs_master', 'tb_cmnty_info', 'tb_user_info'].map(table_name => ({ table_name, column_name: 'id', is_nullable: 'NO', column_default: null })),
  constraints: [
    { table_name: 'tb_bbs_master', name: 'pk_bbs', type: 'p', referenced_table: null, definition: 'PRIMARY KEY (id)', validated: true },
    { table_name: 'tb_bbs_master', name: 'fk_tb_bbs_master_tb_cmnty_info', type: 'f', referenced_table: 'tb_cmnty_info', definition: 'FOREIGN KEY (cmnty_sn) REFERENCES tb_cmnty_info(cmnty_sn)', validated: true },
    { table_name: 'tb_bbs_master', name: 'fk_bbs_user', type: 'f', referenced_table: 'tb_user_info', definition: 'FOREIGN KEY (owner) REFERENCES tb_user_info(id)', validated: true },
  ],
  indexes: [{ table_name: 'tb_bbs_master', name: 'ix_bbs_cmnty', definition: 'CREATE INDEX ix_bbs_cmnty ON public.tb_bbs_master USING btree (cmnty_sn)' }],
  triggers: [{ table_name: 'tb_bbs_master', name: 'tr_bbs', definition: 'unchanged', enabled: 'O' }],
  sequences: [{ name: 'sq_bbs', increment_by: 1, start_value: 1 }],
};
const reviewedForeignKeys = [{ name: 'fk_tb_bbs_master_tb_cmnty_info', childTable: 'tb_bbs_master', parentTable: 'tb_cmnty_info' }];

test('composition consumers re-resolve every field and reject source/layout/table/permission tampering', () => {
  const resolved = { schemaVersion: 1, compositionHash: 'a'.repeat(64), database: { vendor: 'postgresql' },
    sourceRef: 'v-test', tables: ['tb_user_info'], explicitSequences: [], backendLayout: 'single-module', permissionCodes: ['USER_READ'] };
  const input = { ...structuredClone(resolved), sourceCommit: 'b'.repeat(40) };
  const resolveReference = reference => { assert.equal(reference, resolved.sourceRef); return input.sourceCommit; };
  assert.deepEqual(verifyResolvedDbComposition(input, resolved, input.sourceCommit, resolveReference), input);
  for (const [key, value] of [['tables', ['tb_user_info', 'tb_arbitrary']], ['backendLayout', 'multi-module'],
    ['permissionCodes', ['USER_DELETE']], ['compositionHash', 'c'.repeat(64)], ['sourceCommit', 'd'.repeat(40)]]) {
    assert.throws(() => verifyResolvedDbComposition({ ...input, [key]: value }, resolved, input.sourceCommit, resolveReference), /Composition/);
  }
  assert.throws(() => verifyResolvedDbComposition(input, resolved, 'unknown'), /sourceCommit/);
  assert.throws(() => verifyResolvedDbComposition(input, resolved, input.sourceCommit, () => 'c'.repeat(40)), /sourceRef/);
  assert.throws(() => verifyResolvedDbComposition(input, resolved, input.sourceCommit), /sourceRef/);
});

test('only the exact reviewed optional foreign key can disappear; shared/selected constraints survive', () => {
  const projection = selectSchemaSnapshot(snapshot, ['tb_bbs_master', 'tb_user_info'], ['sq_bbs'], reviewedForeignKeys);
  assert.deepEqual(projection.omittedForeignKeys, [{ table: 'tb_bbs_master', name: 'fk_tb_bbs_master_tb_cmnty_info', referencedTable: 'tb_cmnty_info' }]);
  assert.deepEqual(projection.snapshot.constraints.map(row => row.name).sort(), ['fk_bbs_user', 'pk_bbs']);
  assert.equal(projection.snapshot.indexes.length, 1, 'optional FK projection cannot erase its index');
  assert.equal(selectSchemaSnapshot(snapshot, ['tb_bbs_master', 'tb_user_info', 'tb_cmnty_info'], ['sq_bbs']).omittedForeignKeys.length, 0);
  assert.throws(() => selectSchemaSnapshot(snapshot, ['tb_bbs_master'], ['sq_bbs']), /excluded FK target/);
  const unknown = structuredClone(snapshot);
  unknown.constraints[1].name = 'fk_unreviewed';
  assert.throws(() => selectSchemaSnapshot(unknown, ['tb_bbs_master', 'tb_user_info'], ['sq_bbs'], reviewedForeignKeys), /excluded FK target/);
  assert.throws(() => selectSchemaSnapshot(snapshot, ['tb_bbs_master', 'tb_user_info'], ['sq_bbs']), /excluded FK target/);
  assert.throws(() => selectSchemaSnapshot(snapshot, ['tb_nonexistent'], []), /absent from physical/);
  assert.throws(() => selectSchemaSnapshot(snapshot, ['tb_user_info'], ['sq_missing']), /sequence is absent/);
});

test('physical projection/reapply detects collateral columns, FK, index, trigger and sequence changes', () => {
  const expected = selectSchemaSnapshot(snapshot, ['tb_bbs_master', 'tb_user_info'], ['sq_bbs'], reviewedForeignKeys).snapshot;
  assert.doesNotThrow(() => assertSchemaPreserved(expected, structuredClone(expected)));
  for (const key of Object.keys(expected)) {
    const changed = structuredClone(expected);
    changed[key].pop();
    assert.throws(() => assertSchemaPreserved(expected, changed), new RegExp(key));
  }
  const changedDefault = structuredClone(expected);
  changedDefault.columns[0].column_default = '42';
  assert.throws(() => assertSchemaPreserved(expected, changedDefault), /columns/);
  assert.equal(schemaSnapshotHash(expected), schemaSnapshotHash(structuredClone(expected)));
  assert.match(schemaSnapshotSql(), /information_schema\.columns/);
  assert.match(schemaSnapshotSql(), /pg_get_constraintdef/);
  assert.match(schemaSnapshotSql(), /pg_indexes/);
  assert.match(schemaSnapshotSql(), /pg_sequences/);
});

test('pg_dump literal-array cast distribution is equivalent while enum/operator changes remain red', () => {
  const original = "CHECK (use_yn::text = ANY (ARRAY['Y'::character varying, 'N'::character varying]::text[]))";
  const restored = "CHECK (use_yn::text = ANY (ARRAY['Y'::character varying::text, 'N'::character varying::text]))";
  assert.equal(canonicalConstraintDefinition(original), restored);
  assert.equal(canonicalConstraintDefinition(restored), restored);
  const expected = selectSchemaSnapshot(snapshot, ['tb_bbs_master', 'tb_user_info'], ['sq_bbs'], reviewedForeignKeys).snapshot;
  expected.constraints.push({ table_name: 'tb_bbs_master', name: 'ck_flag', type: 'c', definition: original, validated: true });
  const actual = structuredClone(expected);
  actual.constraints.at(-1).definition = restored;
  assert.doesNotThrow(() => assertSchemaPreserved(expected, actual));
  for (const definition of [restored.replace("'N'", "'X'"), restored.replace(' = ANY ', ' <> ALL '),
    restored.replace('::text,', '::varchar,'), restored.replace("'Y'::character varying::text, ", '')]) {
    actual.constraints.at(-1).definition = definition;
    assert.throws(() => assertSchemaPreserved(expected, actual), /constraints changed/);
  }
});

const menu = (menu_sn, up_menu_sn, modern_route, prgrm_file_nm = null) => ({
  menu_sn, up_menu_sn, modern_route, prgrm_file_nm, menu_ordr: menu_sn, menu_nm: `Menu ${menu_sn}`,
  menu_expln: null, use_yn: 'Y', del_yn: 'N',
});
const menus = [menu(100, null, '/excluded-parent'), menu(101, 100, '/admin/user/manage', 'USER_LIST'),
  menu(102, 100, '/admin/help?tab=FAQ'), menu(103, 100, '/admin/help?tab=COMMUNITY'), menu(200, null, '/excluded-leaf')];
const programs = [{ prgrm_file_nm: 'USER_LIST', prgrm_korn_nm: "Users' list", url: '/api/v1/admin/users', prgrm_strg_path: null, prgrm_expln: null }];

test('menu projection includes ancestor-only folders and exact query scopes, and preserves program FK rows', () => {
  const result = projectCompositionMenus({ menus, programs, menuRoutes: ['/admin/user/manage', '/admin/help?tab=FAQ'] });
  assert.deepEqual(result.menus.map(row => row.menu_sn), [100, 101, 102]);
  assert.equal(result.menus[0].modern_route, null);
  assert.deepEqual(result.programs, programs);
  assert.throws(() => projectCompositionMenus({ menus, programs: [], menuRoutes: ['/admin/user/manage'] }), /program is missing/);
  assert.throws(() => projectCompositionMenus({ menus: menus.filter(row => row.menu_sn !== 100), programs, menuRoutes: ['/admin/user/manage'] }), /missing or disabled parent/);
  assert.throws(() => projectCompositionMenus({ menus: [menu(100, 101, null), menu(101, 100, '/selected')], programs, menuRoutes: ['/selected'] }), /cycle/);
  assert.throws(() => projectCompositionMenus({ menus, programs, menuRoutes: [] }), /no usable menu/);
  assert.throws(() => projectCompositionMenus({ menus, programs, menuRoutes: ['https://external.test/'] }), /Invalid menu route/);
});

test('selected seed keeps fresh-bootstrap and revocation guards while separating NAVIGATION and OPERATION', () => {
  const bootstrapSql = readFileSync(new URL('../api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql', import.meta.url), 'utf8');
  const permissionCatalog = JSON.parse(readFileSync(new URL('../config/governance/permission-catalog.json', import.meta.url), 'utf8'));
  const projection = projectCompositionMenus({ menus, programs, menuRoutes: ['/admin/user/manage'] });
  const options = { bootstrapSql, projection, permissionCatalog, permissionCodes: ['AUTHRT_GRANT', 'AUTHRT_ASSIGN', 'USER_READ'] };
  const sql = buildCompositionAdminSeed(options);
  assert.equal(buildCompositionAdminSeed({ ...options, bootstrapSql: bootstrapSql.replace(/\r?\n/g, '\r\n') }), sql);
  assert.doesNotMatch(sql, /\r/);
  assert.match(sql, /IF fresh_menus AND \(legacy_model OR fresh_authorization\) THEN/);
  assert.match(sql, /dmnd_idntfr <> 'bootstrap:framework'/);
  assert.match(sql, /legacy_authorization_contract/);
  assert.match(sql, /WHERE menu_sn IN \(100,101\)/);
  assert.match(sql, /'ROLE_ADMIN','NAVIGATION'/);
  assert.match(sql, /'OPERATION',seed\.permission_code/);
  assert.match(sql, /Users'' list/);
  assert.ok(sql.includes('/api/v1/admin/users'));
  assert.doesNotMatch(sql, /'NOTE_SEND'|'SURVEY_READ'|'USER_DELETE'/);
  assert.doesNotMatch(sql, /menu_sn BETWEEN 910 AND 920/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, permissionCodes: ['UNKNOWN'] }), /unknown OPERATION/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, permissionCodes: ['USER_READ'] }), /preserve permission administration/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, bootstrapSql: bootstrapSql.replace('-- BEGIN GENERATED BASE OPERATION GRANTS', '-- drift') }), /marker/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, bootstrapSql: bootstrapSql.replaceAll('menu_sn BETWEEN 910 AND 920', 'true') }), /NAVIGATION inventory/);
});
