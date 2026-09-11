import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import test from 'node:test';
import { analyzeMenuCensus, inspectMenuRoutes, parseMenuRows, resolveMenuDestination } from './menu-census.mjs';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const snapshot = (rules) => ({
  pages: Object.keys(rules).map((route) => ({ route })),
  routing: new Map(Object.entries(rules).map(([route, rule]) => [route, { source: 'fixture/page.tsx', ...rule }])),
});
const menu = (id, route, extra = {}) => ({ menu_sn: id, menu_nm: `fixture-${id}`, modern_route: route, use_yn: 'Y', del_yn: 'N', ...extra });

test('module import cannot invoke db-bridge; operational runner discovers this regression', () => {
  const output = execFileSync(process.execPath, ['--permission', `--allow-fs-read=${root}`, '--input-type=module', '-e',
    "await import('./scripts/menu-census.mjs'); console.log('pure import');"], { cwd: root, encoding: 'utf8' });
  assert.equal(output.trim(), 'pure import');
  const packageJson = JSON.parse(readFileSync(resolve(root, 'package.json'), 'utf8'));
  assert.match(packageJson.scripts['test:operational-contracts'], /scripts\/\*\.test\.mjs/);
  for (const file of ['.github/workflows/ci.yml', '.githooks/pre-push', 'scripts/verify.mjs']) {
    assert.match(readFileSync(resolve(root, file), 'utf8'), /npm run test:operational-contracts/);
  }
});

test('actual source aliases resolve terminal targets while monitoring query tabs stay distinct', () => {
  const routes = inspectMenuRoutes(root);
  assert.ok(routes.pages.length >= 119, 'existing page census cannot collapse');
  const result = analyzeMenuCensus([
    menu(1, '/admin/security/role'), menu(2, '/admin/security/authority'),
    menu(3, '/admin/system/ism'), menu(4, '/approvals'),
    menu(5, '/admin/system/audit'), menu(6, '/admin/system/monitoring/hub?tab=system'),
    menu(7, '/admin/system/monitoring/hub?tab=security'),
    menu(8, '/admin/system/monitoring/hub?tab=observability'),
    menu(9, '/admin/help?tab=FAQ'), menu(10, '/admin/help?tab=QNA'),
  ], routes);
  assert.deepEqual(result.duplicateRoutes.map(({ route }) => route), [
    '/admin/security/authority', '/approvals', '/admin/system/monitoring/hub?tab=system',
  ]);
  assert.deepEqual(result.brokenMenus, []);
  assert.deepEqual(result.unresolvedMenus, []);
  assert.deepEqual(result.unresolvedRoutes, []);
  assert.ok(result.aliasRoutes.some(({ route, destination }) => route === '/admin/security/role' && destination === '/admin/security/authority'));
  assert.equal(result.orphanRoutes.includes('/admin/security/authority'), false);
  assert.equal(result.orphanRoutes.includes('/admin/security/role'), false);
  assert.equal(result.measuredAt, null);
});

test('query ordering normalizes keys but preserves tab, board ID, repeated value order and fragment', () => {
  const routes = snapshot({ '/hub': { kind: 'page' } });
  const result = analyzeMenuCensus([
    menu(1, '/hub?tab=A&bbsId=1'), menu(2, '/hub?bbsId=1&tab=A'),
    menu(3, '/hub?bbsId=2&tab=A'), menu(4, '/hub?bbsId=1&tab=B'),
    menu(5, '/hub?tag=a&tag=b'), menu(6, '/hub?tag=b&tag=a'),
    menu(7, '/hub#first'), menu(8, '/hub#second'), menu(9, '/hub'),
  ], routes);
  assert.deepEqual(result.duplicateRoutes.map(({ menus }) => menus.map(({ menuSn }) => menuSn)), [[1, 2]]);
});

test('config query forwarding and literal page redirect query replacement follow different runtime semantics', () => {
  const routes = snapshot({
    '/config': { kind: 'config-redirect', target: '/hub?tab=fixed' },
    '/page': { kind: 'page-redirect', target: '/hub?tab=fixed' }, '/hub': { kind: 'page' },
  });
  assert.equal(resolveMenuDestination('/config?tab=old&x=1&x=2', routes).route, '/hub?tab=fixed&x=1&x=2');
  assert.equal(resolveMenuDestination('/page?tab=old&x=1', routes).route, '/hub?tab=fixed');
});

