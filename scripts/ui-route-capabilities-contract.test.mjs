import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  analyzeRouteCapabilities,
  directProjectionProfiles,
  discoverPageRoutes,
  expectedEffectiveShellAccess,
  expectedRouting,
  expectedShellAccess,
  inspectRouteRepository,
  journeyNetworkStubSources,
  journeyTestDeclarations,
  pageLoadsModule,
  parsePageAuthorizationSources,
  parseConfigRedirectsSource,
  profileProjections,
  validatePageAuthorizationBinding,
  validateRouteCapabilities,
} from './ui-route-capabilities-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'config', 'ui-route-capabilities.json');

const repository = inspectRouteRepository(ROOT);

// [2026-08-31] 라우트 수의 단일 원본은 파일시스템 스캔이다 — 같은 수(120)가 세 테스트 파일에
//   각각 하드코딩되어 신규 화면 1개가 리터럴 3곳을 동시 수정하게 만들던 중복을 제거했다.
//   census JSON 의 드리프트는 구조 검사(missing filesystem route ↔ ghost route)가 잡고,
//   스캔 자체의 붕괴는 아래 vacuity 하한이 막는다.
const FILESYSTEM_ROUTE_COUNT = discoverPageRoutes(ROOT).length;

function currentAnalysis() {
  return analyzeRouteCapabilities(ROOT, MANIFEST_PATH);
}

test('current manifest covers every filesystem route exactly once without structural errors', () => {
  const analysis = currentAnalysis();

  assert.ok(FILESYSTEM_ROUTE_COUNT >= 100, `route discovery collapsed: ${FILESYSTEM_ROUTE_COUNT} < 100`);
  assert.deepEqual(analysis.result.errors, []);
  assert.equal(analysis.result.summary.filesystemRoutes, FILESYSTEM_ROUTE_COUNT);
  assert.equal(analysis.result.summary.manifestRoutes, FILESYSTEM_ROUTE_COUNT);
  assert.equal(new Set(analysis.manifest.routes.map(({ route }) => route)).size, FILESYSTEM_ROUTE_COUNT);
});

// ADR-0018 moves real-clock review freshness to governance-review. The normal
// analyzer must remain deterministic and must never promote unresolved evidence.
test('route technical truth is identical at review time and after review deadlines', (t) => {
  const baseline = currentAnalysis();
  assert.deepEqual(baseline.result.errors, []);
  assert.equal(baseline.result.summary.gateReady, false);
  t.mock.timers.enable({ apis: ['Date'], now: Date.parse(`${baseline.manifest.asOf}T12:00:00Z`) });
  for (const timestamp of [
    `${baseline.manifest.asOf}T12:00:00Z`,
    '2026-12-01T00:00:00Z',
    '2036-01-01T00:00:00Z',
  ]) {
    t.mock.timers.setTime(Date.parse(timestamp));
    assert.deepEqual(currentAnalysis().result, baseline.result, timestamp);
  }
});

test('route discovery covers every Next page extension and fails closed on URL collisions', (t) => {
  const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-route-pages-'));
  t.after(() => fs.rmSync(tempRoot, { recursive: true, force: true }));
  const appRoot = path.join(tempRoot, 'frontend', 'src', 'app');
  const pages = [
    ['page.js', '/'],
    ['(workspace)/alpha/page.jsx', '/alpha'],
    ['beta/page.ts', '/beta'],
    ['gamma/page.tsx', '/gamma'],
  ];
  for (const [relative] of pages) {
    const target = path.join(appRoot, ...relative.split('/'));
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, 'export default function Page() { return null; }\n');
  }

  assert.deepEqual(
    discoverPageRoutes(tempRoot).map(({ route }) => route).sort(),
    pages.map(([, route]) => route).sort(),
  );

  const colliding = path.join(appRoot, '@modal', 'alpha', 'page.tsx');
  fs.mkdirSync(path.dirname(colliding), { recursive: true });
  fs.writeFileSync(colliding, 'export default function Page() { return null; }\n');
  assert.throws(() => discoverPageRoutes(tempRoot), /multiple page entries resolve to \/alpha/);
});

test('redirect parser rejects computed or partially parsed redirect declarations', () => {
  const literal = `async redirects() { return [
    { source: '/old', destination: '/new', permanent: false },
  ]; }`;
  assert.equal(parseConfigRedirectsSource(literal).size, 1);

  const computed = `async redirects() { return [
    { source: legacyPath, destination: '/new', permanent: false },
  ]; }`;
  assert.throws(() => parseConfigRedirectsSource(computed), /could not parse every redirect declaration/);
});

const proxySource = fs.readFileSync(path.join(ROOT, 'frontend/src/proxy.ts'), 'utf8');
const pageHelperSource = fs.readFileSync(path.join(ROOT, 'frontend/src/lib/auth/page-authorization.ts'), 'utf8');
const pageCatalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/governance/permission-catalog.json'), 'utf8'));
const generatedPageSource = fs.readFileSync(path.join(ROOT, 'frontend/src/types/generated-permissions.ts'), 'utf8');

test('page shell evidence binds the complete source registry, generated map and actual proxy admission branch', () => {
  assert.deepEqual(repository.proxy.bindingErrors, []);
  assert.deepEqual(Object.keys(repository.proxy.pagePermissions).sort(), repository.pages.map(({ route }) => route).sort());
  // [2026-11-08] /admin 밖도 같은 규칙이다 — 기능권한이 등록된 화면은 proxy 가 막는다(requiresRegisteredPermission).
  for (const [route, required] of Object.entries(pageCatalog.pagePermissions)) {
    if (route === '/login') continue;
    assert.equal(expectedShellAccess(route, repository.proxy), required.length === 0 ? 'authenticated' : 'admin-system', route);
  }
});

test('page admission binding rejects old prefix bypass, wrong casing input, disabled denial and non-executable examples', () => {
  assert.deepEqual(validatePageAuthorizationBinding(proxySource, pageHelperSource), []);
  const mutationPairs = [
    ['!canEnterRegisteredPage(pathname, authorization)', '(!isUserAccessible && !canEnterRegisteredPage(pathname, authorization))'],
    ['canEnterRegisteredPage(pathname, authorization)', 'canEnterRegisteredPage(normalizedPath, authorization)'],
    ['return denied;', 'return nextWithCsp();'],
    ['await loadPageAuthorization(accessToken, userSubject)', 'cachedAuthorization'],
    // [2026-11-08] /admin 밖의 권한 등록 화면을 게이트에서 빼거나, 편입 판정을 가져오지 않으면 막는다.
    [' || requiresRegisteredPermission(pathname)', ''],
    ['loadPageAuthorization, requiresRegisteredPermission }', 'loadPageAuthorization }'],
  ];
  for (const [before, after] of mutationPairs) {
    assert.ok(proxySource.includes(before), `red probe target missing: ${before}`);
    assert.notDeepEqual(validatePageAuthorizationBinding(proxySource.replace(before, after), pageHelperSource), [], before);
  }
  assert.notDeepEqual(validatePageAuthorizationBinding(`/* ${proxySource} */`, pageHelperSource), []);
  assert.notDeepEqual(validatePageAuthorizationBinding(`const example = ${JSON.stringify(proxySource)};`, pageHelperSource), []);
});

