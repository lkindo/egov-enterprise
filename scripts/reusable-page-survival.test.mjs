import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join, resolve } from 'node:path';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { resolveProjectRecipe } from './project-composer-recipe.mjs';
import { projectRemovedRouteAliases } from './reusable-governance-projection.mjs';
import { discoverPageRoutes } from './ui-route-capabilities-contract.mjs';
import { REQUIRED_SCREENS, ROUTE_LEDGER_PATH, artifactScreenErrors, convergeRedirectPages, expectedPageRoutes, pageSurvivalViolations,
  readRouteRows, redirectTargetRoute, routeRowsFromLedger } from './reusable-page-survival.mjs';

const root = resolve(import.meta.dirname, '..');
// 실제 카탈로그는 적재에 1초 남짓 걸려 이 파일에서 한 번만 적재한다.
const catalog = loadProjectComposerCatalog(root);
const page = (route, routing = { kind: 'page' }) => ({ route, source: `frontend/src/app${route === '/' ? '' : route}/page.tsx`, routing });
const rowsOf = (...routes) => routeRowsFromLedger({ routes });
const recipe = selection => resolveProjectRecipe({ schemaVersion: 1, project: { name: 'page-survival' }, sourceRef: 'main', selection,
  database: { vendor: 'postgresql' }, backendLayout: 'multi-module' }, catalog);

test('route ledger rows must carry a known routing kind, a redirect target and a unique route', () => {
  assert.throws(() => routeRowsFromLedger({ routes: [] }), /route ledger has no routes/);
  assert.throws(() => rowsOf(page('/a', { kind: 'moved' })), /route ledger row lacks a known routing kind: \/a/);
  assert.throws(() => rowsOf(page('/a', {})), /route ledger row lacks a known routing kind: \/a/);
  assert.throws(() => rowsOf(page('/a', { kind: 'page-redirect' })), /redirect route lacks a target: \/a/);
  assert.throws(() => rowsOf(page('/a'), page('/a')), /duplicate route ledger row: \/a/);
  const rows = rowsOf(page('/a'), page('/b', { kind: 'config-redirect', target: '/a?tab=X' }));
  assert.deepEqual(rows.get('/b'), { route: '/b', source: 'frontend/src/app/b/page.tsx', kind: 'config-redirect', target: '/a?tab=X' });
});

test('redirect convergence drops page and config redirects whose destination is gone and follows chains through both kinds', () => {
  assert.equal(redirectTargetRoute('/board/${id}?tab=X'), '/board/[id]');
  const rows = rowsOf(page('/target'), page('/hop', { kind: 'page-redirect', target: '/target' }),
    page('/alias', { kind: 'page-redirect', target: '/hop?x=1' }), page('/config', { kind: 'config-redirect', target: '/target?tab=A' }),
    page('/via-config', { kind: 'page-redirect', target: '/config' }), page('/kept'));
  const all = ['/target', '/hop', '/alias', '/config', '/via-config', '/kept'];
  // 목적지가 남으면 아무것도 빼지 않는다.
  assert.deepEqual([...convergeRedirectPages(all, rows)].sort(), [...all].sort());
  // 목적지가 빠지면 그리로 가는 리다이렉트를 뺀다. config-redirect 도 빼는 것은 거버넌스 투영이 그 선언과 페이지 파일을 함께
  // 지우기 때문이다. 그다음 그 리다이렉트로 가는 리다이렉트(page-redirect → config-redirect 포함)를 뺀다.
  assert.deepEqual([...convergeRedirectPages(all.filter(route => route !== '/target'), rows)], ['/kept']);
  // 원장에 없는 목적지는 거버넌스 투영처럼 실패한다(조용히 지우지 않는다).
  assert.throws(() => convergeRedirectPages(['/stray'], rowsOf(page('/stray', { kind: 'page-redirect', target: '/nowhere' }))),
    /Redirect target was not an upstream page: \/nowhere \(\/stray\)/);
});

