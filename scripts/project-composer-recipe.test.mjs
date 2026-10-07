import assert from 'node:assert/strict';
import test from 'node:test';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { ProjectRecipeError, resolveProjectRecipe, verifyProjectComposition } from './project-composer-recipe.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { menuRouteKey, projectCompositionMenus, projectCompositionNavigation } from './project-composer-db.mjs';
import { loadProjectComposerMenus, projectComposerMenuPreview } from './project-composer-menu-preview.mjs';

const catalog = loadProjectComposerCatalog();
const recipe = selection => ({ schemaVersion: 1, project: { name: 'agency-project' }, sourceRef: 'v1.0.0', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });

test('required cross-domain foreign keys are reported without auto-inclusion when their parent is excluded', () => {
  const violated = new Map(catalog.capabilities.map(capability => [capability.id,
    resolveProjectRecipe(recipe({ domains: [capability.id] }), catalog).foreignKeyViolations.map(row => row.name)]));
  for (const [id, names] of violated) {
    assert.deepEqual(names, ['survey', 'stats'].includes(id) ? ['fk_tb_dta_use_stats_tb_bbs_item'] : [], id);
  }
  const survey = resolveProjectRecipe(recipe({ domains: ['survey'] }), catalog);
  assert.ok(!survey.resolvedDomains.includes('board'), 'a violation must not silently pull the parent domain');
  assert.deepEqual(resolveProjectRecipe(recipe({ domains: ['board', 'survey'] }), catalog).foreignKeyViolations, []);
  for (const preset of catalog.presets) assert.deepEqual(resolveProjectRecipe(recipe({ preset: preset.id }), catalog).foreignKeyViolations, [], preset.id);
});

test('core plus board and survey includes required UI/domain closure without mail or unrelated packs', () => {
  const plan = resolveProjectRecipe(recipe({ domains: ['board', 'survey'] }), catalog);
  assert.equal(plan.profile, 'custom');
  assert.deepEqual(plan.selectedDomains, ['board', 'survey']);
  assert.deepEqual(plan.resolvedDomains, ['board', 'comment', 'help', 'note', 'scrap', 'stats', 'survey', 'system', 'template']);
  for (const absent of ['mail', 'sms', 'schedule', 'report']) assert.ok(!plan.resolvedDomains.includes(absent));
  assert.ok(!plan.tables.includes('tb_email_dsptch_manage'));
  assert.ok(plan.tables.includes('tb_srvy_info') && plan.tables.includes('tb_tmplt_info'));
  assert.ok(plan.permissionCodes.includes('BOARD_READ') && !plan.permissionCodes.includes('MAIL_SEND'));
  assert.ok(plan.menuRoutes.includes('/admin/help') && plan.menuRoutes.includes('/admin/collaboration'));
  assert.ok(!plan.menuRoutes.some(route => route.includes('?')), 'menus are owned by screen path');
  assert.deepEqual(plan.excludedMenuTabs, [], 'every tab contributor of the retained knowledge hub is retained');
  assert.ok(plan.frontend.removePaths.includes('src/services/business/mail/MailService.ts'));
  assert.ok(plan.autoIncluded.every(item => item.reason.length > 10));
  assert.deepEqual(plan, resolveProjectRecipe(recipe({ domains: ['survey', 'board'] }), catalog));
});

test('empty/core selection, each independent capability, shared resources and preset semantics remain explicit', () => {
  const core = resolveProjectRecipe(recipe({ domains: [] }), catalog);
  assert.deepEqual(core.resolvedDomains, []);
  assert.deepEqual(core.tables, catalog.core.tables);
  for (const capability of catalog.capabilities) {
    const plan = resolveProjectRecipe(recipe({ domains: [capability.id] }), catalog);
    assert.ok(plan.resolvedDomains.includes(capability.id));
    for (const dependency of capability.requires) assert.ok(plan.resolvedDomains.includes(dependency.domain));
    assert.deepEqual(verifyProjectComposition(JSON.parse(JSON.stringify(plan)), catalog), plan);
  }
  const template = resolveProjectRecipe(recipe({ domains: ['template'] }), catalog);
  assert.deepEqual(template.resolvedDomains, ['template']);
  assert.ok(template.tables.includes('tb_tmplt_info'));
  assert.ok(!template.frontend.removePaths.includes('src/app/admin/sanctn/WorkflowHubClient.tsx'));
  for (const preset of catalog.presets) {
    const plan = resolveProjectRecipe(recipe({ preset: preset.id }), catalog);
    assert.equal(plan.profile, preset.id);
    assert.deepEqual(plan.resolvedDomains, preset.domains);
    assert.deepEqual(plan.packs, preset.packs);
    assert.deepEqual(plan.frontend.removePaths, preset.frontendRemovePaths);
  }
  const collaboration = resolveProjectRecipe(recipe({ preset: 'collaboration' }), catalog);
  assert.ok(!collaboration.resolvedDomains.includes('help'));
  assert.ok(!collaboration.resolvedDomains.includes('system'));
  assert.equal(collaboration.optionalForeignKeys[0].name, 'fk_tb_bbs_master_tb_cmnty_info');
});