test('page helper cannot change unknown denial or shadow exact static pages with dynamic siblings', () => {
  for (const [before, after] of [
    ['if (!entry) return false;', 'if (!entry) return true;'],
    ['const exact = PAGE_PERMISSIONS[normalizedPath];', 'const exact = undefined;'],
    ['required.every(permission => canPermission(subject, permission))', 'required.some(permission => canPermission(subject, permission))'],
    ["PAGE_PERMISSION_MODES[entry[0]] === 'ALL'", "PAGE_PERMISSION_MODES[entry[0]] === 'NEVER'"],
    ["from '@/types/generated-permissions'", "from '@/types/unreviewed-permissions'"],
    // 게이트 편입 판정 — 인증만 요구하는 화면까지 넣거나, 대소문자 흉내를 빼거나, 하나만 맞아도 되는 판정을 바꾸면 막는다.
    ['if (required.length === 0) return false;', ''],
    ["const segments = normalizedPath.toLowerCase().split('/');", "const segments = normalizedPath.split('/');"],
    ['return Object.entries(PAGE_PERMISSIONS).some(([route, required]) => {', 'return Object.entries(PAGE_PERMISSIONS).every(([route, required]) => {'],
    // 정확한 등록을 먼저 보지 않으면 인증 전용 정적 화면이 동적 형제의 권한 조회에 묶인다. 경로 비교식도 결속한다(Codex 13차).
    ['if (registered) return registered.length > 0;', ''],
  ]) {
    assert.ok(pageHelperSource.includes(before), `red probe target missing: ${before}`);
    assert.notDeepEqual(validatePageAuthorizationBinding(proxySource, pageHelperSource.replace(before, after)), [], before);
  }
  // 경로 비교식 — 같은 식이 registeredPageEntry 에도 있어, 파일 뒤쪽 requiresRegisteredPermission 의 것을 바꾼다.
  const comparison = 'return routeSegments.length === segments.length && routeSegments.every';
  const comparisonAt = pageHelperSource.lastIndexOf(comparison);
  assert.ok(comparisonAt > pageHelperSource.indexOf('export function requiresRegisteredPermission'), 'red probe target missing: gate comparison');
  const brokenComparison = `${pageHelperSource.slice(0, comparisonAt)}${comparison.replace('===', '!==')}${pageHelperSource.slice(comparisonAt + comparison.length)}`;
  assert.notDeepEqual(validatePageAuthorizationBinding(proxySource, brokenComparison), [], 'gate comparison');
  const syntheticRules = { pagePermissions: {
    '/zz-ops/report': ['SURVEY_RSP_READ'], '/zz-ops/report/[id]': ['SURVEY_RSP_READ'], '/zz-open': [],
    '/zz-ops/[id]': ['SURVEY_RSP_READ'], '/zz-ops/new': [],
  } };
  assert.equal(expectedShellAccess('/zz-ops/new', syntheticRules), 'authenticated');
  assert.equal(expectedShellAccess('/zz-ops/9', syntheticRules), 'admin-system');
  assert.equal(expectedShellAccess('/zz-ops/report', syntheticRules), 'admin-system');
  assert.equal(expectedShellAccess('/zz-ops/report/7', syntheticRules), 'admin-system');
  assert.equal(expectedShellAccess('/ZZ-ops/Report', syntheticRules), 'admin-system');
  assert.equal(expectedShellAccess('/zz-open', syntheticRules), 'authenticated');
  assert.equal(expectedShellAccess('/zz-unregistered', syntheticRules), 'authenticated');
  assert.equal(expectedShellAccess('/admin/work-hub/unregistered-child', repository.proxy), 'admin-system');
  assert.equal(expectedShellAccess('/admin/community/boards/master', repository.proxy), 'admin-system');
  assert.equal(expectedShellAccess('/admin/community/boards/fixture-id', repository.proxy), 'authenticated');
  assert.equal(expectedShellAccess('/admin/collaboration/scraps/selectScrapDetail/fixture-id', repository.proxy), 'authenticated');
  assert.equal(expectedShellAccess('/admin/collaboration/scraps/selectscrapdetail/fixture-id', repository.proxy), 'admin-system');
});

test('missing registry pages, unknown permissions and generated-page drift are red without changing the population', () => {
  const wrongMode = structuredClone(pageCatalog);
  wrongMode.pagePermissionModes['/admin/survey/polls'] = 'ANY';
  assert.match(parsePageAuthorizationSources(proxySource, pageHelperSource, wrongMode, generatedPageSource).bindingErrors.join('\n'), /PAGE_PERMISSION_MODES must exactly match/);
  const unregisteredMode = structuredClone(pageCatalog);
  unregisteredMode.pagePermissionModes['/not-registered'] = 'ALL';
  assert.match(parsePageAuthorizationSources(proxySource, pageHelperSource, unregisteredMode, generatedPageSource).bindingErrors.join('\n'), /mode registry is invalid/);
  const removed = structuredClone(pageCatalog);
  delete removed.pagePermissions['/admin/system/menus'];
  assert.match(parsePageAuthorizationSources(proxySource, pageHelperSource, removed, generatedPageSource).bindingErrors.join('\n'), /exactly match/);
  const changed = structuredClone(pageCatalog);
  changed.pagePermissions['/admin/system/menus'] = ['UNREGISTERED_PERMISSION'];
  assert.match(parsePageAuthorizationSources(proxySource, pageHelperSource, changed, generatedPageSource).bindingErrors.join('\n'), /registry is missing, empty or invalid/);
  const lowered = structuredClone(pageCatalog);
  lowered.pagePermissions['/admin/system/menus'] = [];
  assert.match(parsePageAuthorizationSources(proxySource, pageHelperSource, lowered, generatedPageSource).bindingErrors.join('\n'), /exactly match/);
  const { manifest } = currentAnalysis();
  const incompleteRepository = { ...repository, proxy: { ...repository.proxy, pagePermissions: removed.pagePermissions } };
  assert.match(validateRouteCapabilities(manifest, incompleteRepository).errors.join('\n'), /exactly the filesystem route population/);
});