test('survival violations name missing and extra screens by route with their page source', () => {
  const rows = rowsOf(page('/'), page('/login'), page('/demo'), page('/demo/alias', { kind: 'page-redirect', target: '/demo' }));
  const check = (present, convergeActual) => pageSurvivalViolations({ rows, expected: new Set(['/', '/login']), survives: source => present.includes(source),
    convergeActual });
  assert.deepEqual(check(['frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx']), { missing: [], extra: [] });
  assert.deepEqual(check(['frontend/src/app/page.tsx']), { missing: [{ route: '/login', source: 'frontend/src/app/login/page.tsx' }], extra: [] });
  assert.deepEqual(check(['frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx', 'frontend/src/app/demo/page.tsx', 'frontend/src/app/demo/alias/page.tsx']),
    { missing: [], extra: [{ route: '/demo', source: 'frontend/src/app/demo/page.tsx' }, { route: '/demo/alias', source: 'frontend/src/app/demo/alias/page.tsx' }] });
  // 거버넌스 투영 전(생성기 연쇄 직후·정밀 점검)에는 목적지가 빠진 리다이렉트 화면을 그 투영처럼 뺀다.
  const orphanAlias = ['frontend/src/app/page.tsx', 'frontend/src/app/login/page.tsx', 'frontend/src/app/demo/alias/page.tsx'];
  assert.deepEqual(check(orphanAlias), { missing: [], extra: [] });
  // 투영 뒤의 디스크는 그대로 본다 — 투영이 지웠어야 할 리다이렉트 화면이 남으면 구성 밖 화면이다.
  assert.deepEqual(check(orphanAlias, false), { missing: [], extra: [{ route: '/demo/alias', source: 'frontend/src/app/demo/alias/page.tsx' }] });
});

test('the artifact screen check compares the disk without convergence and refuses an expectation it cannot form', () => {
  const synthetic = { core: { menuRoutes: ['/', '/login'] }, capabilities: [], sharedUi: [] };
  const routes = [page('/'), page('/login'), page('/demo'), page('/demo/alias', { kind: 'page-redirect', target: '/demo' })];
  const [home, login, demo, alias] = routes.map(row => row.source);
  const check = (sources, { ledger = { routes }, catalogValue = synthetic } = {}) => artifactScreenErrors({ ledger, catalog: catalogValue,
    composition: { resolvedDomains: [] }, pageSources: new Set(sources) });
  assert.deepEqual(check([home, login]), []);
  // 빠진 화면만 있어도, 남은 화면만 있어도 붉다.
  assert.deepEqual(check([home]), ['Projected screens differ from the composition: missing [/login] extra []']);
  assert.deepEqual(check([home, login, demo]), ['Projected screens differ from the composition: missing [] extra [/demo]']);
  // 거버넌스 투영이 지웠어야 할, 목적지 없는 리다이렉트 화면이 남으면 수렴으로 가리지 않는다.
  assert.deepEqual(check([home, login, alias]), ['Projected screens differ from the composition: missing [] extra [/demo/alias]']);
  // 기대값을 만들 수 없으면 대조할 수 없다고 말한다(조용히 통과하지 않는다).
  assert.deepEqual(check([home, login], { ledger: { routes: [page('/'), page('/login', { kind: 'moved' })] } }),
    ['Projected screens cannot be compared with the composition: route ledger row lacks a known routing kind: /login']);
  assert.deepEqual(check([home, login], { catalogValue: { ...synthetic, core: { menuRoutes: ['/login'] } } }),
    ['Projected screens cannot be compared with the composition: required screen is not a core route: /']);
});

/*
 * 홈과 로그인은 기능 소유 계산과 무관하게 core 기대 화면이다. 소유가 바뀌어 홈이 어떤 기능과 함께 빠지게 되면, 소유만 보는
 * 대조는 그 손실을 정상으로 받아들인다(빈 선택의 기대값에서도 함께 빠지므로). 그래서 그런 카탈로그로는 기대값을 만들지 않는다.
 */
test('home and login stay required core screens whatever the capability ownership computes', () => {
  assert.deepEqual(REQUIRED_SCREENS, ['/', '/login']);
  const rows = readRouteRows(root);
  for (const route of REQUIRED_SCREENS) {
    assert.ok(catalog.core.menuRoutes.includes(route), route);
    const moved = { ...catalog, core: { ...catalog.core, menuRoutes: catalog.core.menuRoutes.filter(owned => owned !== route) },
      capabilities: catalog.capabilities.map(feature => (feature.id === 'dashboard' ? { ...feature, menuRoutes: [...feature.menuRoutes, route] } : feature)) };
    for (const selection of [{ domains: [] }, { domains: ['dashboard'] }]) {
      assert.throws(() => expectedPageRoutes(moved, recipe(selection), rows), { message: `required screen is not a core route: ${route}` });
    }
  }
});

