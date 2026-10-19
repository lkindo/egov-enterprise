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
  for (const [route, required] of Object.entries(pageCatalog.pagePermissions)) {
    if (!route.startsWith('/admin/') && route !== '/admin') continue;
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
  ]) {
    assert.ok(pageHelperSource.includes(before), `red probe target missing: ${before}`);
    assert.notDeepEqual(validatePageAuthorizationBinding(proxySource, pageHelperSource.replace(before, after)), [], before);
  }
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
  const legacySms = analysis.manifest.routes.find(({ route }) => route === '/cop/sms/selectSmsList');
  assert.deepEqual(
    { sourceShellAccess: legacySms.sourceShellAccess, shellAccess: legacySms.shellAccess },
    { sourceShellAccess: 'authenticated', shellAccess: 'admin-system' },
  );
  assert.ok(
    analysis.manifest.routes.some(
      ({ shellAccess, roles }) => shellAccess === 'authenticated' && roles.includes('UNVERIFIED'),
    ),
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
  const workflow = analysis.manifest.routes.find(({ route }) => route === '/admin/workflow');
  assert.equal(workflow?.status, 'partial');
  assert.deepEqual(
    Object.fromEntries(workflow.capabilities.map(({ id, status }) => [id, status])),
    {
      'workflow.canvas': 'demo',
      'workflow.metrics': 'demo',
      'workflow.mutations': 'unavailable',
    },
  );

  const search = analysis.manifest.routes.find(({ route }) => route === '/search');
  assert.equal(search?.status, 'partial');
  const userSearch = search.capabilities.find(({ id }) => id === 'search.users');
  assert.equal(userSearch?.status, 'partial');
  assert.equal(userSearch?.candidateStatus, 'live');
  assert.equal(userSearch?.actorScope, 'AUTHENTICATED');
  assert.equal(userSearch?.dataSource, 'authenticated-minimal-user-search-api');
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

test('direct demo routes disclose static data before interaction and disable unsupported mutations', () => {
  const workflow = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'admin', 'workflow', 'WorkflowClient.tsx'),
    'utf8',
  );
  const forms = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'admin', 'sanctn', 'WorkflowHubClient.tsx'),
    'utf8',
  );

  assert.match(workflow, /정적 데모 화면입니다/);
  assert.match(workflow, /실제 저장·실행·운영 지표를 제공하지 않습니다/);
  assert.doesNotMatch(workflow, /실시간 이벤트 기반 워크플로우를 설계/);
  assert.match(workflow, /<Button\b[^>]*\bdisabled\b[^>]*>(?:(?!<\/Button>)[\s\S])*?히스토리(?:(?!<\/Button>)[\s\S])*?<\/Button>/);
  assert.match(workflow, /<Button\b[^>]*\bdisabled\b[^>]*>(?:(?!<\/Button>)[\s\S])*?설계 등록(?:(?!<\/Button>)[\s\S])*?<\/Button>/);

  assert.match(forms, /정적 데모 화면입니다/);
  assert.match(forms, /실제 결재 양식·엔진 상태·배포 결과가 아닙니다/);
  assert.match(forms, /<Button\b[^>]*\bdisabled\b[^>]*>(?:(?!<\/Button>)[\s\S])*?워크플로우 배포(?:(?!<\/Button>)[\s\S])*?<\/Button>/);
  assert.match(forms, /<Button\b[^>]*\bdisabled\b[^>]*>(?:(?!<\/Button>)[\s\S])*?새 워크플로우 생성(?:(?!<\/Button>)[\s\S])*?<\/Button>/);
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
  demoLeak.routes.find(({ route }) => route === '/admin/workflow').profileOwners = ['core', 'demo'];
  assert.match(
    validateRouteCapabilities(demoLeak, repository).errors.join('\n'),
    /demo capability leaks into a non-demo profile owner/,
  );

  // 손으로 적은 소유가 그 화면을 싣는 시작 구성을 빠뜨리면 누수 가드가 그 구성을 보지 못한다(2026-10-13: 결재 기능이 워크플로우 예시
  // 화면을 소유해 인증 시작 구성 '공통 기반 + 결재' 가 그 화면을 실었는데 원장은 'demo' 만 적었다). 결재 시작 구성이 화면을 지우지
  // 않는 투영을 만들어, 투영을 그대로 따른 원장이 소유 누락으로 붉은지 본다.
  const shipped = structuredClone(repository);
  const approval = shipped.profileProjections.profiles.find(({ profile }) => profile === 'approval');
  assert.ok(approval?.removePaths.includes('src/app/admin/workflow'), 'the approval preset removes the workflow demo today');
  approval.removePaths = approval.removePaths.filter((removal) => removal !== 'src/app/admin/workflow');
  const omitted = structuredClone(analysis.manifest);
  const workflowEntry = omitted.routes.find(({ route }) => route === '/admin/workflow');
  workflowEntry.directProjectionProfiles = directProjectionProfiles(workflowEntry.source, shipped.profileProjections);
  assert.deepEqual(workflowEntry.directProjectionProfiles, ['approval', 'demo']);
  assert.deepEqual(validateRouteCapabilities(omitted, shipped).errors, [
    'route /admin/workflow: profileOwners omit presets that ship the screen: approval',
  ]);
  // 소유에 적으면 누락은 풀리고 누수 가드가 그 구성을 잡는다. 생성물(자기 구성 하나만 아는 투영)은 이 대조를 하지 않는다.
  workflowEntry.profileOwners = ['approval', 'demo'];
  assert.match(validateRouteCapabilities(omitted, shipped).errors.join('\n'), /demo capability leaks into a non-demo profile owner/);
  workflowEntry.profileOwners = ['demo'];
  shipped.profileProjections.projection = true;
  assert.ok(!validateRouteCapabilities(omitted, shipped).errors.some((error) => error.includes('profileOwners omit')));

  const falseLive = structuredClone(analysis.manifest);
  const notification = falseLive.routes.find(({ route }) => route === '/admin/notifications');
  // [2026-09-06 DEC-OPS-038] dispatch-preview 데모는 걷었다 — 같은 라우트의 다른 demo capability(health-metrics)로 false-live 를 검사한다.
  const dispatch = notification.capabilities.find(({ id }) => id === 'notifications.health-metrics');
  dispatch.status = 'live';
  notification.status = 'partial';
  assert.match(
    validateRouteCapabilities(falseLive, repository).errors.join('\n'),
    /live requires current E4 or E5 evidence|live cannot contain mock data/,
  );
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