test('proxy shell access is measured separately from unresolved capability roles', () => {
  const analysis = currentAnalysis();
  // 셸 접근 분포의 확인 지점은 원장(config/ui-route-capabilities.json)이다. 기대값은 원장이 아니라 파일시스템 화면과
  //   proxy·redirect 근거에서 따로 계산한다 — 원장에서 뽑아 원장과 비교하면 동어반복이다. 행마다의 대조는
  //   validateRouteCapabilities 가 하고, 여기서는 분포 전체가 근거와 같고 세 셸이 모두 측정되는지를 본다.
  const { proxy } = analysis.repository;
  const evidence = discoverPageRoutes(ROOT).map(({ route, source }) => {
    const routing = expectedRouting(analysis.repository, route, source);
    return { source: expectedShellAccess(route, proxy), effective: expectedEffectiveShellAccess(route, routing, proxy),
      alias: routing.kind !== 'page' };
  });
  const countBy = (rows, key) => Object.fromEntries(Object.entries(Object.groupBy(rows, (row) => row[key]))
    .map(([access, members]) => [access, members.length]).sort(([left], [right]) => left.localeCompare(right)));
  const ledgerSource = countBy(analysis.manifest.routes, 'sourceShellAccess');
  const ledgerEffective = countBy(analysis.manifest.routes, 'shellAccess');

  assert.deepEqual(ledgerSource, countBy(evidence, 'source'), 'ledger source shell access differs from proxy evidence');
  assert.deepEqual(ledgerEffective, countBy(evidence, 'effective'), 'ledger effective shell access differs from redirect/proxy evidence');
  for (const counts of [ledgerSource, ledgerEffective]) {
    assert.deepEqual(Object.keys(counts), ['admin-system', 'authenticated', 'public'], 'every shell class is measured');
  }
  assert.equal(analysis.result.summary.effectiveAliases, evidence.filter(({ alias }) => alias).length);
  assert.equal(analysis.manifest.externalAliases.length, analysis.result.summary.externalAliases);
  assert.ok(analysis.result.summary.externalAliases > 0, 'config redirects to external aliases are measured');
  // [2026-11-08] SMS 옛 경로는 원 경로도 SMS_READ 로 등록돼 proxy 의 게이트 안이다(실서비스에서는 next.config 리다이렉트가 먼저 돈다).
  //   원 셸과 실효 셸을 따로 재는 것은 등록되지 않은 /admin 밖 원 경로가 관리 화면으로 넘어가는 합성 사례로 본다.
  const legacySms = analysis.manifest.routes.find(({ route }) => route === '/cop/sms/selectSmsList');
  assert.deepEqual(
    { sourceShellAccess: legacySms.sourceShellAccess, shellAccess: legacySms.shellAccess },
    { sourceShellAccess: 'admin-system', shellAccess: 'admin-system' },
  );
  const redirectRules = { pagePermissions: { '/admin/zz-target': ['SMS_READ'] } };
  assert.equal(expectedShellAccess('/zz-legacy/source', redirectRules), 'authenticated');
  assert.equal(expectedEffectiveShellAccess('/zz-legacy/source', { kind: 'config-redirect', target: '/admin/zz-target?tab=a' }, redirectRules), 'admin-system');
  // [2026-11-08 DEC-OPS-404] 셸 입장은 역할이 아니다. 확정한 roles 는 기본 설치 페르소나 — 페이지 권한의 기본 그룹(ANY 는 합,
  //   ALL 은 교집합, 권한이 없으면 AUTHENTICATED, 리다이렉트는 목적지, 공개 셸은 ANONYMOUS)과 같아야 한다. 셸 값을 그대로
  //   옮기면 관리자 셸의 일반 사용자 화면(메모 보고 등)에서 어긋난다. 기본 그룹이 없는 권한의 화면은 UNVERIFIED 로 남는다.
  const catalog = JSON.parse(fs.readFileSync(path.join(ROOT, 'config', 'governance', 'permission-catalog.json'), 'utf8'));
  const defaultGroups = new Map(catalog.permissions.map((permission) => [permission.code, permission.defaultGroups]));
  const GROUP_ROLE = { ROLE_USER: 'USER', ROLE_ADMIN: 'ADMIN', ROLE_SYSTEM: 'SYSTEM' };
  const ROLE_ORDER = ['USER', 'ADMIN', 'SYSTEM'];
  const resolveTarget = (target) => {
    const segments = (target.split(/[?#]/u)[0].replace(/\/$/u, '') || '/').split('/');
    return analysis.manifest.routes.find(({ route }) => {
      const parts = route.split('/');
      return parts.length === segments.length && parts.every((part, index) => part === segments[index] || /^\[.+\]$/u.test(part));
    });
  };
  const persona = (entry, depth = 0) => {
    if (entry.routing.kind !== 'page' && depth < 3) {
      const destination = resolveTarget(entry.routing.target);
      if (destination) return persona(destination, depth + 1);
    }
    if (entry.shellAccess === 'public') return ['ANONYMOUS'];
    const required = catalog.pagePermissions[entry.route];
    if (!Array.isArray(required)) return null;
    if (required.length === 0) return ['AUTHENTICATED'];
    const sets = required.map((code) => new Set((defaultGroups.get(code) ?? []).map((group) => GROUP_ROLE[group])));
    const roles = catalog.pagePermissionModes[entry.route] === 'ALL'
      ? [...sets[0]].filter((role) => sets.every((set) => set.has(role)))
      : [...new Set(sets.flatMap((set) => [...set]))];
    return roles.length ? roles.sort((left, right) => ROLE_ORDER.indexOf(left) - ROLE_ORDER.indexOf(right)) : [];
  };
  for (const entry of analysis.manifest.routes) {
    const expected = persona(entry);
    if (expected?.length === 0) {
      assert.deepEqual(entry.roles, ['UNVERIFIED'], `${entry.route}: no default group opens the page, so no default persona may be asserted`);
      assert.match(entry.review?.reason ?? '', /no default group/u, `${entry.route}: the unresolved persona needs its reason`);
      continue;
    }
    if (entry.roles.includes('UNVERIFIED')) continue;
    assert.deepEqual(entry.roles, expected, `${entry.route}: roles must equal the default-installation persona, not the shell admission`);
  }
  assert.ok(
    analysis.manifest.routes.some(({ shellAccess, roles }) => shellAccess === 'admin-system' && roles.includes('USER')),
    'proxy shell admission must not be promoted to a domain capability role',
  );
});

test('current unresolved product evidence is explicit and does not claim G1 readiness', () => {
  const analysis = currentAnalysis();

  assert.equal(analysis.result.summary.menuEvidence, 'blocked-external');
  assert.equal(
    analysis.manifest.menuSnapshot.source,
    'live tb_menu_info structural census only via scripts/menu-census.mjs; role exposure not measured',
  );
  assert.ok(analysis.result.summary.unresolvedRoutes > 0);
  assert.equal(analysis.result.summary.gateReady, false);
  const search = analysis.manifest.routes.find(({ route }) => route === '/search');
  assert.equal(search?.status, 'live');
  const userSearch = search.capabilities.find(({ id }) => id === 'search.users');
  assert.equal(userSearch?.status, 'live');
  assert.equal(userSearch?.candidateStatus, undefined);
  assert.equal(userSearch?.evidenceLevel, 'E4');
  assert.equal(userSearch?.actorScope, 'AUTHENTICATED');
  assert.equal(userSearch?.dataSource, 'authenticated-minimal-user-search-api');
  const articleSearch = search.capabilities.find(({ id }) => id === 'search.articles');
  assert.equal(articleSearch?.status, 'live');
  assert.equal(articleSearch?.evidenceLevel, 'E4');
  assert.equal(search.capabilities.some(({ id }) => id === 'search.users-user'), false);
  assert.equal(search.capabilities.some(({ id }) => id === 'search.users-admin'), false);

  const boardDetail = analysis.manifest.routes.find(
    ({ route }) => route === '/admin/community/boards/detail',
  );
  const boardRead = boardDetail.capabilities.find(({ id }) => id === 'board.detail-read');
  const boardMutations = boardDetail.capabilities.find(
    ({ id }) => id === 'board.detail-owner-mutations',
  );
  assert.equal(boardDetail?.status, 'partial');
  assert.equal(boardRead?.candidateStatus, 'live');
  assert.equal(boardRead?.actorScope, 'AUTHENTICATED');
  assert.equal(boardRead?.dataSource, 'authenticated-boards+comments-api');
  assert.ok(
    boardRead?.evidence.includes(
      'frontend/src/app/admin/community/boards/detail/__tests__/BoardDetailServer.test.ts',
    ),
  );
  assert.equal(boardMutations?.status, 'partial');
  assert.equal(boardMutations?.candidateStatus, 'live');
  assert.equal(boardMutations?.actorScope, 'owner|ADMIN|SYSTEM');
  assert.deepEqual(boardMutations?.actions, ['delete', 'edit']);

  const surveyItems = analysis.manifest.routes.find(({ route }) => route === '/admin/survey/items');
  assert.equal(surveyItems.routing.target, '/admin/survey/hub?tab=questions');
  assert.deepEqual(surveyItems.observedPageRedirectCalls, ['/admin/survey/hub?tab=questions']);
});

test('menu census scope cannot be promoted to role-aware exposure without evidence', () => {
  const manifest = structuredClone(currentAnalysis().manifest);
  manifest.menuSnapshot.source = 'live tb_menu_info/tb_menu_crt_dtl via scripts/menu-census.mjs';

  const errors = validateRouteCapabilities(manifest, repository).errors.join('\n');
  assert.match(errors, /tb_menu_info-only structural scope/);
});

test('global command shortcuts do not advertise demo or misleading operational capabilities', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'components', 'ui', 'global-command-center.tsx'),
    'utf8',
  );

  assert.doesNotMatch(source, /id: 'act-(?:notif|audit|workflow|form)'/);
  assert.doesNotMatch(source, /AI 디스패치|보안 감사 타임머신|워크플로우 설계|문서 자동화 관리/);
  assert.doesNotMatch(source, /시스템 상태:.*최적화됨/);
});

test('retired workflow demos stay absent while real approvals and templates remain', () => {
  const { manifest } = currentAnalysis();
  const permissions = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/governance/permission-catalog.json'), 'utf8'));
  for (const route of ['/admin/workflow', '/admin/sanctn/workflow', '/admin/sanctn/forms']) {
    assert.equal(fs.existsSync(path.join(ROOT, 'frontend/src/app', route, 'page.tsx')), false, route);
    assert.equal(manifest.routes.some(row => row.route === route), false, route);
    assert.equal(Object.hasOwn(permissions.pagePermissions, route), false, route);
    assert.equal(repository.configRedirects.redirects.has(route), false, route);
  }
  for (const route of ['/approvals', '/admin/community/templates']) {
    assert.ok(manifest.routes.some(row => row.route === route), route);
    assert.ok(fs.existsSync(path.join(ROOT, 'frontend/src/app', route, 'page.tsx')), route);
  }
});

