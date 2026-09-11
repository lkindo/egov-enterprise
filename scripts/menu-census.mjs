#!/usr/bin/env node
/**
 * Read-only menu/source census. Structural evidence does not prove effective
 * NAVIGATION/OPERATION authorization or justify deleting a route.
 * CLI: node scripts/menu-census.mjs [--json]. Imports never query the database.
 */
import { execFileSync } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { discoverPageRoutes, discoverConfigRedirects, expectedRouting } from './ui-route-capabilities-contract.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = resolve(dirname(SCRIPT_PATH), '..');
const ORIGIN = 'https://menu-census.invalid';

export function parseMenuRows(output) {
  const start = output.indexOf('[');
  if (start < 0) throw new Error('db-bridge did not return a JSON menu array');
  const rows = JSON.parse(output.slice(start));
  if (!Array.isArray(rows)) throw new Error('db-bridge menu response is not an array');
  return rows;
}

export function inspectMenuRoutes(repoRoot = ROOT) {
  const pages = discoverPageRoutes(repoRoot);
  const repository = { repoRoot, configRedirects: discoverConfigRedirects(repoRoot) };
  const routing = new Map(pages.map(({ route, source }) => [route, {
    ...expectedRouting(repository, route, source), source,
  }]));
  // Config redirects precede page rendering and can lack their own page entry.
  for (const [route, redirect] of repository.configRedirects.redirects) {
    if (/[:*]/.test(route)) throw new Error('unsupported configured redirect pattern: ' + route);
    routing.set(route, { ...redirect, source: repository.configRedirects.source });
  }
  return { pages, routing };
}

function internalUrl(value) {
  if (typeof value !== 'string' || !value.startsWith('/') || value.startsWith('//')
    || /[\\\u0000-\u0020\u007f]/.test(value) || /%(?![a-f\d]{2})/i.test(value)) {
    throw new Error('unsupported internal destination');
  }
  const url = new URL(value, ORIGIN);
  if (url.origin !== ORIGIN) throw new Error('external destination');
  url.pathname = url.pathname.replace(/\/+$/, '') || '/';
  // Stable sort preserves repeated value order; first-value consumers may depend on it.
  url.searchParams.sort();
  return url;
}

const urlKey = (url) => url.pathname + url.search + url.hash;

function findRoute(pathname, routing) {
  if (routing.has(pathname)) return {
    route: pathname, rule: routing.get(pathname),
    params: Object.fromEntries([...pathname.matchAll(/\[([^.[\]]+)\]/g)].map((match) => [match[1], match[0]])),
  };
  const segments = pathname.split('/');
  const matches = [];
  for (const [route, rule] of routing) {
    if (!route.includes('[')) continue;
    const parts = route.split('/');
    if (parts.length !== segments.length) continue;
    const params = {};
    if (parts.every((part, index) => {
      const parameter = /^\[([^.[\]]+)\]$/.exec(part);
      if (!parameter) return part === segments[index];
      if (!segments[index]) return false;
      params[parameter[1]] = segments[index];
      return true;
    })) matches.push({ route, rule, params });
  }
  if (matches.length > 1) throw new Error('ambiguous dynamic destination');
  return matches[0];
}

/** Resolve observed source redirects. Do not infer client default tabs or API permissions. */
export function resolveMenuDestination(value, snapshot) {
  const chain = [];
  const visited = new Set();
  try {
    let current = internalUrl(value);
    while (true) {
      const key = urlKey(current);
      if (visited.has(key)) return { status: 'unresolved', reason: 'redirect-cycle', chain };
      visited.add(key);
      const found = findRoute(current.pathname, snapshot.routing);
      if (!found) return { status: 'missing', reason: 'no-page-or-redirect', route: key, chain };
      const { route, rule, params } = found;
      if (rule.kind === 'page') return { status: 'resolved', route: key, pageRoute: route, chain };
      if (!['config-redirect', 'page-redirect'].includes(rule.kind)) {
        return { status: 'unresolved', reason: 'unsupported-routing-kind', chain };
      }
      // The shared source census recognizes literals and simple interpolated IDs.
      const destination = rule.target?.replace(/\$\{([^}]+)\}/g, (token, name) => params[name] ?? token);
      if (!destination || destination.includes('$' + '{')) {
        return { status: 'unresolved', reason: 'unsupported-redirect-expression', chain };
      }
      const next = internalUrl(destination);
      if (rule.kind === 'config-redirect') {
        // Next prepareDestination merges source query then explicit destination query.
        for (const name of new Set(current.searchParams.keys())) {
          if (!next.searchParams.has(name)) {
            for (const original of current.searchParams.getAll(name)) next.searchParams.append(name, original);
          }
        }
        next.searchParams.sort();
      }
      // A literal redirect() does not forward incoming searchParams.
      chain.push({ from: key, to: urlKey(next), kind: rule.kind, source: rule.source });
      current = next;
    }
  } catch {
    return { status: 'unresolved', reason: 'unsupported-or-invalid-destination', chain };
  }
}

