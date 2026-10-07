import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, unlinkSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import test from 'node:test';
import { assertDeclaredCrossDomainForeignKeys, assertSchemaPreserved, buildCompositionAdminSeed, canEnterMenuRoute, projectCompositionNavigation, canonicalConstraintDefinition, projectCompositionMenus,
  schemaSnapshotHash, schemaSnapshotSql, selectSchemaSnapshot, verifyResolvedDbComposition } from './project-composer-db.mjs';
import { assertCompositionOperationGrants, generatedMigrationSessionSql, parseDbGenerationArgs, safeDbOutputPath, sanitizePgDump } from './generate-reusable-base-db.mjs';

test('composition DB requires exact default group/code grants and keeps available unassigned capabilities ungranted', () => {
  const catalog = { permissions: [
    { code: 'AUTHRT_GRANT', defaultGroups: ['ROLE_ADMIN'] },
    { code: 'USER_READ', defaultGroups: ['ROLE_ADMIN', 'ROLE_USER'] },
    { code: 'DWORK_RETRY', defaultGroups: [] },
    { code: 'SURVEY_READ', defaultGroups: ['ROLE_USER'] },
  ] };
  const selected = ['AUTHRT_GRANT', 'USER_READ', 'DWORK_RETRY'];
  const grants = [['ROLE_ADMIN', 'AUTHRT_GRANT'], ['ROLE_ADMIN', 'USER_READ'], ['ROLE_USER', 'USER_READ']];
  assert.doesNotThrow(() => assertCompositionOperationGrants([...grants].reverse(), selected, catalog));
  for (const changed of [grants.slice(0, -1),
    [...grants, ['ROLE_ADMIN', 'DWORK_RETRY']],
    [...grants, ['ROLE_USER', 'SURVEY_READ']],
    [...grants.slice(0, -1), ['ROLE_SYSTEM', 'USER_READ']]]) {
    assert.throws(() => assertCompositionOperationGrants(changed, selected, catalog), /group\/code grants.*불일치/);
  }
  assert.throws(() => assertCompositionOperationGrants([...grants, grants[0]], selected, catalog), /Duplicate/);
  assert.throws(() => assertCompositionOperationGrants([['ROLE_ADMIN']], selected, catalog), /Invalid/);
  assert.throws(() => assertCompositionOperationGrants(grants, [...selected, 'UNKNOWN'], catalog), /unknown OPERATION/);
  assert.throws(() => assertCompositionOperationGrants([], ['USER_READ'], {
    permissions: [{ code: 'USER_READ', defaultGroups: ['UNREVIEWED'] }],
  }), /Unknown default permission group/);
});

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