test('notification stream separates API failure from empty and the dispatch demo stays removed', () => {
  const hub = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'components', 'ui', 'smart-notification-hub.tsx'),
    'utf8',
  );
  const client = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'admin', 'notifications', 'NotificationsClient.tsx'),
    'utf8',
  );

  assert.match(hub, /error=\{error\}/);
  assert.match(hub, /onRetry=\{refresh\}/);
  assert.match(hub, /onClick=\{refresh\}/);
  assert.doesNotMatch(hub, /98\.2%|value="ACTIVE"/);

  // [2026-09-06 DEC-OPS-038] '발송 미리보기 (데모)' 뷰와 히어로 블록을 걷었다(감사 D09-05). 종전 계약은 데모가
  // "스스로 데모라고 말하는지" 를 봤지만, 이제는 데모 자체와 그 진입(?view=dispatch)·장식 히어로가 없어야 한다.
  assert.ok(
    !fs.existsSync(path.join(ROOT, 'frontend', 'src', 'app', 'components', 'ui', 'notification-sender.tsx')),
    'notification-sender.tsx 가 되살아났다 — 발송은 수신자 해석·인가 설계 없이 데모로 돌아오지 않는다',
  );
  // 주석은 걷어낸 이유를 기록하므로 검사 대상이 아니다 — 코드만 본다.
  const clientCode = client.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\n]*/g, '');
  assert.doesNotMatch(clientCode, /view=dispatch|NotificationSender|useSearchParams|<Bell\b[^>]*size=\{260\}/);
  assert.match(client, /<SmartNotificationHub \/>/);
  const notification = currentAnalysis().manifest.routes.find(({ route }) => route === '/admin/notifications');
  assert.equal(notification.capabilities.some(({ id }) => id === 'notifications.dispatch-preview'), false);
  // [2026-09-06 DEC-OPS-042] 'send' 는 데모의 부활이 아니라 실기능이다 — POST /api/v1/admin/notifications/dispatch
  //   (ADMIN/SYSTEM, 수신자 esntlId 서버 해석)를 부르는 notifications.dispatch capability 다. 데모 preview 부재 검사는 그대로다.
  assert.deepEqual(notification.supportedActions, ['local-search', 'send', 'tab-filter']);
  assert.equal(notification.capabilities.some(({ id }) => id === 'notifications.dispatch'), true);
});