test('unsupported or unsafe recipes fail before any generation can start', () => {
  const invalid = [
    { ...recipe({ domains: [] }), schemaVersion: 2 },
    { ...recipe({ domains: [] }), secrets: 'must-not-be-accepted' },
    { ...recipe({ domains: [] }), project: { name: '../escape' } },
    { ...recipe({ domains: [] }), project: { name: 'con' } },
    { ...recipe({ domains: [] }), project: { name: 'valid', password: 'must-not-be-accepted' } },
    { ...recipe({ domains: [] }), sourceRef: '--upload-pack=command' },
    { ...recipe({ domains: [] }), sourceRef: 'main;whoami' },
    { ...recipe({ domains: [] }), sourceRef: 'refs/../head' },
    recipe({ domains: ['unknown'] }), recipe({ domains: ['survey', 'survey'] }),
    recipe({ domains: ['foundation'] }), recipe({ domains: 'survey' }), recipe({}),
    recipe({ domains: [], preset: 'core' }), recipe({ preset: 'missing' }), recipe({ domains: [], extra: true }),
    { ...recipe({ domains: [] }), database: { vendor: 'oracle' } },
    { ...recipe({ domains: [] }), database: { vendor: 'postgresql', password: 'must-not-be-accepted' } },
    { ...recipe({ domains: [] }), backendLayout: 'single' },
  ];
  for (const candidate of invalid) assert.throws(() => resolveProjectRecipe(candidate, catalog), error => error instanceof ProjectRecipeError && error.field.length > 0);
});

test('canonical plans reject caller-injected tables, permission changes and stale catalog hashes', () => {
  const plan = resolveProjectRecipe(recipe({ domains: ['survey'] }), catalog);
  for (const tamper of [
    value => value.tables.push('tb_email_dsptch_manage'),
    value => value.permissionCodes.push('MAIL_SEND'),
    value => { value.resolvedDomains = []; },
    value => { value.compositionHash = '0'.repeat(64); },
    value => { value.unrecognized = true; },
  ]) {
    const changed = structuredClone(plan); tamper(changed);
    assert.throws(() => verifyProjectComposition(changed, catalog), /does not match/);
  }
  assert.deepEqual(verifyProjectComposition({ ...plan, sourceCommit: 'a'.repeat(40) }, catalog), plan);
  const changedCatalog = structuredClone(catalog);
  changedCatalog.capabilities[0].available = false;
  assert.throws(() => resolveProjectRecipe(recipe({ domains: [] }), changedCatalog), /hash mismatch/);
  const { catalogHash, ...body } = changedCatalog;
  changedCatalog.catalogHash = compositionDigest(body);
  assert.throws(() => resolveProjectRecipe(recipe({ domains: [changedCatalog.capabilities[0].id] }), changedCatalog), /not available/);
});

test('layout remains independent of domain and DB semantics', () => {
  const multi = resolveProjectRecipe(recipe({ domains: ['survey'] }), catalog);
  const single = resolveProjectRecipe({ ...recipe({ domains: ['survey'] }), backendLayout: 'single-module' }, catalog);
  for (const key of ['tables', 'explicitSequences', 'permissionCodes', 'resolvedDomains', 'menuRoutes', 'frontend']) assert.deepEqual(single[key], multi[key]);
  assert.notEqual(single.recipeHash, multi.recipeHash);
  assert.notEqual(single.compositionHash, multi.compositionHash);
});