test('migrated cross-domain foreign keys must equal the declared required and optional contracts', () => {
  const catalog = {
    core: { tables: ['tb_user_info'] },
    capabilities: [
      { id: 'board', database: { tables: ['tb_bbs_item', 'tb_tmplt_info'] } },
      { id: 'comment', database: { tables: ['tb_bbs_comment'] } },
      { id: 'template', database: { tables: ['tb_tmplt_info'] } },
      { id: 'system', database: { tables: ['tb_cmnty_info'] } },
    ],
    requiredForeignKeys: [{ name: 'fk_comment_item', childTable: 'tb_bbs_comment', parentTable: 'tb_bbs_item' }],
    optionalForeignKeys: [{ name: 'fk_item_cmnty', childTable: 'tb_bbs_item', parentTable: 'tb_cmnty_info' }],
  };
  const fk = (table_name, name, referenced_table) => ({ table_name, name, type: 'f', referenced_table });
  const base = [fk('tb_bbs_comment', 'fk_comment_item', 'tb_bbs_item'), fk('tb_bbs_item', 'fk_item_cmnty', 'tb_cmnty_info'),
    fk('tb_bbs_item', 'fk_item_user', 'tb_user_info'), fk('tb_bbs_item', 'fk_item_tmplt', 'tb_tmplt_info'),
    { table_name: 'tb_bbs_item', name: 'pk_item', type: 'p', referenced_table: null }];
  // Core targets and tables shared by both owners are not cross-domain edges.
  assert.deepEqual(assertDeclaredCrossDomainForeignKeys({ constraints: base }, catalog),
    ['fk_comment_item tb_bbs_comment->tb_bbs_item', 'fk_item_cmnty tb_bbs_item->tb_cmnty_info']);
  assert.throws(() => assertDeclaredCrossDomainForeignKeys({ constraints: [...base, fk('tb_cmnty_info', 'fk_new', 'tb_bbs_comment')] }, catalog),
    /undeclared: fk_new tb_cmnty_info->tb_bbs_comment/);
  assert.throws(() => assertDeclaredCrossDomainForeignKeys({ constraints: base.slice(1) }, catalog), /stale: fk_comment_item/);
  assert.throws(() => assertDeclaredCrossDomainForeignKeys({ constraints: [...base, fk('tb_unknown', 'fk_x', 'tb_bbs_item')] }, catalog),
    /without catalog ownership/);
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

const menu = (menu_sn, up_menu_sn, modern_route, menu_nm = `Menu ${menu_sn}`) => ({
  menu_sn, up_menu_sn, modern_route, menu_ordr: menu_sn, menu_nm,
  menu_expln: null, use_yn: 'Y', del_yn: 'N',
});
const menus = [menu(100, null, '/excluded-parent'), menu(101, 100, '/admin/user/manage', "Users' list"),
  menu(102, 100, '/admin/help/faq?tab=FAQ'), menu(103, 100, '/admin/help?tab=COMMUNITY'), menu(104, 100, '/admin/help/?sort=new&tab=WIKI'),
  menu(200, null, '/excluded-leaf')];

test('menu projection follows the retained screen path and hides only tabs of excluded contributors', () => {
  const projected = (menuRoutes, excludedMenuTabs) => projectCompositionMenus({ menus, menuRoutes, excludedMenuTabs }).menus;
  const result = projected(['/admin/user/manage', '/admin/help'], ['/admin/help?tab=COMMUNITY']);
  // 102 의 셸(/admin/help/faq)은 남지 않았고, 103 은 빠진 기능의 탭이다. 104 는 셸 소유 탭이라 다른 쿼리와 무관하게 남는다.
  assert.deepEqual(result.map(row => row.menu_sn), [100, 101, 104]);
  assert.equal(result[0].modern_route, null);
  assert.equal(result.at(-1).modern_route, '/admin/help/?sort=new&tab=WIKI', 'the destination is kept exactly as seeded');
  assert.deepEqual(projected(['/admin/user/manage', '/admin/help', '/admin/help/faq'], []).map(row => row.menu_sn), [100, 101, 102, 103, 104]);
  assert.deepEqual(projected(['/admin/user/manage'], ['/admin/help?tab=COMMUNITY']).map(row => row.menu_sn), [100, 101],
    'a tab contribution never retains a screen by itself');
  assert.throws(() => projected(['/admin/help?tab=FAQ'], []), /ownership is by path/);
  assert.throws(() => projected(['/admin/help'], ['/admin/help']), /must name its tab/);
  // [2026-10-05] 레거시 연결 프로그램은 앱이 읽지 않으므로 투영이 싣지 않는다(GAP-PROGRAM-001).
  assert.deepEqual(Object.keys(projectCompositionMenus({ menus, menuRoutes: ['/admin/user/manage'] })), ['menus']);
  assert.throws(() => projectCompositionMenus({ menus: menus.filter(row => row.menu_sn !== 100), menuRoutes: ['/admin/user/manage'] }), /missing or disabled parent/);
  assert.throws(() => projectCompositionMenus({ menus: [menu(100, 101, null), menu(101, 100, '/selected')], menuRoutes: ['/selected'] }), /cycle/);
  assert.throws(() => projectCompositionMenus({ menus, menuRoutes: [] }), /no usable menu/);
  assert.throws(() => projectCompositionMenus({ menus, menuRoutes: ['https://external.test/'] }), /Invalid menu route/);
});

test('selected seed keeps fresh-bootstrap and revocation guards while separating NAVIGATION and OPERATION', () => {
  const bootstrapSql = readFileSync(new URL('../api-server/src/main/resources/db/migration/R__zz_seed_base_admin.sql', import.meta.url), 'utf8');
  const permissionCatalog = JSON.parse(readFileSync(new URL('../config/governance/permission-catalog.json', import.meta.url), 'utf8'));
  const projection = projectCompositionMenus({ menus, menuRoutes: ['/admin/user/manage'] });
  const options = { bootstrapSql, projection, permissionCatalog,
    navigation: [{ authrt_cd: 'ROLE_ADMIN', menu_sn: 100 }, { authrt_cd: 'ROLE_ADMIN', menu_sn: 101 }, { authrt_cd: 'ROLE_USER', menu_sn: 101 }],
    permissionCodes: ['AUTHRT_GRANT', 'AUTHRT_ASSIGN', 'USER_READ', 'DWORK_READ', 'DWORK_RETRY', 'MFA_RECOVER', 'NOTICE_EDIT', 'FAQ_EDIT'] };
  const sql = buildCompositionAdminSeed(options);
  assert.equal(buildCompositionAdminSeed({ ...options, bootstrapSql: bootstrapSql.replace(/\r?\n/g, '\r\n') }), sql);
  assert.doesNotMatch(sql, /\r/);
  assert.match(sql, /IF fresh_menus AND \(legacy_model OR fresh_authorization\) THEN/);
  assert.match(sql, /dmnd_idntfr <> 'bootstrap:framework'/);
  assert.match(sql, /legacy_authorization_contract/);
  assert.match(sql, /WHERE menu_sn IN \(100,101\)/);
  assert.match(sql, /seed\.group_code,'NAVIGATION',seed\.menu_sn/);
  assert.match(sql, /\('ROLE_ADMIN', '100'\),\n\s+\('ROLE_ADMIN', '101'\),\n\s+\('ROLE_USER', '101'\)/);
  assert.doesNotMatch(sql, /SELECT 'ROLE_ADMIN','NAVIGATION',menu_sn::text/, 'the administrator-only statement is replaced, not appended');
  assert.match(sql, /'OPERATION',seed\.permission_code/);
  assert.match(sql, /Users'' list/);
  // [2026-10-05] 생성물 메뉴 시드는 레거시 연결 프로그램 열·프로그램 원장 행을 싣지 않는다(GAP-PROGRAM-001).
  //   (부트스트랩 SQL 의 구 모델 분기 — 구 매핑 표가 있을 때만 도는 URL 인가 anchor — 는 Contract 단계에서 걷는다.)
  assert.match(sql, /INSERT INTO tb_menu_info\n\s+\(menu_sn,up_menu_sn,menu_ordr,menu_nm,menu_expln,modern_route,use_yn,del_yn,/);
  assert.doesNotMatch(sql, /\/api\/v1\/admin\/users/);
  assert.doesNotMatch(sql, /'NOTE_SEND'|'SURVEY_READ'|'USER_DELETE'/);
  assert.doesNotMatch(sql, /'DWORK_READ'|'DWORK_RETRY'|'MFA_RECOVER'|'NOTICE_EDIT'|'FAQ_EDIT'/);
  assert.doesNotMatch(sql, /menu_sn BETWEEN 910 AND 920/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, permissionCodes: ['UNKNOWN'] }), /unknown OPERATION/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, permissionCodes: ['USER_READ'] }), /preserve permission administration/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, bootstrapSql: bootstrapSql.replace('-- BEGIN GENERATED BASE OPERATION GRANTS', '-- drift') }), /marker/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, bootstrapSql: bootstrapSql.replaceAll('menu_sn BETWEEN 910 AND 920', 'true') }), /NAVIGATION inventory/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, bootstrapSql: bootstrapSql.replace("SELECT 'ROLE_ADMIN','NAVIGATION',menu_sn::text", "SELECT 'ROLE_ADMIN','NAVIGATION',menu_sn::varchar") }), /grant statement drifted/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, navigation: [] }), /must name a known group/);
  assert.throws(() => buildCompositionAdminSeed({ ...options, navigation: [{ authrt_cd: 'ROLE_USER', menu_sn: 200 }] }), /selected menu/);
});