test('multi-hop and simple dynamic aliases resolve with exact routes preferred', () => {
  const routes = snapshot({
    '/old': { kind: 'config-redirect', target: '/middle' },
    '/middle': { kind: 'page-redirect', target: '/items/7' },
    '/legacy/[id]': { kind: 'page-redirect', target: '/items/${id}' },
    '/items/[id]': { kind: 'page' },
    '/items/new': { kind: 'page-redirect', target: '/create' }, '/create': { kind: 'page' },
  });
  assert.equal(resolveMenuDestination('/old', routes).chain.length, 2);
  assert.equal(resolveMenuDestination('/legacy/42', routes).route, '/items/42');
  assert.equal(resolveMenuDestination('/legacy/[id]', routes).route, '/items/[id]');
  assert.equal(resolveMenuDestination('/items/new', routes).route, '/create');
});

test('cycle, missing destination, unsupported expression and unsafe target cannot look resolved or duplicate', () => {
  const routes = snapshot({
    '/a': { kind: 'page-redirect', target: '/b' }, '/b': { kind: 'page-redirect', target: '/a' },
    '/missing': { kind: 'page-redirect', target: '/deleted' },
    '/expression': { kind: 'page-redirect', target: '/items/${unknown}' },
    '/external': { kind: 'page-redirect', target: 'https://outside.invalid' },
  });
  assert.equal(resolveMenuDestination('/a', routes).reason, 'redirect-cycle');
  assert.equal(resolveMenuDestination('/missing', routes).status, 'missing');
  for (const route of ['/expression', '/external', '//outside.invalid', '/bad%escape', '/bad\\path']) {
    assert.equal(resolveMenuDestination(route, routes).status, 'unresolved', route);
  }
  const result = analyzeMenuCensus([menu(1, '/a'), menu(2, '/a'), menu(3, '/missing')], routes);
  assert.equal(result.unresolvedMenus.length, 2);
  assert.equal(result.brokenMenus.length, 1);
  assert.deepEqual(result.duplicateRoutes, []);
  const changed = snapshot({ '/old': { kind: 'page-redirect', target: '/live' }, '/live': { kind: 'page' } });
  assert.equal(resolveMenuDestination('/old', changed).status, 'resolved');
  changed.routing.delete('/live');
  assert.equal(resolveMenuDestination('/old', changed).status, 'missing', 'injected removed target must be detected');
});

test('hidden parents and folders do not create false parent/child duplicates or imply effective grants', () => {
  const routes = snapshot({ '/old': { kind: 'page-redirect', target: '/page' }, '/page': { kind: 'page' }, '/page/detail': { kind: 'page' } });
  const result = analyzeMenuCensus([
    menu(1, null), menu(2, '/old', { up_menu_sn: 1 }), menu(3, '/page', { up_menu_sn: 2 }),
    menu(4, '/page', { use_yn: 'N' }), menu(5, '/page', { up_menu_sn: 4 }), menu(6, '/page', { del_yn: 'Y' }),
  ], routes);
  assert.deepEqual(result.parentChildSameRoute.map(({ menuSn }) => menuSn), [3]);
  assert.deepEqual(result.hiddenMenus.map(({ menuSn }) => menuSn), [4]);
  assert.deepEqual(result.subRoutes, ['/page/detail']);
  assert.match(result.scope, /effective navigation and API authorization are not measured/);
});

test('malformed bridge evidence and duplicate identities cannot masquerade as a valid empty census', () => {
  assert.deepEqual(parseMenuRows('diagnostic banner\n[]'), []);
  assert.throws(() => parseMenuRows('connection unavailable'), /did not return/);
  assert.throws(() => parseMenuRows('[malformed]'));
  assert.throws(() => analyzeMenuCensus([menu(1, '/hub'), menu(1, '/hub')], snapshot({ '/hub': { kind: 'page' } })), /duplicate/);
});