export function analyzeMenuCensus(menus, snapshot) {
  if (!Array.isArray(menus) || !Array.isArray(snapshot.pages) || !(snapshot.routing instanceof Map)) {
    throw new Error('menu census requires rows and a complete route snapshot');
  }
  const identities = new Set();
  for (const menu of menus) {
    if (!menu || menu.menu_sn == null || identities.has(String(menu.menu_sn))) {
      throw new Error('menu census has a missing or duplicate menu identity');
    }
    identities.add(String(menu.menu_sn));
  }
  const active = menus.filter((menu) => menu.use_yn === 'Y' && menu.del_yn !== 'Y');
  const hidden = menus.filter((menu) => menu.use_yn !== 'Y' && menu.del_yn !== 'Y');
  const destinations = new Map(active.filter((menu) => menu.modern_route)
    .map((menu) => [String(menu.menu_sn), resolveMenuDestination(menu.modern_route, snapshot)]));
  const summary = (menu) => ({ menuSn: menu.menu_sn, menuNm: menu.menu_nm, route: menu.modern_route });
  const byDestination = new Map();
  for (const menu of active) {
    const destination = destinations.get(String(menu.menu_sn));
    if (destination?.status !== 'resolved') continue;
    const entries = byDestination.get(destination.route) ?? [];
    entries.push({ ...summary(menu), redirects: destination.chain });
    byDestination.set(destination.route, entries);
  }
  const menuPaths = new Set([...destinations.values()].filter((entry) => entry.status === 'resolved')
    .map((entry) => entry.pageRoute));
  const hasMenuedAncestor = (route) => [...menuPaths].some((parent) => route.startsWith(parent + '/'));
  const aliasRoutes = [];
  const unresolvedRoutes = [];
  const canonical = [];
  for (const { route } of snapshot.pages) {
    const destination = resolveMenuDestination(route, snapshot);
    if (destination.status !== 'resolved') unresolvedRoutes.push({ sourceRoute: route, ...destination });
    else if (destination.chain.length) aliasRoutes.push({ route, destination: destination.route });
    else canonical.push(route);
  }
  const notMenued = canonical.filter((route) => !menuPaths.has(route));
  return {
    measuredAt: null, // Caller binds actual environment/time; source generation cannot refresh live evidence.
    scope: 'Source routing and raw active menu rows only; effective navigation and API authorization are not measured.',
    queryPolicy: 'Explicit query keys/values and fragments are preserved; client default tab equivalence is not inferred.',
    totals: { menusAll: menus.length, menusActive: active.length, menusHidden: hidden.length, routes: snapshot.pages.length },
    brokenMenus: active.filter((menu) => destinations.get(String(menu.menu_sn))?.status === 'missing')
      .map((menu) => ({ ...summary(menu), destination: destinations.get(String(menu.menu_sn)) })),
    unresolvedMenus: active.filter((menu) => destinations.get(String(menu.menu_sn))?.status === 'unresolved')
      .map((menu) => ({ ...summary(menu), destination: destinations.get(String(menu.menu_sn)) })),
    duplicateRoutes: [...byDestination].filter(([, entries]) => entries.length > 1)
      .map(([route, entries]) => ({ route, menus: entries })),
    parentChildSameRoute: active.filter((menu) => {
      const child = destinations.get(String(menu.menu_sn));
      const parent = destinations.get(String(menu.up_menu_sn));
      return child?.status === 'resolved' && parent?.status === 'resolved' && child.route === parent.route;
    }).map((menu) => ({ ...summary(menu), upMenuSn: menu.up_menu_sn, destination: destinations.get(String(menu.menu_sn)).route })),
    orphanRoutes: notMenued.filter((route) => !hasMenuedAncestor(route)),
    subRoutes: notMenued.filter(hasMenuedAncestor),
    aliasRoutes,
    unresolvedRoutes,
    hiddenMenus: hidden.map(summary),
  };
}

function main() {
  const output = execFileSync(process.execPath, [join(ROOT, '.agent', 'scripts', 'db-bridge.js'),
    'SELECT menu_sn, up_menu_sn, menu_nm, modern_route, prgrm_file_nm, use_yn, del_yn FROM tb_menu_info ORDER BY menu_sn', '--json'],
  { encoding: 'utf8', cwd: ROOT, maxBuffer: 32 * 1024 * 1024 });
  const result = analyzeMenuCensus(parseMenuRows(output), inspectMenuRoutes());
  if (process.argv.includes('--json')) console.log(JSON.stringify(result, null, 2));
  else {
    console.log('menu-census — 메뉴와 소스 라우팅 측정 (실효 권한·운영 성공 증거 아님)');
    console.log('전체 ' + result.totals.menusAll + ', 활성 ' + result.totals.menusActive
      + ', 숨김 ' + result.totals.menusHidden + ', 화면 ' + result.totals.routes);
    for (const [label, entries] of [
      ['없는 목적지', result.brokenMenus], ['해석 미확정 메뉴', result.unresolvedMenus],
      ['같은 최종 목적지', result.duplicateRoutes], ['부모·자식 동일 목적지', result.parentChildSameRoute],
      ['메뉴 없는 정본 화면', result.orphanRoutes], ['메뉴 하위 화면', result.subRoutes],
      ['호환 별칭 화면', result.aliasRoutes], ['해석 미확정 화면', result.unresolvedRoutes], ['숨김 메뉴', result.hiddenMenus],
    ]) {
      console.log('\n' + label + ': ' + entries.length + '건');
      for (const entry of entries) console.log(typeof entry === 'string' ? entry : JSON.stringify(entry));
    }
    console.log('\n별칭을 따라가되 query/tab은 보존합니다. 메뉴 없는 화면은 삭제 대상 판정이 아닙니다.');
  }
}

if (process.argv[1] && resolve(process.argv[1]) === SCRIPT_PATH) main();