test('a projected route population may omit the demo workflow only when the page and permission entry are absent', () => {
  const { manifest } = currentAnalysis();
  const projectedManifest = structuredClone(manifest);
  projectedManifest.routes = projectedManifest.routes.filter(({ route }) => route !== '/admin/workflow');
  assert.match(
    validateRouteCapabilities(projectedManifest, repository).errors.join('\n'),
    /manifest is missing filesystem route: \/admin\/workflow/,
  );

  const projectedRepository = structuredClone(repository);
  projectedRepository.pages = projectedRepository.pages.filter(({ route }) => route !== '/admin/workflow');
  assert.match(
    validateRouteCapabilities(projectedManifest, projectedRepository).errors.join('\n'),
    /page permission registry must cover exactly the filesystem route population/,
  );
  delete projectedRepository.proxy.pagePermissions['/admin/workflow'];
  assert.match(
    validateRouteCapabilities(projectedManifest, projectedRepository).errors.join('\n'),
    /redirect destination is not a filesystem route: \/admin\/sanctn\/workflow -> \/admin\/workflow/,
  );
  projectedManifest.routes = projectedManifest.routes.filter(({ route }) => route !== '/admin/sanctn/workflow');
  projectedRepository.pages = projectedRepository.pages.filter(({ route }) => route !== '/admin/sanctn/workflow');
  delete projectedRepository.proxy.pagePermissions['/admin/sanctn/workflow'];
  projectedRepository.configRedirects.redirects.delete('/admin/sanctn/workflow');
  assert.deepEqual(validateRouteCapabilities(projectedManifest, projectedRepository).errors, []);

  assert.match(
    validateRouteCapabilities(manifest, projectedRepository).errors.join('\n'),
    /route \/admin\/workflow: no matching page.ts\/page.tsx exists/,
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