test('empty, missing, and duplicate route populations fail closed', () => {
  const analysis = currentAnalysis();

  const emptyRepository = { ...repository, pages: [] };
  const emptyManifest = { ...analysis.manifest, routes: [] };
  assert.match(
    validateRouteCapabilities(emptyManifest, emptyRepository).errors.join('\n'),
    /route population is empty/,
  );

  const missing = structuredClone(analysis.manifest);
  const removed = missing.routes.pop();
  assert.match(
    validateRouteCapabilities(missing, repository).errors.join('\n'),
    new RegExp(`manifest is missing filesystem route: ${removed.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  );

  // 동결 목록에만 남은 화면은 아무것도 지키지 않는다 — 원장에서 빠지면 동결 항목도 함께 빠져야 한다.
  const unfrozen = structuredClone(analysis.manifest);
  unfrozen.routes = unfrozen.routes.filter(({ route }) => route !== '/approvals/draft');
  assert.match(
    validateRouteCapabilities(unfrozen, repository).errors.join('\n'),
    /frozen capability expectation has no ledger route: \/approvals\/draft/,
  );
  assert.doesNotMatch(
    validateRouteCapabilities(analysis.manifest, repository).errors.join('\n'),
    /frozen capability expectation has no ledger route/,
  );
  // 화면 파일까지 걷어도 모든 프로필이 남기던 화면이면 투영 생략이 아니다 — 동결 항목이 낡은 것이다
  // (2026-09-08 걷은 마이페이지 화면의 항목이 이 모양으로 남아 있었다).
  const retired = structuredClone(analysis.manifest);
  retired.routes = retired.routes.filter(({ route }) => route !== '/admin/user/absences');
  const retiredRepository = structuredClone(repository);
  retiredRepository.pages = retiredRepository.pages.filter(({ route }) => route !== '/admin/user/absences');
  delete retiredRepository.proxy.pagePermissions['/admin/user/absences'];
  assert.match(
    validateRouteCapabilities(retired, retiredRepository).errors.join('\n'),
    /frozen capability expectation has no ledger route: \/admin\/user\/absences/,
  );
  // [2026-10-05] 생성물은 자기 구성의 제외 경로만 알고 다른 시작 구성을 모른다. 생성물(표지와 생성기 구조가 맞는 트리)이면 파일이
  // 없는 동결 화면을 투영이 걷은 화면으로 본다(11단계 C5 — 판별은 매니페스트 v2 의 표지다).
  const coreProjection = repository.profileProjections.profiles.find(row => row.profile === 'core');
  const projectedRepository = { ...retiredRepository, profileProjections: { projection: true, profiles: [coreProjection] } };
  assert.doesNotMatch(
    validateRouteCapabilities(retired, projectedRepository).errors.join('\n'),
    /frozen capability expectation has no ledger route/,
  );
  // 원본에서는 시작 구성이 하나뿐이라도 투영 모드로 보지 않는다 — 그 구성이 남기는 화면의 낡은 동결 항목은 그대로 red 다.
  const singlePresetRepository = { ...retiredRepository, profileProjections: { projection: false, profiles: [coreProjection] } };
  assert.match(validateRouteCapabilities(retired, singlePresetRepository).errors.join('\n'),
    /frozen capability expectation has no ledger route: \/admin\/user\/absences/);

  const duplicate = structuredClone(analysis.manifest);
  duplicate.routes.push(structuredClone(duplicate.routes[0]));
  assert.match(
    validateRouteCapabilities(duplicate, repository).errors.join('\n'),
    /manifest route is duplicated/,
  );
});

test('proxy access drift and redirect drift fail closed', () => {
  const analysis = currentAnalysis();
  const accessDrift = structuredClone(analysis.manifest);
  const workHub = accessDrift.routes.find(({ route }) => route === '/admin/work-hub');
  assert.equal(expectedShellAccess(workHub.route, repository.proxy), 'authenticated');
  workHub.shellAccess = 'admin-system';
  assert.match(
    validateRouteCapabilities(accessDrift, repository).errors.join('\n'),
    /shellAccess must match effective redirect\/proxy evidence/,
  );

  const redirectDrift = structuredClone(analysis.manifest);
  const redirected = redirectDrift.routes.find(({ routing }) => routing.kind === 'config-redirect');
  assert.ok(redirected, 'fixture requires at least one configured redirect route');
  redirected.routing.target = '/synthetic-wrong-target';
  assert.match(
    validateRouteCapabilities(redirectDrift, repository).errors.join('\n'),
    /routing drifted from next\.config\.ts/,
  );

  const sourceConflictRepository = {
    ...repository,
    configRedirects: {
      ...repository.configRedirects,
      redirects: new Map(repository.configRedirects.redirects),
    },
  };
  sourceConflictRepository.configRedirects.redirects.set('/admin/survey/items', {
    kind: 'config-redirect',
    target: '/admin/survey/hub?tab=synthetic-conflict',
    permanent: false,
  });
  assert.match(
    validateRouteCapabilities(analysis.manifest, sourceConflictRepository).errors.join('\n'),
    /redirect sources disagree/,
  );

  const cycleRepository = {
    ...repository,
    configRedirects: {
      ...repository.configRedirects,
      redirects: new Map(repository.configRedirects.redirects),
    },
  };
  cycleRepository.configRedirects.redirects.set('/admin/survey/manage', {
    kind: 'config-redirect',
    target: '/admin/survey/manage',
    permanent: false,
  });
  assert.match(
    validateRouteCapabilities(analysis.manifest, cycleRepository).errors.join('\n'),
    /redirect cycle detected/,
  );
});

test('unverified fields require a bounded review and demo cannot leak to core profiles', () => {
  const analysis = currentAnalysis();
  const unreviewed = structuredClone(analysis.manifest);
  const unresolved = unreviewed.routes.find(({ unverifiedFields }) => unverifiedFields.length > 0);
  delete unresolved.review;
  assert.match(
    validateRouteCapabilities(unreviewed, repository).errors.join('\n'),
    /unverified fields require review owner and reason/,
  );

  const predatesReview = structuredClone(analysis.manifest);
  predatesReview.routes.find(({ unverifiedFields }) => unverifiedFields.length > 0).review.reviewBy = '2026-08-19';
  assert.match(
    validateRouteCapabilities(predatesReview, repository).errors.join('\n'),
    /reviewBy predates its evidence review/,
  );

  const demoLeak = structuredClone(analysis.manifest);
  demoLeak.routes.find(({ route }) => route === '/admin/patterns').profileOwners = ['core', 'demo'];
  assert.match(
    validateRouteCapabilities(demoLeak, repository).errors.join('\n'),
    /demo capability leaks into a non-demo profile owner/,
  );

  // 소유 누락과 시연 누수의 부정 시험은 남아 있는 패턴 갤러리로 유지한다(ADR-0049).
  // 결재 시작 구성이 갤러리를 지우지 않는 투영을 만들어, 원장의 소유 누락을 잡는지 본다.
  const shipped = structuredClone(repository);
  const approval = shipped.profileProjections.profiles.find(({ profile }) => profile === 'approval');
  assert.ok(approval?.removePaths.includes('src/app/admin/patterns'), 'the approval preset removes the pattern gallery');
  approval.removePaths = approval.removePaths.filter((removal) => removal !== 'src/app/admin/patterns');
  const omitted = structuredClone(analysis.manifest);
  const galleryEntry = omitted.routes.find(({ route }) => route === '/admin/patterns');
  galleryEntry.profileOwners = ['demo'];
  galleryEntry.unverifiedFields = galleryEntry.unverifiedFields.filter(field => field !== 'profileOwners');
  galleryEntry.directProjectionProfiles = directProjectionProfiles(galleryEntry.source, shipped.profileProjections);
  assert.deepEqual(galleryEntry.directProjectionProfiles, ['approval', 'demo']);
  assert.deepEqual(validateRouteCapabilities(omitted, shipped).errors, [
    'route /admin/patterns: profileOwners omit presets that ship the screen: approval',
  ]);
  // 소유에 적으면 누락은 풀리고 누수 가드가 그 구성을 잡는다. 생성물(자기 구성 하나만 아는 투영)은 이 대조를 하지 않는다.
  galleryEntry.profileOwners = ['approval', 'demo'];
  assert.match(validateRouteCapabilities(omitted, shipped).errors.join('\n'), /demo capability leaks into a non-demo profile owner/);
  galleryEntry.profileOwners = ['demo'];
  shipped.profileProjections.projection = true;
  assert.ok(!validateRouteCapabilities(omitted, shipped).errors.some((error) => error.includes('profileOwners omit')));

  const falseLive = structuredClone(analysis.manifest);
  const notification = falseLive.routes.find(({ route }) => route === '/admin/notifications');
  // [2026-09-06 DEC-OPS-038] dispatch-preview 데모는 걷었다. [2026-11-08] 화면에 없던 health-metrics 도 걷었다 — E3 까지만 있고
  //   목업 원천·미지원 동작이 없는 알림 보내기를 live 로 올린다. 그래서 E4·E5 요건 하나만 붉어야 한다(예전 단언은 목업 규칙과의
  //   '또는' 이라 E4 요건을 지워도 통과했다).
  const dispatch = notification.capabilities.find(({ id }) => id === 'notifications.dispatch');
  dispatch.status = 'live';
  notification.status = 'partial';
  assert.match(
    validateRouteCapabilities(falseLive, repository).errors.join('\n'),
    /notifications\.dispatch: live requires current E4 or E5 evidence/,
  );
});

/*
  [2026-11-09 DEC-OPS-409] 시연 역량이 시연 밖 구성이 싣는 화면에 있어도 되는 경우는 시연 기능만 싣는 슬롯 기여로 붙을 때뿐이다. 감시 허브의
  표본(추세·다차원 상태)을 공통 가동 상태 탭에서 하네스 탭 기여로 옮기고 허브 소유를 다섯 구성으로 정했다. 허용 조건이 풀리는 반례마다 누수
  가드가 다시 붉어야 한다 — 2026-11-08 의 첫 허용 조건은 지워지는 시험 파일만 적어도 통과했다(Codex 20차).
*/
test('a demo capability sits on a shared screen only as a demo-only slot contribution that the page renders', () => {
  const { manifest } = currentAnalysis();
  const HUB = '/admin/system/monitoring/hub';
  const SAMPLE = 'monitoring.sample-widgets';
  const SHELL = 'frontend/src/app/admin/system/monitoring/MonitoringHubClient.tsx';
  const PANEL = 'frontend/src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx';
  const CONTRIBUTION = 'frontend/src/extensions/showcase/hub-tabs-monitoring.ts';
  const DEMO_ONLY_TEST = 'frontend/src/app/admin/patterns/__tests__/pattern-gallery.test.tsx';
  const leak = (route) => new RegExp(`route ${route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}: demo capability leaks into a non-demo profile owner`);

  const hub = manifest.routes.find(({ route }) => route === HUB);
  // 소유는 화면을 싣는 시작 구성 전부이고, 그 가운데 시연 밖 구성이 있어야 허용 조건이 실제로 쓰인다(구성 이름은 열거하지 않는다 — ADR-0028).
  assert.deepEqual(hub.profileOwners, hub.directProjectionProfiles);
  assert.ok(hub.profileOwners.some((profile) => profile !== 'demo'));
  assert.deepEqual(hub.capabilities.find(({ id }) => id === SAMPLE), {
    ...hub.capabilities.find(({ id }) => id === SAMPLE), status: 'demo', evidence: [PANEL, CONTRIBUTION],
  });
  assert.deepEqual(directProjectionProfiles(DEMO_ONLY_TEST, repository.profileProjections), ['demo']);
  assert.doesNotMatch(validateRouteCapabilities(manifest, repository).errors.join('\n'), leak(HUB));

  const errorsWith = (mutate, inspected = repository) => {
    const copy = structuredClone(manifest);
    const route = copy.routes.find((row) => row.route === HUB);
    mutate(route.capabilities.find(({ id }) => id === SAMPLE), copy);
    return validateRouteCapabilities(copy, inspected).errors.join('\n');
  };
  // ① 모든 구성에 실리는 허브 셸을 증거에 적으면 표본이 그 파일에 있다는 말이다 — 실제로 실리므로 누수다(2026-11-08 철회 사유).
  //   시연 경로를 거쳐 같은 셸을 가리키는 비정규 표기도 같다 — 투영 판정이 원문 접두사를 보므로 시연 전용으로 오판한다(Codex 22차).
  assert.match(errorsWith((sample) => sample.evidence.push(SHELL)), leak(HUB));
  const TRAVERSAL = 'frontend/src/extensions/showcase/../../app/admin/system/monitoring/MonitoringHubClient.tsx';
  assert.deepEqual(directProjectionProfiles(TRAVERSAL, repository.profileProjections), ['demo']);
  assert.ok(fs.statSync(path.join(ROOT, TRAVERSAL)).isFile());
  assert.match(errorsWith((sample) => sample.evidence.push(TRAVERSAL)), leak(HUB));
  assert.match(errorsWith((sample) => sample.evidence.push(SHELL.replaceAll('/', '\\'))), leak(HUB));
  // ② 슬롯 기여 없이 시연 소유 패널만 적으면 화면이 그 패널을 어떻게 싣는지 말하지 않는다.
  assert.match(errorsWith((sample) => { sample.evidence = [PANEL]; }), leak(HUB));
  // ③ 시연 밖에서 지워지는 시험 파일만 적거나, 기여에 시험 파일을 섞으면 허용하지 않는다(Codex 20차 반례).
  assert.match(errorsWith((sample) => { sample.evidence = [DEMO_ONLY_TEST]; }), leak(HUB));
  assert.match(errorsWith((sample) => { sample.evidence = [CONTRIBUTION, DEMO_ONLY_TEST]; }), leak(HUB));
  //   대소문자만 바꾼 시험 경로도 같다 — 대소문자를 가리지 않는 디스크에서는 그 표기로 파일이 열린다(Codex 23차).
  assert.match(errorsWith((sample) => {
    sample.evidence = [CONTRIBUTION, 'frontend/src/app/admin/patterns/__TESTS__/pattern-gallery.TEST.tsx'];
  }), leak(HUB));
  //   시연 경로 안에서 대소문자만 다른 표기는 투영 판정을 통과하므로 디스크의 실제 이름과 대조해 막는다.
  assert.match(errorsWith((sample) => { sample.evidence = [CONTRIBUTION, CONTRIBUTION.replace('hub-tabs-monitoring', 'Hub-Tabs-Monitoring')]; }), leak(HUB));
  // ④ 같은 기여를 그 슬롯 소비자를 싣지 않는 화면에 적으면 그 화면에는 붙지 않는다.
  const POLICIES = '/admin/system/policies';
  assert.match(errorsWith((sample, copy) => {
    const policies = copy.routes.find(({ route }) => route === POLICIES);
    assert.ok(policies.profileOwners.includes('core'));
    policies.capabilities.push(structuredClone(sample));
  }), leak(POLICIES));
  // ⑤ 시연 밖 구성 하나라도 기여를 싣는 투영이면 누수다.
  const shipped = structuredClone(repository);
  const approval = shipped.profileProjections.profiles.find(({ profile }) => profile === 'approval');
  assert.ok(approval.removePaths.includes('src/extensions/showcase'));
  approval.removePaths = approval.removePaths.filter((removal) => removal !== 'src/extensions/showcase');
  assert.match(errorsWith(() => {}, shipped), leak(HUB));
  // ⑥ 자기 구성 하나만 아는 생성물 투영에서는 판정할 수 없으므로 허용하지 않는다.
  const generated = structuredClone(repository);
  generated.profileProjections.projection = true;
  assert.match(errorsWith(() => {}, generated), leak(HUB));
});

// 화면이 슬롯 소비자를 '싣는다'는 판정은 한 줄짜리 기본 바인딩 import 와 그 바인딩의 JSX 사용이 함께 있을 때만이다 — 타입 전용(재수출
//   포함)·require.resolve·실행 여부를 알 수 없는 동적 import·바인딩 없는 import·쓰지 않는 바인딩은 화면이 그 모듈을 그린다는 근거가
//   아니다(Codex 22·23·24차). 판정할 수 없는 형태(이름 import 등)는 허용하지 않는 쪽이다.
test('a page loads a slot consumer only through a bound default import that it renders', (t) => {
  const repoRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'route-page-loads-'));
  t.after(() => fs.rmSync(repoRoot, { recursive: true, force: true }));
  const page = 'frontend/src/app/sample/page.tsx';
  const shell = 'frontend/src/app/sample/SampleShell.tsx';
  fs.mkdirSync(path.join(repoRoot, 'frontend/src/app/sample'), { recursive: true });
  fs.writeFileSync(path.join(repoRoot, shell), 'export default function SampleShell() { return null; }\n');
  const loads = (source) => {
    fs.writeFileSync(path.join(repoRoot, page), source);
    return pageLoadsModule(repoRoot, page, shell);
  };
  const RENDER = 'export default function Page() { return <SampleShell />; }\n';
  assert.equal(loads(`import SampleShell from './SampleShell';\n${RENDER}`), true);
  assert.equal(loads(`import SampleShell from "@/app/sample/SampleShell"\n${RENDER}`), true);
  // 공백만 늘린 부수효과 import, 빈 바인딩, 한 줄 여러 import, 이름 import(판정하지 않는 형태)
  assert.equal(loads(`import  './SampleShell';\n${RENDER}`), false);
  // 쓰지 않는 바인딩, 주석 속에서만 그리는 바인딩
  assert.equal(loads("import SampleShell from './SampleShell';\n"), false);
  assert.equal(loads("import SampleShell from './SampleShell';\n// <SampleShell />\n"), false);
  assert.equal(loads(`import {} from './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`import Other from './Other'; import './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`import {\n  default as SampleShell,\n} from './SampleShell';\n${RENDER}`), false);
  // 다른 모듈을 같은 이름으로 들이면 그 모듈이다
  assert.equal(loads(`import SampleShell from './Other';\n${RENDER}`), false);
  // 아래는 모두 화면이 SampleShell 을 그리는 소스다 — 거짓이 되는 이유는 그 모듈을 싣는 형태여야 한다.
  assert.equal(loads(`export { default } from './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`export { type default as SampleShell } from './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`const SampleShell = dynamic(() => import('./SampleShell'));\n${RENDER}`), false);
  assert.equal(loads(`if (false) { void import('./SampleShell'); }\n${RENDER}`), false);
  assert.equal(loads(`import Other from './Other'; if (false) { void import('./SampleShell'); }\n${RENDER}`), false);
  assert.equal(loads(`import './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`import type SampleShell from './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`import { type Props } from './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`const where = require.resolve('./SampleShell');\n${RENDER}`), false);
  assert.equal(loads(`const SampleShell = require('./SampleShell');\n${RENDER}`), false);
  assert.equal(loads(`// import SampleShell from './SampleShell';\n${RENDER}`), false);
  assert.equal(loads(`/*\nimport SampleShell from './SampleShell';\n*/\n${RENDER}`), false);
});

test('route review records reject impossible dates and missing review accountability', () => {
  const { manifest } = currentAnalysis();
  for (const target of ['route', 'menuSnapshot']) {
    for (const [field, value, expected] of [
      ['reviewBy', '2026-02-30', /reviewBy must be a real YYYY-MM-DD date/],
      ['reviewBy', '2026-08-20', /reviewBy predates its evidence review/],
      ['owner', ' ', /unverified fields require review owner and reason/],
      ['reason', '', /unverified fields require review owner and reason/],
    ]) {
      const fixture = structuredClone(manifest);
      const review = target === 'route'
        ? fixture.routes.find(({ unverifiedFields }) => unverifiedFields.length > 0).review
        : fixture.menuSnapshot.review;
      review[field] = value;
      assert.match(validateRouteCapabilities(fixture, repository).errors.join('\n'), expected, `${target}.${field}`);
    }
  }
  const invalidAsOf = structuredClone(manifest);
  invalidAsOf.asOf = '2026-02-30';
  assert.match(validateRouteCapabilities(invalidAsOf, repository).errors.join('\n'), /manifest asOf must be a real YYYY-MM-DD date/);
});

test('missing evidence and reusable profile projection drift fail closed', () => {
  const analysis = currentAnalysis();
  const missingEvidence = structuredClone(analysis.manifest);
  missingEvidence.routes[0].evidence = ['frontend/src/app/does-not-exist/page.tsx'];
  assert.match(
    validateRouteCapabilities(missingEvidence, repository).errors.join('\n'),
    /evidence path does not exist/,
  );

  const projectionDrift = structuredClone(analysis.manifest);
  projectionDrift.routes[0].directProjectionProfiles = ['demo'];
  assert.match(
    validateRouteCapabilities(projectionDrift, repository).errors.join('\n'),
    /directProjectionProfiles drifted/,
  );
});

test('a projected route population may omit SMS only when the page, permission entry and alias are absent', () => {
  const { manifest } = currentAnalysis();
  const projectedManifest = structuredClone(manifest);
  projectedManifest.routes = projectedManifest.routes.filter(({ route }) => route !== '/admin/uss/ion/sms');
  assert.match(
    validateRouteCapabilities(projectedManifest, repository).errors.join('\n'),
    /manifest is missing filesystem route: \/admin\/uss\/ion\/sms/,
  );

  const projectedRepository = structuredClone(repository);
  projectedRepository.pages = projectedRepository.pages.filter(({ route }) => route !== '/admin/uss/ion/sms');
  assert.match(
    validateRouteCapabilities(projectedManifest, projectedRepository).errors.join('\n'),
    /page permission registry must cover exactly the filesystem route population/,
  );
  delete projectedRepository.proxy.pagePermissions['/admin/uss/ion/sms'];
  assert.match(
    validateRouteCapabilities(projectedManifest, projectedRepository).errors.join('\n'),
    /redirect destination is not a filesystem route: \/cop\/sms\/selectSmsList -> \/admin\/uss\/ion\/sms/,
  );
  projectedManifest.routes = projectedManifest.routes.filter(({ route }) => route !== '/cop/sms/selectSmsList');
  projectedRepository.pages = projectedRepository.pages.filter(({ route }) => route !== '/cop/sms/selectSmsList');
  delete projectedRepository.proxy.pagePermissions['/cop/sms/selectSmsList'];
  projectedRepository.configRedirects.redirects.delete('/cop/sms/selectSmsList');
  assert.deepEqual(validateRouteCapabilities(projectedManifest, projectedRepository).errors, []);

  assert.match(
    validateRouteCapabilities(manifest, projectedRepository).errors.join('\n'),
    /route \/admin\/uss\/ion\/sms: no matching page.ts\/page.tsx exists/,
  );
});

// 11단계 C5: 시작 구성의 화면 제외 경로는 원본이면 카탈로그로, 생성물이면 구성 스냅숏으로 푼다. 표지 위장과 스냅숏 불일치는 실패한다.
test('route ledger profile projections follow the preset compositions and fail closed on a spoofed or unbound marker', (t) => {
  const base = fs.mkdtempSync(path.join(os.tmpdir(), 'egov-route-marker-'));
  t.after(() => fs.rmSync(base, { recursive: true, force: true }));
  const presets = JSON.parse(fs.readFileSync(path.join(ROOT, 'config/modules/presets.json'), 'utf8'));
  assert.deepEqual(repository.profileProjections.profiles.map(({ profile }) => profile), presets.presets.map(({ id }) => id));
  assert.equal(repository.profileProjections.projection, false);
  const tree = (name, presetsFile, selection) => {
    const root = path.join(base, name);
    fs.mkdirSync(path.join(root, 'config/modules'), { recursive: true });
    fs.writeFileSync(path.join(root, 'config/modules/presets.json'), JSON.stringify(presetsFile));
    if (selection) {
      const target = path.join(root, 'config/governance/upstream-review/project-composer-selection.json');
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, JSON.stringify(selection));
    }
    return root;
  };
  assert.throws(() => profileProjections(tree('spoofed', { ...presets, active: 'core' })), /active='core' 인데 생성기 투영 구조가 아니다/);
  const marked = { schemaVersion: 2, active: 'core', presets: [presets.presets.find(({ id }) => id === 'core')] };
  assert.deepEqual(profileProjections(tree('generated', marked, { composition: { profile: 'core', frontend: { removePaths: ['src/app/note'] } } })),
    { projection: true, profiles: [{ profile: 'core', removePaths: ['src/app/note'] }] });
  assert.throws(() => profileProjections(tree('unbound', marked, { composition: { profile: 'demo', frontend: { removePaths: [] } } })),
    /composer selection snapshot does not describe the generated composition: core/);
});

/*
  [2026-11-09] 리다이렉트 별칭은 목적지를 따른다(DEC-OPS-404). 별칭의 상태·출처·동작·이름이 목적지 화면 행과 어긋나면 붉고, 목적지가 아직
  미확인이면(생성물에서 원본 증거를 잃은 경우) 대조하지 않는다.
*/
test('a redirect alias follows its destination page and fails when it drifts', () => {
  const { manifest, result } = currentAnalysis();
  assert.deepEqual(result.errors, []);
  const aliases = manifest.routes.filter(({ routing }) => routing.kind !== 'page');
  assert.ok(aliases.length >= 20, 'the redirect alias population must not collapse');
  for (const alias of aliases) {
    assert.deepEqual(alias.capabilities.map(({ id }) => id), ['redirect-destination'], alias.route);
    assert.deepEqual(alias.unverifiedFields, [], alias.route);
  }
  const ALIAS = '/admin/security/role';
  const DESTINATION = '/admin/security/authority';
  const mutate = (change) => {
    const copy = structuredClone(manifest);
    change(copy.routes.find(({ route }) => route === ALIAS), copy.routes.find(({ route }) => route === DESTINATION), copy);
    return validateRouteCapabilities(copy, repository).errors.join('\n');
  };
  assert.match(mutate((alias) => { alias.visibleLabel = '다른 이름'; }),
    /\/admin\/security\/role: redirect alias visibleLabel must follow its destination/);
  assert.match(mutate((alias) => { alias.capabilities[0].evidenceLevel = 'E4'; }),
    /\/admin\/security\/role: redirect alias evidenceLevel must follow its destination/);
  assert.match(mutate((alias) => { alias.capabilities[0].actions = ['view-list']; alias.supportedActions = ['view-list']; }),
    /\/admin\/security\/role: redirect alias actions must follow its destination/);
  assert.match(mutate((alias) => { alias.capabilities.push({ ...structuredClone(alias.capabilities[0]), id: 'extra' }); }),
    /\/admin\/security\/role: a redirect alias has exactly one redirect-destination capability/);
  assert.match(mutate((alias) => { alias.capabilities[0].evidence = []; }),
    /\/admin\/security\/role: redirect alias evidence must include its redirect source/);
  const configAlias = manifest.routes.find(({ routing }) => routing.kind === 'config-redirect');
  const withoutConfig = structuredClone(manifest);
  const configRow = withoutConfig.routes.find(({ route }) => route === configAlias.route);
  configRow.capabilities[0].evidence = configRow.capabilities[0].evidence.filter((file) => file !== 'frontend/next.config.ts');
  assert.match(validateRouteCapabilities(withoutConfig, repository).errors.join('\n'),
    /redirect alias evidence must include its redirect source\(s\): .*frontend\/next\.config\.ts/);
  // 목적지가 미확인이면 대조하지 않는다 — 생성물에서 목적지만 원본 증거를 잃은 경우다.
  const open = mutate((alias, destination) => {
    destination.unverifiedFields = ['status'];
    destination.review = { owner: 'adopter', reviewBy: '2026-12-31', reason: 'projected' };
    alias.visibleLabel = '원본 관찰';
  });
  assert.doesNotMatch(open, /redirect alias/);
});

/*
  [2026-11-09] E4 는 기계로 묶인다 — roundtrips 가 가리키는 업무 흐름 시험이 기능의 동작을 모두 덮을 때만 E4 이고, 덮으면 반드시 E4 다.
  가짜 네트워크·없는 제목·업무 흐름 밖 시험·증거에 없는 시험·덮지 않은 동작은 각각 붉어야 한다.
*/
test('E4 is exactly a reviewed journey roundtrip binding that covers every action', () => {
  const { manifest } = currentAnalysis();
  const ROUTE = '/admin/operation/events';
  const SPEC = 'frontend/e2e/journeys/event-administration.spec.ts';
  const TITLE = 'Event Operations: Full Event Lifecycle';
  const scenario = (change) => {
    const copy = structuredClone(manifest);
    const route = copy.routes.find((row) => row.route === ROUTE);
    const capability = route.capabilities.find(({ id }) => id === 'event.mutations');
    delete capability.roundtrips;
    capability.status = 'partial';
    capability.candidateStatus = 'live';
    capability.evidenceLevel = 'E3';
    capability.evidence = [...new Set([...capability.evidence, SPEC])].sort();
    change(capability, route);
    route.status = route.capabilities.some(({ status }) => status !== route.capabilities[0].status) ? 'partial' : route.capabilities[0].status;
    return validateRouteCapabilities(copy, repository).errors.filter((error) => error.includes('event.mutations')).join('\n');
  };
  const full = [{ spec: SPEC, test: TITLE, actions: ['create', 'delete', 'edit'] }];
  assert.match(scenario((capability) => { capability.evidenceLevel = 'E4'; }),
    /event\.mutations: E4 requires journey roundtrips that together cover every action/);
  assert.match(scenario((capability) => { capability.roundtrips = full; }),
    /event\.mutations: journey roundtrips cover every action, so evidenceLevel must be E4/);
  assert.match(scenario((capability) => { capability.roundtrips = full; capability.evidenceLevel = 'E4'; }),
    /event\.mutations: current E4 evidence promotes the live candidate/);
  assert.equal(scenario((capability) => {
    capability.roundtrips = full; capability.evidenceLevel = 'E4'; capability.status = 'live'; delete capability.candidateStatus;
  }).replace(/^.*drifted from the frozen expectation.*$/gm, '').trim(), '');
  assert.match(scenario((capability) => {
    capability.roundtrips = [{ spec: SPEC, test: TITLE, actions: ['create', 'edit'] }]; capability.evidenceLevel = 'E4';
  }), /event\.mutations: E4 requires journey roundtrips that together cover every action/);
  assert.match(scenario((capability) => { capability.roundtrips = [{ spec: SPEC, test: `${TITLE} (없음)`, actions: ['create'] }]; }),
    /event\.mutations: roundtrip test must be declared exactly once/);
  assert.match(scenario((capability) => { capability.roundtrips = [{ spec: SPEC, test: TITLE, actions: ['create', 'publish'] }]; }),
    /event\.mutations: roundtrip actions must be a non-empty unique subset of the capability actions/);
  const AUTH = 'frontend/e2e/journeys/authentication.spec.ts';
  assert.match(scenario((capability) => {
    capability.evidence = [...capability.evidence, AUTH].sort();
    capability.roundtrips = [{ spec: AUTH, test: 'Logout Redirection and Session Cleanup', actions: ['create'] }];
  }), /event\.mutations: roundtrip spec stubs the network, so it is not a server roundtrip/);
  assert.match(scenario((capability) => {
    capability.roundtrips = [{ spec: 'frontend/e2e/contracts/api-contract.spec.ts', test: TITLE, actions: ['create'] }];
  }), /event\.mutations: roundtrip spec must be a browser journey under frontend\/e2e\/journeys\//);
  assert.match(scenario((capability) => {
    capability.evidence = capability.evidence.filter((file) => file !== SPEC);
    capability.roundtrips = [{ spec: SPEC, test: TITLE, actions: ['create'] }];
  }), /event\.mutations: roundtrip spec must be listed in evidence/);
});

/*
  [2026-11-10 Codex 32차] 가리킨 시험을 주석 처리해도 정규식은 제목을 찾아 E4 가 남았다. 이제 토큰으로 실제 test(...) 호출만 센다.
  가로채기는 spec 이 불러오는 frontend/e2e 의 fixture·helper 까지 주석을 지우고 본다.
*/
test('journey roundtrip titles count only real test() calls, not comments, strings, skip or describe', () => {
  const source = [
    "import { test } from '../fixtures/browser-test';",
    "test.describe('묶음', () => {",
    "  test('실제 시험', async () => {});",
    "  // test('주석 처리한 시험', async () => {});",
    "  /* test('블록 주석 시험', async () => {}); */",
    "  const note = \"test('문자열 속 시험', async () => {});\";",
    "  test.skip('건너뛴 시험', async () => {});",
    "  test.fixme('고칠 시험', async () => {});",
    "  obj.test('점 호출', async () => {});",
    "  describe('다른 함수', () => {});",
    '  test(`템플릿 제목`, async () => {});',
    "  test('두 번', async () => {});",
    "  test('두 번', async () => {});",
    '});',
  ].join('\n');
  const declarations = journeyTestDeclarations(source, 'frontend/e2e/journeys/sample.spec.ts');
  assert.deepEqual(Object.fromEntries(declarations), { '실제 시험': 1, '템플릿 제목': 1, '두 번': 2 });
});

test('a journey that stubs the network through an imported fixture is not a server roundtrip', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'journey-stub-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const write = (relative, text) => {
    fs.mkdirSync(path.dirname(path.join(root, relative)), { recursive: true });
    fs.writeFileSync(path.join(root, relative), text);
  };
  write('frontend/e2e/journeys/clean.spec.ts', "import { test } from '../fixtures/clean';\ntest('a', async () => {});\n");
  write('frontend/e2e/fixtures/clean.ts', "// page.route('**/api/**', route => route.fulfill({}));\nexport { test } from '@playwright/test';\n");
  write('frontend/e2e/journeys/nested.spec.ts', "import { test } from '../helpers/chain';\ntest('a', async () => {});\n");
  write('frontend/e2e/helpers/chain.ts', "export { test } from '../fixtures/stubbed';\n");
  write('frontend/e2e/fixtures/stubbed.ts', "export const test = base.extend({ page: async ({ page }, use) => { await page.route('**/api/**', r => r.fulfill({ body: '{}' })); await use(page); } });\n");
  write('frontend/e2e/journeys/typed.spec.ts', "import type { Stub } from '../fixtures/stubbed';\ntest('a', async () => {});\n");
  assert.deepEqual(journeyNetworkStubSources(root, 'frontend/e2e/journeys/clean.spec.ts'), []);
  assert.deepEqual(journeyNetworkStubSources(root, 'frontend/e2e/journeys/nested.spec.ts'), ['frontend/e2e/fixtures/stubbed.ts']);
  assert.deepEqual(journeyNetworkStubSources(root, 'frontend/e2e/journeys/typed.spec.ts'), []);
  assert.deepEqual(journeyNetworkStubSources(ROOT, 'frontend/e2e/journeys/authentication.spec.ts'),
    ['frontend/e2e/journeys/authentication.spec.ts']);
});

