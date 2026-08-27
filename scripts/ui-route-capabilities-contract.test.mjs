import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import {
  analyzeRouteCapabilities,
  discoverPageRoutes,
  expectedShellAccess,
  inspectRouteRepository,
  parseConfigRedirectsSource,
  validateRouteCapabilities,
} from './ui-route-capabilities-contract.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST_PATH = path.join(ROOT, 'config', 'ui-route-capabilities.json');
const NOW = Date.parse('2026-08-20T12:00:00Z');

const repository = inspectRouteRepository(ROOT);

function currentAnalysis() {
  return analyzeRouteCapabilities(ROOT, MANIFEST_PATH, NOW);
}

test('current manifest covers every filesystem route exactly once without structural errors', () => {
  const analysis = currentAnalysis();

  assert.deepEqual(analysis.result.errors, []);
  assert.equal(analysis.result.summary.filesystemRoutes, 120);
  assert.equal(analysis.result.summary.manifestRoutes, 120);
  assert.equal(new Set(analysis.manifest.routes.map(({ route }) => route)).size, 120);
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

test('proxy shell access is measured separately from unresolved capability roles', () => {
  const analysis = currentAnalysis();
  const sourceShellCounts = Object.groupBy(
    analysis.manifest.routes,
    ({ sourceShellAccess }) => sourceShellAccess,
  );
  const effectiveShellCounts = Object.groupBy(
    analysis.manifest.routes,
    ({ shellAccess }) => shellAccess,
  );

  assert.equal(sourceShellCounts.public?.length, 1);
  assert.equal(sourceShellCounts.authenticated?.length, 49);
  assert.equal(sourceShellCounts['admin-system']?.length, 70);
  assert.equal(effectiveShellCounts.public?.length, 1);
  assert.equal(effectiveShellCounts.authenticated?.length, 48);
  assert.equal(effectiveShellCounts['admin-system']?.length, 71);
  // [2026-08-27] 18 → 17. /admin/security/login-policy 의 config redirect 를 제거해 그 route 가
  //   별칭이 아니라 정본 page 가 됐다(메뉴 9020120 의 modern_route 가 이 경로를 선언한다).
  //   별칭이 **줄어드는** 방향이라 은폐가 아니다 — 리다이렉트가 삼키던 화면을 되살린 결과다.
  assert.equal(analysis.result.summary.effectiveAliases, 17);
  assert.equal(analysis.result.summary.externalAliases, 2);
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

  const errors = validateRouteCapabilities(manifest, repository, NOW).errors.join('\n');
  assert.match(errors, /tb_menu_info-only structural scope/);
});

test('unavailable network monitoring never presents canonical-empty data as stored inventory', () => {
  const source = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'admin', 'system', 'network', 'NetworkAdminClient.tsx'),
    'utf8',
  );

  assert.match(source, /계측·저장 원천이 연결되지 않아 현재 조회 결과는 항상 비어 있습니다/);
  assert.doesNotMatch(source, /아래 목록은 실제 저장된 데이터/);
  assert.doesNotMatch(source, /정상 운영|운영 중지/);
  assert.match(source, /사용 설정|사용 안 함/);
  assert.doesNotMatch(source, /<HubMetric(?:Grid|Card)/);
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

test('notification stream separates API failure from empty and dispatch is an explicit local demo', () => {
  const hub = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'components', 'ui', 'smart-notification-hub.tsx'),
    'utf8',
  );
  const sender = fs.readFileSync(
    path.join(ROOT, 'frontend', 'src', 'app', 'components', 'ui', 'notification-sender.tsx'),
    'utf8',
  );

  assert.match(hub, /error=\{error\}/);
  assert.match(hub, /onRetry=\{refresh\}/);
  assert.match(hub, /onClick=\{refresh\}/);
  assert.doesNotMatch(hub, /98\.2%|value="ACTIVE"/);

  assert.match(sender, /로컬 미리보기 데모입니다/);
  assert.match(sender, /실제 수신자 조회·AI 생성·전송·예약을 수행하지 않습니다/);
  assert.match(sender, /<Button\b[^>]*\bdisabled\b[^>]*>(?:(?!<\/Button>)[\s\S])*?메시지 일괄 발송(?:(?!<\/Button>)[\s\S])*?<\/Button>/);
  assert.doesNotMatch(sender, /무결성 검증 통과|안전하게 보호되고 있습니다/);
});