test('group navigation keeps original grants for selected menus, drops empty categories and must be enterable', () => {
  const tree = [menu(1, null, null), menu(2, 1, '/admin/user/manage'), menu(3, 1, '/note'), menu(4, null, null), menu(5, 4, '/admin/help')];
  const pageAccess = { pagePermissions: { '/admin/user/manage': ['USER_READ'], '/admin/help': [], '/admin/system/menus': ['MENU_READ', 'MENU_UPDATE'] },
    pagePermissionModes: { '/admin/system/menus': 'ALL' } };
  const original = [{ authrt_cd: 'ROLE_ADMIN', menu_sn: 1 }, { authrt_cd: 'ROLE_ADMIN', menu_sn: 2 }, { authrt_cd: 'ROLE_ADMIN', menu_sn: 3 },
    { authrt_cd: 'ROLE_ADMIN', menu_sn: 4 }, { authrt_cd: 'ROLE_ADMIN', menu_sn: 5 }, { authrt_cd: 'ROLE_USER', menu_sn: 1 },
    { authrt_cd: 'ROLE_USER', menu_sn: 3 }, { authrt_cd: 'ROLE_USER', menu_sn: 4 }, { authrt_cd: 'ROLE_USER', menu_sn: 99 }];
  const operationGrants = [['ROLE_ADMIN', 'USER_READ']];
  const projected = projectCompositionNavigation({ menus: tree, navigation: original, operationGrants, pageAccess });
  // ROLE_USER 의 분류 4 는 그 그룹이 표시하는 하위가 없어 빠진다. 선택되지 않은 메뉴 99 의 배정도 빠진다.
  assert.deepEqual(projected.map(row => `${row.authrt_cd}:${row.menu_sn}`),
    ['ROLE_ADMIN:1', 'ROLE_ADMIN:2', 'ROLE_ADMIN:3', 'ROLE_ADMIN:4', 'ROLE_ADMIN:5', 'ROLE_USER:1', 'ROLE_USER:3']);
  // 사용자 관리 화면에 들어갈 권한이 없는 그룹이 그 메뉴를 표시하면 생성을 멈춘다.
  assert.throws(() => projectCompositionNavigation({ menus: tree, navigation: [...original, { authrt_cd: 'ROLE_USER', menu_sn: 2 }], operationGrants, pageAccess }),
    /cannot enter: ROLE_USER:2\(\/admin\/user\/manage\)/);
  assert.throws(() => projectCompositionNavigation({ menus: tree, navigation: original.filter(row => row.authrt_cd !== 'ROLE_ADMIN'), operationGrants, pageAccess }),
    /administrator without menus/);
  // 진입 판정은 라우트 게이트와 같다: /admin 밖은 열려 있고, 등록되지 않은 /admin 경로는 닫혀 있으며, ALL 은 모두를 요구한다.
  const can = (route, codes) => canEnterMenuRoute(route, new Set(codes), pageAccess);
  assert.equal(can('/note', []), true);
  assert.equal(can('/admin/help?tab=FAQ', []), true);
  assert.equal(can('/admin/unregistered', ['USER_READ']), false);
  assert.equal(can('/admin/system/menus', ['MENU_READ']), false);
  assert.equal(can('/admin/system/menus', ['MENU_READ', 'MENU_UPDATE']), true);
  assert.equal(can('/Admin/user/manage', []), false, 'case does not bypass the gate');
});