/*
 * 기대값은 기능 소유에서 계산하고 removePaths 로 거르지 않는다(잘못된 pack 에 넣은 경로를 잡으려고). 해석기의 retainedRoutes 는
 * removePaths 로 거른 값이다. 둘이 갈리면 어느 한쪽 정의가 틀렸으므로, 프리셋·빈 선택·단독·두 기능 쌍 전부에서 같아야 한다.
 */
test('the ownership expectation equals the resolver retained routes for every preset, single and pair selection', () => {
  const rows = readRouteRows(root);
  const ledger = JSON.parse(readFileSync(join(root, ROUTE_LEDGER_PATH), 'utf8'));
  assert.equal(rows.size, ledger.routes.length);
  const ids = catalog.capabilities.map(capability => capability.id);
  const selections = [...catalog.presets.map(preset => ({ preset: preset.id })), { domains: [] }, { domains: [...ids] },
    ...ids.map(id => ({ domains: [id] })), ...ids.flatMap((left, index) => ids.slice(index + 1).map(right => ({ domains: [left, right] })))];
  assert.equal(selections.length, 3 + 2 + 19 + 171);
  for (const selection of selections) {
    const composition = recipe(selection);
    assert.deepEqual([...expectedPageRoutes(catalog, composition, rows)].sort(), [...composition.frontend.retainedRoutes].sort(), JSON.stringify(selection));
  }
  // 전체 구성은 모든 등록 화면을 기대한다.
  assert.equal(expectedPageRoutes(catalog, recipe({ domains: [...ids] }), rows).size, rows.size);
});

test('a catalog route without a route ledger row cannot form an expectation', () => {
  const rows = readRouteRows(root);
  rows.delete('/login');
  assert.throws(() => expectedPageRoutes(catalog, { resolvedDomains: [] }, rows), /catalog route has no route ledger row: \/login/);
});

/*
 * 기대값의 리다이렉트 수렴은 거버넌스 투영(projectRemovedRouteAliases)이 디스크에서 할 정리를 미리 계산한 것이다. 둘이 갈리면
 * 생성기·정밀 점검은 통과하고 생성물 무결성 검사에서야 붉다. 실제 page 파일과 라우트 판정 입력만 복사해, 목적지 하나를 지웠을 때
 * 거버넌스가 지우는 리다이렉트 화면이 수렴이 빼는 화면과 같은지 본다. page-redirect 만, config-redirect, config 를 거치는 연쇄다.
 */
test('redirect convergence removes exactly the redirect pages the governance projection removes', t => {
  const rows = readRouteRows(root);
  const upstream = new Set(rows.keys());
  const inputs = ['frontend/next.config.ts', 'frontend/src/proxy.ts', 'frontend/src/types/generated-permissions.ts',
    'frontend/src/lib/auth/page-authorization.ts', 'config/governance/permission-catalog.json', 'config/reusable-base-profiles.json'];
  const cases = [
    ['page-redirect', '/admin/collaboration/scraps/selectScrapList',
      ['/admin/collaboration/scraps/insertScrap', '/admin/collaboration/scraps/selectScrapDetail/[id]']],
    ['config-redirect', '/admin/system/monitoring/hub',
      ['/admin/observability', '/admin/security/audit', '/admin/system/audit', '/admin/system/monitoring']],
    ['config then page redirect', '/admin/survey/hub',
      ['/admin/survey', '/admin/survey/items', '/admin/survey/manage', '/admin/survey/manage/create', '/admin/survey/questions',
        '/admin/survey/stats', '/admin/survey/templates']],
  ];
  for (const [label, destination, removed] of cases) {
    const output = mkdtempSync(join(tmpdir(), 'page-survival-aliases-'));
    t.after(() => rmSync(output, { recursive: true, force: true }));
    cpSync(join(root, 'frontend/src/app'), join(output, 'frontend/src/app'), { recursive: true,
      filter: source => statSync(source).isDirectory() || /[\\/]page\.(?:ts|tsx|js|jsx)$/.test(source) });
    for (const input of inputs) {
      mkdirSync(dirname(join(output, input)), { recursive: true });
      cpSync(join(root, input), join(output, input));
    }
    rmSync(join(output, rows.get(destination).source));
    const present = discoverPageRoutes(output).map(entry => entry.route);
    const converged = convergeRedirectPages(present, rows);
    const governed = projectRemovedRouteAliases(output, upstream).removedRedirectPages.map(entry => entry.route).sort();
    assert.deepEqual(governed, present.filter(route => !converged.has(route)).sort(), label);
    assert.deepEqual(governed, [...removed].sort(), label);
  }
});