test('empty, missing, and duplicate route populations fail closed', () => {
  const analysis = currentAnalysis();

  const emptyRepository = { ...repository, pages: [] };
  const emptyManifest = { ...analysis.manifest, routes: [] };
  assert.match(
    validateRouteCapabilities(emptyManifest, emptyRepository, NOW).errors.join('\n'),
    /route population is empty/,
  );

  const missing = structuredClone(analysis.manifest);
  const removed = missing.routes.pop();
  assert.match(
    validateRouteCapabilities(missing, repository, NOW).errors.join('\n'),
    new RegExp(`manifest is missing filesystem route: ${removed.route.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`),
  );

  const duplicate = structuredClone(analysis.manifest);
  duplicate.routes.push(structuredClone(duplicate.routes[0]));
  assert.match(
    validateRouteCapabilities(duplicate, repository, NOW).errors.join('\n'),
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
    validateRouteCapabilities(accessDrift, repository, NOW).errors.join('\n'),
    /shellAccess must match effective redirect\/proxy evidence/,
  );

  const redirectDrift = structuredClone(analysis.manifest);
  const redirected = redirectDrift.routes.find(({ routing }) => routing.kind === 'config-redirect');
  assert.ok(redirected, 'fixture requires at least one configured redirect route');
  redirected.routing.target = '/synthetic-wrong-target';
  assert.match(
    validateRouteCapabilities(redirectDrift, repository, NOW).errors.join('\n'),
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
    validateRouteCapabilities(analysis.manifest, sourceConflictRepository, NOW).errors.join('\n'),
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
    validateRouteCapabilities(analysis.manifest, cycleRepository, NOW).errors.join('\n'),
    /redirect cycle detected/,
  );
});

test('unverified fields require a bounded review and demo cannot leak to core profiles', () => {
  const analysis = currentAnalysis();
  const unreviewed = structuredClone(analysis.manifest);
  const unresolved = unreviewed.routes.find(({ unverifiedFields }) => unverifiedFields.length > 0);
  delete unresolved.review;
  assert.match(
    validateRouteCapabilities(unreviewed, repository, NOW).errors.join('\n'),
    /unverified fields require review owner and reason/,
  );

  const expired = structuredClone(analysis.manifest);
  expired.routes.find(({ unverifiedFields }) => unverifiedFields.length > 0).review.reviewBy = '2026-08-19';
  assert.match(
    validateRouteCapabilities(expired, repository, NOW).errors.join('\n'),
    /review exception expired/,
  );

  const demoLeak = structuredClone(analysis.manifest);
  demoLeak.routes.find(({ route }) => route === '/admin/workflow').profileOwners = ['core', 'demo'];
  assert.match(
    validateRouteCapabilities(demoLeak, repository, NOW).errors.join('\n'),
    /demo capability leaks into a non-demo profile owner/,
  );

  const falseLive = structuredClone(analysis.manifest);
  const notification = falseLive.routes.find(({ route }) => route === '/admin/notifications');
  const dispatch = notification.capabilities.find(({ id }) => id === 'notifications.dispatch-preview');
  dispatch.status = 'live';
  notification.status = 'partial';
  assert.match(
    validateRouteCapabilities(falseLive, repository, NOW).errors.join('\n'),
    /live requires current E4 or E5 evidence|live cannot contain mock data/,
  );
});

test('missing evidence and reusable profile projection drift fail closed', () => {
  const analysis = currentAnalysis();
  const missingEvidence = structuredClone(analysis.manifest);
  missingEvidence.routes[0].evidence = ['frontend/src/app/does-not-exist/page.tsx'];
  assert.match(
    validateRouteCapabilities(missingEvidence, repository, NOW).errors.join('\n'),
    /evidence path does not exist/,
  );

  const projectionDrift = structuredClone(analysis.manifest);
  projectionDrift.routes[0].directProjectionProfiles = ['demo'];
  assert.match(
    validateRouteCapabilities(projectionDrift, repository, NOW).errors.join('\n'),
    /directProjectionProfiles drifted/,
  );
});
