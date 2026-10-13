import assert from 'node:assert/strict';
import test from 'node:test';
import { compositionDigest, loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { ProjectRecipeError, resolveGeneratorComposition, resolveProjectRecipe, verifyProjectComposition } from './project-composer-recipe.mjs';
import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { menuRouteKey, projectCompositionMenus, projectCompositionNavigation } from './project-composer-db.mjs';
import { loadProjectComposerMenus, projectComposerMenuPreview } from './project-composer-menu-preview.mjs';

const catalog = loadProjectComposerCatalog();
/*
 * 외래 키 닫힘을 강제하는 요구 관계 하나를 지운 합성 카탈로그. 실제 카탈로그에서는 모든 단일 선택이
 * 위반 없이 해석되므로(Phase 0c), 위반 경로는 이 카탈로그로 고정한다. 해시를 다시 계산하지 않으면
 * 해석기가 카탈로그 위조로 거부한다.
 */
function catalogWithoutRequires(source, id) {
  const { catalogHash, ...body } = structuredClone(source);
  body.capabilities.find(capability => capability.id === id).requires = [];
  return { ...body, catalogHash: compositionDigest(body) };
}
const loose = catalogWithoutRequires(catalog, 'reward');

const recipe = selection => ({ schemaVersion: 1, project: { name: 'agency-project' }, sourceRef: 'v1.0.0', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' });

test('required cross-domain foreign keys are reported without auto-inclusion when their parent is excluded', () => {
  // Phase 0c: 자료 이용 기록이 게시판 소유가 된 뒤로 실제 카탈로그의 단일 선택은 모두 생성할 수 있다.
  for (const capability of catalog.capabilities) {
    assert.deepEqual(resolveProjectRecipe(recipe({ domains: [capability.id] }), catalog).foreignKeyViolations, [], capability.id);
  }
  const survey = resolveProjectRecipe(recipe({ domains: ['survey'] }), catalog);
  assert.ok(!survey.resolvedDomains.includes('board'), 'survey alone must not pull the board domain');
  // 요구 관계가 빠지면 해석기는 부모를 자동으로 넣지 않고 위반으로 보고한다.
  const reward = resolveProjectRecipe(recipe({ domains: ['reward'] }), loose);
  assert.deepEqual(reward.foreignKeyViolations.map(row => row.name), ['fk_tb_rward_manage_tb_ifml_atrz_info']);
  assert.ok(!reward.resolvedDomains.includes('informalsanction'), 'a violation must not silently pull the parent domain');
  assert.deepEqual(resolveProjectRecipe(recipe({ domains: ['reward', 'informalsanction'] }), loose).foreignKeyViolations, []);
  // 행사·포상을 나눈 뒤(DEC-OPS-273) 행사는 혼자 풀리고, 포상만 결재를 끌어온다.
  assert.deepEqual(resolveProjectRecipe(recipe({ domains: ['event'] }), catalog).resolvedDomains, ['event']);
  assert.deepEqual(resolveProjectRecipe(recipe({ domains: ['reward'] }), catalog).resolvedDomains, ['informalsanction', 'reward']);
  // 배너·팝업과 프런트 전용 시연 화면도 혼자 풀린다.
  for (const id of ['promotion', 'showcase']) assert.deepEqual(resolveProjectRecipe(recipe({ domains: [id] }), catalog).resolvedDomains, [id], id);
  for (const preset of catalog.presets) assert.deepEqual(resolveProjectRecipe(recipe({ preset: preset.id }), catalog).foreignKeyViolations, [], preset.id);
});

/*
 * Phase 0c 의 종료 조건. 설문만 고르면 설문만 들어오고 게시판은 들어오지 않는다 — 종전에는 설문이 통계를,
 * 통계가 자료 이용 기록의 게시글 외래 키를 끌어와 생성이 막혔다. 통계 화면 중 게시판 데이터만 보여 주는
 * 게시물·자료 이용 화면은 게시판과 함께 빠지고, 나머지 통계 화면은 core 로 남는다.
 */
test('selecting only survey generates survey alone without the board or a foreign key violation (Phase 0c)', () => {
  const plan = resolveProjectRecipe(recipe({ domains: ['survey'] }), catalog);
  assert.deepEqual(plan.resolvedDomains, ['survey']);
  assert.deepEqual(plan.packs, ['core', 'survey']);
  assert.deepEqual(plan.foreignKeyViolations, []);
  assert.deepEqual(plan.autoIncluded, []);
  for (const table of ['tb_bbs_item', 'tb_bbs_master', 'tb_dta_use_stats']) assert.ok(!plan.tables.includes(table), table);
  for (const table of ['tb_srvy_info', 'tb_rptp_stats']) assert.ok(plan.tables.includes(table), table);
  const { menus: projected } = projectCompositionMenus({ menus: loadProjectComposerMenus(resolve(import.meta.dirname, '..')).menus, menuRoutes: plan.menuRoutes, excludedMenuTabs: plan.excludedMenuTabs });
  const menus = new Set(projected.map(row => row.menu_sn));
  for (const kept of [9040102, 9040104, 9040105]) assert.ok(menus.has(kept), `core statistics menu ${kept}`);
  for (const dropped of [9040101, 9040106]) assert.ok(!menus.has(dropped), `board statistics menu ${dropped}`);
  assert.ok(plan.frontend.removePaths.includes('src/app/admin/stats/board') && plan.frontend.removePaths.includes('src/app/admin/stats/data-usage'));
  assert.ok(!plan.frontend.removePaths.some(path => path === 'src/app/admin/stats'), 'the statistics shell is core');
});

test('core plus board and survey includes required UI/domain closure without mail or unrelated packs', () => {
  const plan = resolveProjectRecipe(recipe({ domains: ['board', 'survey'] }), catalog);
  assert.equal(plan.profile, 'custom');
  assert.deepEqual(plan.selectedDomains, ['board', 'survey']);
  // 게시판은 스크랩 없이 생성된다(DEC-OPS-272). 협업 허브는 core 셸이고 쪽지·스크랩은 그 탭 기여라 둘 다 들어오지 않는다(허브 분해 H1).
  // 지식 허브는 게시판 셸이고 커뮤니티 탭은 커뮤니티 기여다(허브 분해 H2) — 게시판은 커뮤니티·도움말·템플릿을 끌어오지 않는다.
  assert.deepEqual(plan.resolvedDomains, ['board', 'comment', 'survey']);
  for (const absent of ['promotion', 'showcase']) assert.ok(!plan.resolvedDomains.includes(absent), absent);
  for (const absent of ['mail', 'sms', 'schedule', 'report', 'scrap', 'note']) assert.ok(!plan.resolvedDomains.includes(absent));
  assert.ok(!plan.tables.includes('tb_email_dsptch_manage'));
  assert.ok(plan.tables.includes('tb_srvy_info') && !plan.tables.includes('tb_cmnty_info'));
  assert.ok(plan.permissionCodes.includes('BOARD_READ') && !plan.permissionCodes.includes('MAIL_SEND'));
  assert.ok(plan.menuRoutes.includes('/admin/help'));
  assert.ok(plan.menuRoutes.includes('/admin/collaboration'), 'the collaboration hub is a core shell');
  for (const contribution of ['src/extensions/note', 'src/extensions/scrap', 'src/app/admin/collaboration/scraps']) {
    assert.ok(plan.frontend.removePaths.includes(contribution), `${contribution} leaves with its feature`);
  }
  assert.ok(!plan.menuRoutes.some(route => route.includes('?')), 'menus are owned by screen path');
  // 지식 허브(게시판 셸)는 남고 커뮤니티 탭 메뉴는 숨는다.
  assert.deepEqual(plan.excludedMenuTabs, ['/admin/help?tab=COMMUNITY'], 'the community tab menu leaves with the community contribution');
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
    assert.deepEqual(plan.autoIncluded, [], `${preset.id}: a preset is closed under requires`);
  }
  const collaboration = resolveProjectRecipe(recipe({ preset: 'collaboration' }), catalog);
  assert.ok(!collaboration.resolvedDomains.includes('help'));
  assert.ok(!collaboration.resolvedDomains.includes('community'));
  assert.equal(collaboration.optionalForeignKeys[0].name, 'fk_tb_bbs_master_tb_cmnty_info');
});

/*
 * 시작 구성은 이름 붙은 기능 목록이다(해석기 단일화, 매니페스트 v2 11단계 C2). 같은 목록의 직접 선택과 해석 결과가 같다 —
 * 구성 이름·레시피·해시와, 생성기를 옮기기 전(C3)까지 남는 pack 축만 다르다. 그래서 시작 구성의 프런트 제거 경로도 카탈로그 규칙이다.
 */
test('a preset resolves exactly like a direct selection of the same feature list', () => {
  const comparable = ({ recipe: ignoredRecipe, profile, packs, recipeHash, compositionHash, ...rest }) => rest;
  for (const preset of catalog.presets) {
    const named = resolveProjectRecipe(recipe({ preset: preset.id }), catalog);
    const listed = resolveProjectRecipe(recipe({ domains: preset.domains }), catalog);
    assert.deepEqual(comparable(named), comparable(listed), preset.id);
    assert.equal(named.profile, preset.id);
  }
  // 공통 기반만 고른 구성은 게시판·쪽지 화면 디렉터리를 통째로 지운다(직접 선택과 같다).
  const core = resolveProjectRecipe(recipe({ preset: 'core' }), catalog);
  for (const path of ['src/app/admin/community/boards', 'src/app/note']) assert.ok(core.frontend.removePaths.includes(path), path);
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
    // 기능 저하를 지우거나 고친 계획도 다시 계산한 결과와 달라 거부된다.
    value => { value.degraded = []; },
    value => { value.degraded[0].reason = '알림은 그대로 갑니다.'; },
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

test('a plan reports each declared integration whose partner is absent, without including it or blocking generation', () => {
  const degraded = selection => resolveProjectRecipe(recipe(selection), catalog).degraded.map(edge => `${edge.from}>${edge.to}`);
  assert.deepEqual(degraded({ preset: 'core' }), ['core>notification']);
  assert.deepEqual(degraded({ preset: 'collaboration' }), ['board>community', 'mail>addressbook', 'sms>addressbook']);
  assert.deepEqual(degraded({ preset: 'demo' }), []);
  assert.deepEqual(degraded({ domains: [] }), ['core>notification']);
  assert.deepEqual(degraded({ domains: ['mail'] }), ['core>notification', 'mail>addressbook', 'mail>notification']);
  assert.deepEqual(degraded({ domains: ['informalsanction'] }),
    ['core>notification', 'informalsanction>mail', 'informalsanction>notification', 'informalsanction>sms']);
  assert.deepEqual(degraded({ domains: catalog.capabilities.map(capability => capability.id) }), []);
  for (const capability of catalog.capabilities) {
    const plan = resolveProjectRecipe(recipe({ domains: [capability.id] }), catalog);
    for (const edge of plan.degraded) {
      assert.ok(!plan.resolvedDomains.includes(edge.to), `${capability.id}: a degraded partner is never included`);
      assert.ok(edge.from === 'core' || plan.resolvedDomains.includes(edge.from), `${capability.id}: only included features degrade`);
    }
    assert.deepEqual(plan.foreignKeyViolations, [], `${capability.id}: degradation never becomes a blocker`);
  }
  const { integrates, catalogHash, ...rest } = catalog;
  const withoutIntegrations = { ...rest, catalogHash: compositionDigest(rest) };
  assert.throws(() => resolveProjectRecipe(recipe({ domains: [] }), withoutIntegrations),
    error => error instanceof ProjectRecipeError && error.field === 'catalog');
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

test('both generators resolve a preset profile through the same resolver the composer uses', () => {
  const sourceCommit = 'a'.repeat(40);
  const resolveSourceReference = reference => (reference === sourceCommit ? sourceCommit : 'b'.repeat(40));
  const generator = options => resolveGeneratorComposition({ catalog, sourceCommit, resolveSourceReference, ...options });
  for (const preset of catalog.presets.map(item => item.id)) {
    const hashes = new Set();
    for (const layout of ['multi-module', 'single-module']) {
      // DB 생성기는 --layout 을 명시하고 소스 생성기는 기본값으로 받는다. 같은 커밋·레이아웃이면 같은 구성이다.
      const database = generator({ profile: preset, backendLayout: layout, layoutExplicit: true });
      assert.deepEqual(generator({ profile: preset, backendLayout: layout }), database, `${preset}/${layout}`);
      assert.equal(database.profile, preset);
      assert.equal(database.backendLayout, layout);
      assert.equal(database.sourceCommit, sourceCommit);
      assert.deepEqual(database.resolvedDomains, [...catalog.presets.find(item => item.id === preset).domains].sort());
      // 화면 생성기가 넘기는 해석된 구성도 같은 판정을 지난다.
      assert.deepEqual(generator({ supplied: database, backendLayout: 'multi-module' }), database);
      hashes.add(database.compositionHash);
    }
    assert.equal(hashes.size, 2, `${preset}: the layout is part of the composition identity`);
  }
  const single = generator({ profile: 'core', backendLayout: 'single-module' });
  assert.throws(() => generator({ supplied: single, backendLayout: 'multi-module', layoutExplicit: true }), /layout differs/);
  const supplied = { ...resolveProjectRecipe({ ...recipe({ domains: ['reward'] }), sourceRef: sourceCommit }, loose), sourceCommit };
  assert.throws(() => resolveGeneratorComposition({ catalog: loose, sourceCommit, resolveSourceReference, supplied }),
    error => error.code === 'FK_CLOSURE' && /fk_tb_rward_manage_tb_ifml_atrz_info/.test(error.message));
  assert.throws(() => generator({ profile: 'custom' }), /Unknown project preset/);
  assert.throws(() => generator({}), /Exactly one/);
  assert.throws(() => generator({ profile: 'core', supplied: single }), /Exactly one/);
  assert.throws(() => resolveGeneratorComposition({ catalog, profile: 'core', sourceCommit, resolveSourceReference: () => 'c'.repeat(40) }), /sourceRef/);
});

test('both generators take their composition only from the shared resolver', () => {
  for (const file of ['generate-reusable-base-db.mjs', 'generate-reusable-base-source.mjs']) {
    const code = readFileSync(join(import.meta.dirname, file), 'utf8');
    assert.equal(code.match(/resolveGeneratorComposition\(/g)?.length, 1, `${file}: one resolver call`);
    assert.doesNotMatch(code, /verifyResolvedDbComposition\(|resolveProjectRecipe\(|verifyProjectComposition\(/, `${file}: no second resolver`);
    // 프리셋 전용 분기가 돌아오면 같은 선택이 진입 경로에 따라 다른 결과를 낸다(DEC-OPS-239).
    assert.doesNotMatch(code, /if \(!?composition\)|(?<![.\w])composition \? |(?<![.\w])!composition\b/, `${file}: no profile-only branch`);
  }
});

/*
 * 자동 포함 사슬과 해제 대상(설계서 9.3·E2). 사슬은 선택에서 가장 짧은 경로이고, 해제 대상(roots)은 그 기능에
 * 닿는 선택 전부다. roots 를 모두 빼면 그 기능이 빠지고, 하나라도 남기면 남는다 — 화면의 '해제하기'가 이 성질에 기대므로
 * 실제 카탈로그의 단독·두 기능 선택 전부에서 확인한다.
 */
test('auto-included features carry the shortest chain from a selection, one sentence per step and the exact roots to deselect', () => {
  const sentence = new Map(catalog.capabilities.flatMap(capability => capability.requires.map(edge => [`${capability.id}>${edge.domain}`, edge.userReason])));
  const out = new Map(catalog.capabilities.map(capability => [capability.id, [...new Set(capability.requires.map(edge => edge.domain))]]));
  const distance = (sources, target) => {
    const depth = new Map(sources.map(source => [source, 0]));
    for (const queue = [...sources]; queue.length;) {
      const from = queue.shift();
      for (const to of out.get(from)) if (!depth.has(to)) { depth.set(to, depth.get(from) + 1); queue.push(to); }
    }
    return depth.get(target);
  };
  const ids = catalog.capabilities.map(capability => capability.id);
  const selections = [...ids.map(id => [id]), ...ids.flatMap((a, index) => ids.slice(index + 1).map(b => [a, b]))];
  let checked = 0;
  for (const selection of selections) {
    const plan = resolveProjectRecipe(recipe({ domains: selection }), catalog);
    assert.deepEqual(plan.autoIncluded.map(item => item.domain), plan.resolvedDomains.filter(domain => !selection.includes(domain)), selection.join('+'));
    for (const item of plan.autoIncluded) {
      const label = `${selection.join('+')} -> ${item.domain}`;
      assert.ok(selection.includes(item.chain[0].from), label);
      assert.equal(item.chain.at(-1).to, item.domain, label);
      item.chain.forEach((hop, index) => {
        if (index) assert.equal(hop.from, item.chain[index - 1].to, label);
        assert.equal(hop.userReason, sentence.get(`${hop.from}>${hop.to}`), label);
        assert.ok(hop.kinds.length && hop.evidence.length, label);
      });
      assert.equal(item.userReason, item.chain.at(-1).userReason, label);
      assert.equal(item.chain.length, distance(selection, item.domain), `${label}: shortest chain`);
      assert.ok(item.roots.length && item.roots.every(root => selection.includes(root)), label);
      const without = roots => resolveProjectRecipe(recipe({ domains: selection.filter(domain => !roots.includes(domain)) }), catalog).resolvedDomains;
      assert.ok(!without(item.roots).includes(item.domain), `${label}: deselecting every root drops it`);
      for (const kept of item.roots) assert.ok(without(item.roots.filter(root => root !== kept)).includes(item.domain), `${label}: ${kept} alone keeps it`);
      checked += 1;
    }
  }
  // 빈 검사가 아니라는 하한이다. 간선을 걷을수록 모집단이 준다 — 2026-10-12 나의 업무 분해·커뮤니티 후속·업무 홈을 합친 트리에서
  //   단독·두 기능 선택 253개의 자동 포함은 198건이다(그 전 main 7dc76ad22 은 295건). 모든 자동 포함을 위 단언으로 본다.
  assert.ok(checked > 150, `checked ${checked} automatic inclusions`);
  // 대표 사례: 도움말만 고르면 댓글은 '도움말 → 게시판 → 댓글'로 들어온다(쪽지 사슬은 허브 분해 H1 에서, 대시보드 사슬은 Phase 2
  //   9단계에서 사라졌다 — 실시간 대시보드는 게시판을 포트로 읽는다).
  const help = resolveProjectRecipe(recipe({ domains: ['help'] }), catalog).autoIncluded.find(item => item.domain === 'comment');
  assert.deepEqual(help.chain.map(hop => [hop.from, hop.to, hop.kinds]), [['help', 'board', ['ui-import']], ['board', 'comment', ['java', 'manifest']]]);
  assert.deepEqual(help.roots, ['help']);
  // 개발자 원문 reason 은 종전 형식 그대로 남는다(호환). 그 기능으로 들어오는 모든 간선의 원문을 모은다.
  assert.ok(help.reason.includes('board: board 소스가 comment 타입을 참조한다.'), help.reason);
  assert.deepEqual(resolveProjectRecipe(recipe({ domains: ['dashboard'] }), catalog).resolvedDomains, ['dashboard', 'notification']);
  // 쪽지는 혼자 풀린다.
  assert.deepEqual(resolveProjectRecipe(recipe({ domains: ['note'] }), catalog).autoIncluded, []);
  const both = resolveProjectRecipe(recipe({ domains: ['comment', 'scrap'] }), catalog).autoIncluded.find(item => item.domain === 'board');
  assert.deepEqual(both.roots, ['comment', 'scrap']);
});

test('a catalog edge without its user sentence is refused rather than shown as developer text', () => {
  const { catalogHash, ...body } = structuredClone(catalog);
  for (const edge of body.capabilities.find(capability => capability.id === 'scrap').requires) delete edge.userReason;
  const tampered = { ...body, catalogHash: compositionDigest(body) };
  assert.throws(() => resolveProjectRecipe(recipe({ domains: ['scrap'] }), tampered), /Dependency lacks a user reason: scrap -> board/);
});