test('frozen capabilities with E4 or absent evidence reset to route-capability-review only in generated projections', () => {
  const { manifest } = currentAnalysis();
  const makeReviewReset = (entry) => {
    entry.capabilities = [{
      id: 'route-capability-review',
      status: 'unverified',
      dataSource: 'unverified',
      actions: [],
      unsupportedVisibleActions: [],
      actorScope: 'UNVERIFIED',
      visibleLabel: 'unverified',
      primaryTask: true,
      decisionSafe: false,
      evidenceLevel: 'E0',
      lastVerifiedAt: manifest.asOf,
      owner: 'adopter product/UX + domain owner',
      evidence: [entry.source],
    }];
    entry.status = 'unverified';
    entry.dataSource = 'unverified';
    entry.supportedActions = [];
    entry.decisionSafe = false;
    entry.unverifiedFields = [...new Set([...(entry.unverifiedFields ?? []), 'status', 'dataSource', 'supportedActions'])].sort();
    entry.review = { owner: 'adopter product/UX + domain owner', reviewBy: '2026-12-31', reason: 'projected runtime evidence reset' };
  };

  // ① 원본 저장소(projection: false)에서는 /search 를 검토 행으로 되돌릴 수 없다.
  const upstreamReset = structuredClone(manifest);
  makeReviewReset(upstreamReset.routes.find(({ route }) => route === '/search'));
  assert.match(
    validateRouteCapabilities(upstreamReset, repository).errors.join('\n'),
    /route \/search: capability ids must match the frozen capability expectation/,
  );

  // ② 생성물 투영(projection: true)에서는 E4 인 /search 가 그대로 남으면 붉고, 검토 행으로 되돌린 상태만 허용한다.
  const coreProjection = repository.profileProjections.profiles.find(({ profile }) => profile === 'core');
  const projectedRepository = { ...structuredClone(repository), profileProjections: { projection: true, profiles: [coreProjection] } };
  assert.match(
    validateRouteCapabilities(manifest, projectedRepository).errors.join('\n'),
    /route \/search: projected route whose frozen capability uses E4\/E5 or absent evidence must reset to route-capability-review/,
  );

  const projectedValid = structuredClone(manifest);
  for (const row of projectedValid.routes) {
    row.directProjectionProfiles = directProjectionProfiles(row.source, projectedRepository.profileProjections);
  }
  makeReviewReset(projectedValid.routes.find(({ route }) => route === '/search'));
  assert.ok(
    !validateRouteCapabilities(projectedValid, projectedRepository).errors.some((error) => error.startsWith('route /search')),
  );

  // ③ E3 이하이고 모든 증거 파일이 있는 동결 화면(/admin/user/absences)은 생성물 투영에서도 임의로 검토 행으로 되돌릴 수 없다.
  const tamperedAbsences = structuredClone(projectedValid);
  makeReviewReset(tamperedAbsences.routes.find(({ route }) => route === '/admin/user/absences'));
  assert.match(
    validateRouteCapabilities(tamperedAbsences, projectedRepository).errors.join('\n'),
    /route \/admin\/user\/absences: capability ids must match the frozen capability expectation/,
  );
});