test('menu contracts: the full product keeps every menu, core screens keep theirs, and no selected menu is dead', () => {
  const root = resolve(import.meta.dirname, '..');
  const active = loadProjectComposerMenus(root).menus.filter(row => row.use_yn === 'Y' && row.del_yn !== 'Y');
  const preview = composition => projectComposerMenuPreview(root, composition);
  const tabOwner = new Map(catalog.capabilities.flatMap(capability => capability.menuTabs.map(route => [route, capability.id])));
  // 계약 1: 전체 구성은 활성 메뉴를 모두, 목적지까지 그대로 고른다.
  const demo = preview(resolveProjectRecipe(recipe({ preset: 'demo' }), catalog));
  assert.deepEqual(demo.map(row => [row.id, row.path]), active.map(row => [row.menu_sn, row.modern_route]));
  // 계약 2: core 화면을 가리키는 메뉴(다른 기능이 기여한 탭 제외)는 core 구성에서 목적지와 함께 고른다.
  const core = new Map(preview(resolveProjectRecipe(recipe({ preset: 'core' }), catalog)).map(row => [row.id, row.path]));
  const coreMenus = active.filter(row => row.modern_route && catalog.core.menuRoutes.includes(menuRouteKey(row.modern_route).path)
    && !tabOwner.has(menuRouteKey(row.modern_route).key));
  assert.ok(coreMenus.length > 0);
  for (const row of coreMenus) assert.equal(core.get(row.menu_sn), row.modern_route, row.menu_nm);
  // 죽은 메뉴 0: 고른 목적지는 생성물에 남는 화면 파일이고, 탭 기여자는 함께 포함된 기능이다.
  const compositions = [...catalog.presets.map(preset => recipe({ preset: preset.id })), recipe({ domains: [] }),
    ...catalog.capabilities.map(capability => recipe({ domains: [capability.id] }))].map(input => resolveProjectRecipe(input, catalog));
  const counts = {};
  for (const composition of compositions) {
    const menus = preview(composition);
    counts[composition.profile === 'custom' ? composition.selectedDomains.join('+') || 'none' : composition.profile] = menus.length;
    for (const { path } of menus.filter(row => row.path)) {
      const target = menuRouteKey(path);
      const page = target.path === '/' ? 'src/app/page.tsx' : `src/app${target.path}/page.tsx`;
      assert.ok(existsSync(join(root, 'frontend', page)), `${path}: no page`);
      assert.ok(!composition.frontend.removePaths.some(removed => page === removed || page.startsWith(`${removed}/`)), `${path}: page removed`);
      if (tabOwner.has(target.key)) assert.ok(composition.resolvedDomains.includes(tabOwner.get(target.key)), `${path}: tab owner excluded`);
    }
  }
  assert.ok(counts.core <= counts.collaboration && counts.collaboration <= counts.demo && counts.demo === active.length, JSON.stringify(counts));
});

test('every composition starts group sidebars from the original grants and shows no menu a group cannot enter', () => {
  const root = resolve(import.meta.dirname, '..');
  const snapshot = loadProjectComposerMenus(root);
  const permissions = JSON.parse(readFileSync(join(root, 'config/governance/permission-catalog.json'), 'utf8'));
  const pageAccess = { pagePermissions: permissions.pagePermissions, pagePermissionModes: permissions.pagePermissionModes };
  const project = composition => {
    const selected = new Set(composition.permissionCodes);
    const operationGrants = permissions.permissions.filter(row => selected.has(row.code)).flatMap(row => row.defaultGroups.map(group => [group, row.code]));
    const { menus } = projectCompositionMenus({ menus: snapshot.menus, menuRoutes: composition.menuRoutes, excludedMenuTabs: composition.excludedMenuTabs });
    return { menus, navigation: projectCompositionNavigation({ menus, navigation: snapshot.navigation, operationGrants, pageAccess }) };
  };
  const active = new Set(snapshot.menus.filter(row => row.use_yn === 'Y' && row.del_yn !== 'Y').map(row => row.menu_sn));
  const demo = project(resolveProjectRecipe(recipe({ preset: 'demo' }), catalog));
  // 전체 구성은 원본의 활성 메뉴 배정을 그룹마다 그대로 가진다.
  assert.deepEqual(demo.navigation.map(row => `${row.authrt_cd}:${row.menu_sn}`),
    snapshot.navigation.filter(row => active.has(row.menu_sn)).map(row => `${row.authrt_cd}:${row.menu_sn}`));
  for (const input of [...catalog.presets.map(preset => recipe({ preset: preset.id })), recipe({ domains: [] }),
    ...catalog.capabilities.map(capability => recipe({ domains: [capability.id] }))]) {
    const composition = resolveProjectRecipe(input, catalog);
    const { menus, navigation } = project(composition);
    const label = composition.profile === 'custom' ? composition.selectedDomains.join('+') || 'none' : composition.profile;
    // 관리자는 선택 메뉴를 모두 보고, 일반 사용자도 메뉴를 받는다(원본 사이드바와 같은 출발점).
    assert.deepEqual(navigation.filter(row => row.authrt_cd === 'ROLE_ADMIN').map(row => row.menu_sn), menus.map(row => row.menu_sn), label);
    assert.ok(navigation.some(row => row.authrt_cd === 'ROLE_USER'), `${label}: ROLE_USER has no menu`);
  }
});
