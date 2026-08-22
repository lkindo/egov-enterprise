#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = path.join(ROOT, 'config', 'ui-route-capabilities.json');

const KNOWN_ROLES = new Set(['ANONYMOUS', 'AUTHENTICATED', 'USER', 'ADMIN', 'SYSTEM', 'UNVERIFIED']);
const KNOWN_PROFILES = new Set(['core', 'collaboration', 'demo', 'UNVERIFIED']);
const KNOWN_STATUSES = new Set(['live', 'partial', 'demo', 'unavailable', 'unverified']);
const KNOWN_SURFACES = new Set(['authentication', 'authenticated-workspace', 'admin-console']);
const KNOWN_SHELL_ACCESS = new Set(['public', 'authenticated', 'admin-system']);
const KNOWN_EVIDENCE_LEVELS = new Set(['E0', 'E1', 'E2', 'E3', 'E4', 'E5']);
const REVIEWABLE_FIELDS = new Set([
  'roles',
  'status',
  'dataSource',
  'supportedActions',
  'profileOwners',
  'journeys',
  'visibleLabel',
  'menuExposure',
]);
const MENU_CENSUS_SOURCE = 'live tb_menu_info structural census only via scripts/menu-census.mjs; role exposure not measured';

const KNOWN_ROUTE_CAPABILITIES = {
  '/admin/workflow': [
    {
      id: 'workflow.canvas', status: 'demo', dataSource: 'static-mock', actions: ['select-mock-node'],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '프로세스 캔버스', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/workflow/WorkflowClient.tsx'],
    },
    {
      id: 'workflow.metrics', status: 'demo', dataSource: 'hardcoded-metrics', actions: [],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '워크플로우 상태 지표', primaryTask: false,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/workflow/WorkflowClient.tsx'],
    },
    {
      id: 'workflow.mutations', status: 'unavailable', dataSource: 'none', actions: [],
      unsupportedVisibleActions: ['history', 'create', 'refresh'], actorScope: 'ADMIN|SYSTEM', visibleLabel: '히스토리·설계 등록·새로고침', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/workflow/WorkflowClient.tsx', 'frontend/src/app/components/ui/global-command-center.tsx'],
    },
  ],
  '/admin/sanctn/forms': [
    {
      id: 'sanction.forms-catalog', status: 'demo', dataSource: 'static-mock', actions: ['switch-local-tab', 'select-static-form'],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: 'Sanction Forms', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/sanctn/WorkflowHubClient.tsx'],
    },
    {
      id: 'sanction.engine-health', status: 'demo', dataSource: 'hardcoded-metrics', actions: [],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: 'Engine Healthy / 99.9% Uptime', primaryTask: false,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/sanctn/WorkflowHubClient.tsx'],
    },
    {
      id: 'sanction.mutations', status: 'unavailable', dataSource: 'none', actions: [],
      unsupportedVisibleActions: ['deploy', 'form-create', 'logic-edit', 'instance-run', 'workflow-create'], actorScope: 'ADMIN|SYSTEM', visibleLabel: '워크플로우·서식 작업', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/sanctn/WorkflowHubClient.tsx', 'frontend/src/app/components/ui/global-command-center.tsx'],
    },
  ],
  '/admin/notifications': [
    {
      id: 'notifications.stream', status: 'partial', candidateStatus: 'live', dataSource: 'notifications-api+websocket', actions: ['local-search', 'tab-filter'],
      unsupportedVisibleActions: ['refresh', 'row-options'], actorScope: 'ADMIN|SYSTEM', visibleLabel: '알림 스트림', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/admin/notifications/NotificationsClient.tsx', 'frontend/src/app/components/ui/smart-notification-hub.tsx', 'frontend/src/lib/hooks/use-notifications.ts', 'frontend/e2e/12-notification.spec.ts'],
    },
    {
      id: 'notifications.health-metrics', status: 'demo', dataSource: 'hardcoded-metrics', actions: [],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '98.2% / ACTIVE', primaryTask: false,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/components/ui/smart-notification-hub.tsx'],
    },
    {
      id: 'notifications.dispatch-preview', status: 'demo', dataSource: 'local-state+hardcoded-target', actions: ['edit-local-message', 'local-preview', 'select-local-channel'],
      unsupportedVisibleActions: ['send', 'schedule', 'ai-options'], actorScope: 'ADMIN|SYSTEM', visibleLabel: 'AI 디스패치 미리보기', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/components/ui/notification-sender.tsx', 'frontend/src/app/components/ui/global-command-center.tsx'],
    },
  ],
  '/admin/system/network': [
    {
      id: 'network.monitoring', status: 'unavailable', dataSource: 'canonical-empty-api', actions: [],
      unsupportedVisibleActions: ['create', 'update', 'delete'], actorScope: 'ADMIN|SYSTEM', visibleLabel: '네트워크 서비스 모니터링', primaryTask: true,
      evidenceLevel: 'E2', evidence: ['frontend/src/app/admin/system/network/NetworkAdminClient.tsx', 'api-server/src/main/java/nuri/api/controller/foundation/controller/system/log/NetworkMonitoringApiController.java'],
    },
  ],
  '/approvals': [
    {
      id: 'approvals.pending-history', status: 'partial', candidateStatus: 'live', dataSource: 'approvals-api', actions: ['list', 'select-detail', 'confirm', 'reject'],
      unsupportedVisibleActions: ['archive-filter', 'server-search', 'refresh'], actorScope: 'AUTHENTICATED', visibleLabel: '결재 목록·승인·반려', primaryTask: true,
      evidenceLevel: 'E2', evidence: ['frontend/src/app/approvals/ApprovalHubClient.tsx', 'frontend/src/services/business/user/approval/ApprovalUserService.ts'],
    },
    {
      id: 'approvals.visualization-metrics', status: 'demo', dataSource: 'hardcoded-metrics', actions: [],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '워크플로우·무결성 지표', primaryTask: false,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/approvals/ApprovalHubClient.tsx'],
    },
  ],
  '/approvals/draft': [
    {
      id: 'draft.form-catalog', status: 'demo', dataSource: 'hardcoded-local-state', actions: ['select-template', 'edit-local-subject', 'edit-local-content', 'back'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '결재 양식 선택·작성', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/approvals/draft/ApprovalDraftHubClient.tsx'],
    },
    {
      id: 'draft.submit', status: 'unavailable', dataSource: 'none', actions: [],
      unsupportedVisibleActions: ['submit'], actorScope: 'AUTHENTICATED', visibleLabel: '결재 상신', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/approvals/draft/ApprovalDraftHubClient.tsx', 'frontend/e2e/11-enterprise-workflow.spec.ts'],
    },
  ],
  '/admin/survey/polls/manage': [
    {
      id: 'poll-governance', status: 'unavailable', dataSource: 'none', actions: [],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '여론조사 거버넌스 준비 중', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/survey/polls/manage/page.tsx'],
    },
  ],
  '/admin/user/absences': [
    {
      id: 'absence-management', status: 'unavailable', dataSource: 'none', actions: [],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '부재 정보 미연동', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/user/absences/page.tsx', 'frontend/src/app/admin/user/UserOrgHubClient.tsx'],
    },
    {
      id: 'absence.user-list-proxy', status: 'partial', dataSource: 'admin-users-api', actions: ['view-users', 'search-users'],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '전체 사용자 목록(부재자 아님)', primaryTask: false,
      evidenceLevel: 'E2', evidence: ['frontend/src/app/admin/user/absences/page.tsx', 'frontend/src/app/admin/user/UserOrgHubClient.tsx'],
    },
  ],
  '/admin/workspace/my-page': [
    {
      id: 'workspace.contents', status: 'partial', candidateStatus: 'live', dataSource: 'mypage-contents-api', actions: ['list', 'local-search', 'toggle-status', 'reload'],
      unsupportedVisibleActions: ['sync', 'item-options'], actorScope: 'ADMIN|SYSTEM', visibleLabel: '마이페이지 콘텐츠 관리', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/admin/workspace/my-page/WorkspaceMyPageClient.tsx', 'frontend/e2e/09-admin-observability-workspace.spec.ts'],
    },
    {
      id: 'workspace.usage-security', status: 'demo', dataSource: 'hardcoded-metrics', actions: [],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: 'HIGH / SAFE', primaryTask: false,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/workspace/my-page/WorkspaceMyPageClient.tsx'],
    },
  ],
  '/admin/community/boards/detail': [
    {
      id: 'board.detail-read', status: 'partial', candidateStatus: 'live', dataSource: 'authenticated-boards+comments-api', actions: ['view-article', 'view-comments'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '게시글 상세·댓글', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/admin/community/boards/detail/BoardDetailServer.ts', 'frontend/src/app/admin/community/boards/detail/__tests__/BoardDetailServer.test.ts'],
    },
    {
      id: 'board.detail-owner-mutations', status: 'partial', candidateStatus: 'live', dataSource: 'boards-mutation-api', actions: ['edit', 'delete'],
      unsupportedVisibleActions: [], actorScope: 'owner|ADMIN|SYSTEM', visibleLabel: '게시글 수정·삭제', primaryTask: false,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/admin/community/boards/detail/BoardDetailClient.tsx', 'frontend/src/app/admin/community/boards/detail/__tests__/board-detail-authorization.test.ts', 'business-app/src/main/java/nuri/business/service/board/BoardService.java', 'business-app/src/test/java/nuri/business/service/board/BoardServiceTest.java'],
    },
  ],
  '/search': [
    {
      id: 'search.users', status: 'partial', candidateStatus: 'live', dataSource: 'authenticated-minimal-user-search-api', actions: ['keyword-search'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '임직원 검색', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/search/SearchClient.tsx', 'frontend/src/app/search/__tests__/SearchClient.contract.test.tsx', 'frontend/src/services/business/user/UserSearchService.ts', 'api-server/src/main/java/nuri/api/controller/UserApiController.java'],
    },
    {
      id: 'search.menu-shortcuts', status: 'demo', dataSource: 'hardcoded-static-list', actions: ['navigate'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '메뉴 바로가기', primaryTask: false,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/search/SearchClient.tsx'],
    },
    {
      id: 'search.articles', status: 'unavailable', dataSource: 'none', actions: [],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '게시글 (미지원)', primaryTask: false,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/search/SearchClient.tsx'],
    },
  ],
};

function normalize(value) {
  return value.split(path.sep).join('/');
}

function isFile(target) {
  try {
    return fs.statSync(target).isFile();
  } catch {
    return false;
  }
}

function isDirectory(target) {
  try {
    return fs.statSync(target).isDirectory();
  } catch {
    return false;
  }
}

function walk(directory, predicate, output = []) {
  if (!isDirectory(directory)) return output;
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const target = path.join(directory, entry.name);
    if (entry.isDirectory()) walk(target, predicate, output);
    else if (entry.isFile() && predicate(target)) output.push(target);
  }
  return output;
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
}

export function aggregateCapabilityStatus(capabilities) {
  const statuses = uniqueSorted((capabilities ?? []).map(({ status }) => status));
  if (statuses.includes('unverified')) return 'unverified';
  if (statuses.length === 1) return statuses[0];
  return statuses.length > 1 ? 'partial' : 'unverified';
}

function aggregateDataSource(capabilities) {
  const sources = uniqueSorted((capabilities ?? []).map(({ dataSource }) => dataSource));
  return sources.length === 1 ? sources[0] : sources.length > 1 ? 'mixed' : 'unverified';
}

function aggregateActions(capabilities) {
  return uniqueSorted((capabilities ?? []).flatMap(({ actions }) => actions ?? []));
}

function knownCapabilitiesForRoute(route, source, asOf) {
  const definitions = KNOWN_ROUTE_CAPABILITIES[route];
  if (!definitions) return null;
  return definitions.map((definition) => ({
    ...definition,
    actions: uniqueSorted(definition.actions ?? []),
    unsupportedVisibleActions: uniqueSorted(definition.unsupportedVisibleActions ?? []),
    decisionSafe: false,
    lastVerifiedAt: asOf,
    owner: 'product/UX + domain owner',
    evidence: uniqueSorted([source, ...(definition.evidence ?? [])]),
  }));
}

function exactArray(left, right) {
  return Array.isArray(left)
    && left.length === right.length
    && left.every((value, index) => value === right[index]);
}

function routeFromPage(pagePath, appRoot) {
  const relativeDirectory = normalize(path.relative(appRoot, path.dirname(pagePath)));
  const segments = [];
  for (const segment of relativeDirectory.split('/').filter(Boolean)) {
    if (/^\(\.{1,3}\)/.test(segment)) {
      throw new Error(`unsupported intercepting route segment ${segment} in ${normalize(pagePath)}`);
    }
    if (segment.startsWith('_')) {
      throw new Error(`page entry under private segment ${segment} requires an explicit census rule: ${normalize(pagePath)}`);
    }
    if (segment.startsWith('@')) continue;
    if (segment.startsWith('(') && segment.endsWith(')')) continue;
    segments.push(segment);
  }
  return `/${segments.join('/')}`;
}

export function discoverPageRoutes(repoRoot = ROOT) {
  const appRoot = path.join(repoRoot, 'frontend', 'src', 'app');
  const pages = walk(appRoot, (candidate) => /^page\.(?:js|jsx|ts|tsx)$/.test(path.basename(candidate)))
    .map((sourcePath) => ({
      route: routeFromPage(sourcePath, appRoot),
      source: normalize(path.relative(repoRoot, sourcePath)),
    }))
    .sort((left, right) => left.route.localeCompare(right.route));
  const byRoute = new Map();
  for (const page of pages) {
    if (byRoute.has(page.route)) {
      throw new Error(`multiple page entries resolve to ${page.route}: ${byRoute.get(page.route)} and ${page.source}`);
    }
    byRoute.set(page.route, page.source);
  }
  return pages;
}

function extractConstStringArray(source, constantName) {
  const escaped = constantName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const declaration = new RegExp(`const\\s+${escaped}\\s*=\\s*\\[([\\s\\S]*?)\\]\\s*as\\s+const`);
  const match = declaration.exec(source);
  if (!match) return null;
  return [...match[1].matchAll(/['"]([^'"]+)['"]/g)].map((item) => item[1]);
}

export function readProxyAccessRules(repoRoot = ROOT) {
  const sourcePath = path.join(repoRoot, 'frontend', 'src', 'proxy.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  return {
    source: normalize(path.relative(repoRoot, sourcePath)),
    userAccessibleAdminPaths: extractConstStringArray(source, 'USER_ACCESSIBLE_ADMIN_PATHS'),
    adminOnlySubpaths: extractConstStringArray(source, 'ADMIN_ONLY_SUBPATHS'),
  };
}

function matchesPrefix(route, prefix) {
  return route === prefix || route.startsWith(`${prefix}/`);
}

export function expectedShellAccess(route, proxyRules) {
  if (route === '/login') return 'public';
  if (!matchesPrefix(route.toLowerCase(), '/admin')) return 'authenticated';
  const normalized = route.toLowerCase();
  const userAccessible = proxyRules.userAccessibleAdminPaths
    .some((prefix) => matchesPrefix(normalized, prefix.toLowerCase()));
  const adminOnly = proxyRules.adminOnlySubpaths
    .some((prefix) => matchesPrefix(normalized, prefix.toLowerCase()));
  return userAccessible && !adminOnly ? 'authenticated' : 'admin-system';
}

function pathOnly(route) {
  return (route ?? '').split('?')[0] || '/';
}

function normalizedRoutingTarget(target) {
  return pathOnly(target).replace(/\$\{([^}]+)\}/g, '[$1]');
}

export function expectedEffectiveShellAccess(route, routing, proxyRules) {
  return expectedShellAccess(
    routing?.kind === 'page' ? route : pathOnly(routing?.target),
    proxyRules,
  );
}

export function expectedSurface(route, shellAccess) {
  if (route === '/login') return 'authentication';
  return shellAccess === 'admin-system' ? 'admin-console' : 'authenticated-workspace';
}

export function parseConfigRedirectsSource(source) {
  const functionMatch = /async\s+redirects\s*\(\s*\)\s*\{[\s\S]*?\breturn\s*\[([\s\S]*?)\]\s*;/.exec(source);
  if (!functionMatch) throw new Error('could not locate a literal redirects() return array');
  const declarations = [...functionMatch[1].matchAll(/\bsource\s*:/g)].length;
  const redirects = new Map();
  const matcher = /\{\s*source:\s*['"]([^'"]+)['"]\s*,\s*destination:\s*['"]([^'"]+)['"]\s*,\s*permanent:\s*(true|false)\s*,?\s*\}/g;
  for (const match of functionMatch[1].matchAll(matcher)) {
    if (redirects.has(match[1])) throw new Error(`duplicate next.config redirect source: ${match[1]}`);
    redirects.set(match[1], {
      kind: 'config-redirect',
      target: match[2],
      permanent: match[3] === 'true',
    });
  }
  if (redirects.size !== declarations) {
    throw new Error(`could not parse every redirect declaration: found ${declarations}, parsed ${redirects.size}`);
  }
  if (redirects.size === 0) throw new Error('next.config redirects population is empty');
  return redirects;
}

export function discoverConfigRedirects(repoRoot = ROOT) {
  const sourcePath = path.join(repoRoot, 'frontend', 'next.config.ts');
  const source = fs.readFileSync(sourcePath, 'utf8');
  return {
    source: normalize(path.relative(repoRoot, sourcePath)),
    redirects: parseConfigRedirectsSource(source),
  };
}

function pageRedirectCalls(repoRoot, source) {
  const content = fs.readFileSync(path.join(repoRoot, source), 'utf8');
  const calls = [];
  const matcher = /\bredirect\s*\(\s*(['"`])([^\r\n]*?)\1\s*\)/g;
  for (const match of content.matchAll(matcher)) calls.push(match[2]);
  return uniqueSorted(calls);
}

export function observedPageRedirectCalls(repoRoot, source) {
  return pageRedirectCalls(repoRoot, source);
}

function pageHasReturn(repoRoot, source) {
  const content = fs.readFileSync(path.join(repoRoot, source), 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/\/\/[^\r\n]*/g, '');
  return /\breturn\b/.test(content);
}

export function expectedRouting(repository, route, source) {
  const configured = repository.configRedirects.redirects.get(route);
  if (configured) return configured;
  const calls = pageRedirectCalls(repository.repoRoot, source);
  if (calls.length === 1 && !pageHasReturn(repository.repoRoot, source)) {
    return { kind: 'page-redirect', target: calls[0] };
  }
  return { kind: 'page' };
}

function pathCoveredByRemoval(frontendRelativeSource, removal) {
  const normalizedRemoval = removal.replaceAll('\\', '/').replace(/\/$/, '');
  return frontendRelativeSource === normalizedRemoval
    || frontendRelativeSource.startsWith(`${normalizedRemoval}/`);
}

export function directProjectionProfiles(source, profileManifest) {
  const frontendRelative = source.replace(/^frontend\//, '');
  const packNames = Object.keys(profileManifest.packs ?? {});
  return Object.entries(profileManifest.profiles ?? {})
    .filter(([, profile]) => {
      const includedPacks = new Set(profile.packs ?? []);
      return !packNames
        .filter((packName) => !includedPacks.has(packName))
        .flatMap((packName) => profileManifest.packs[packName]?.frontend?.removePaths ?? [])
        .some((removal) => pathCoveredByRemoval(frontendRelative, removal));
    })
    .map(([profileName]) => profileName)
    .sort();
}

export function inspectRouteRepository(repoRoot = ROOT) {
  const profilePath = path.join(repoRoot, 'config', 'reusable-base-profiles.json');
  return {
    repoRoot,
    pages: discoverPageRoutes(repoRoot),
    proxy: readProxyAccessRules(repoRoot),
    configRedirects: discoverConfigRedirects(repoRoot),
    profileManifest: JSON.parse(fs.readFileSync(profilePath, 'utf8')),
    profileSource: normalize(path.relative(repoRoot, profilePath)),
  };
}

export function buildUnreviewedBaselineManifest(
  repository,
  {
    asOf = '2026-08-21',
    reviewBy = '2026-10-31',
  } = {},
) {
  const review = {
    owner: 'product/UX + domain owner',
    reviewBy,
    reason: 'Capability role, live/partial state, actions, product label, journey, menu exposure, and positive profile ownership require domain evidence or owner review.',
  };
  const routes = repository.pages.map(({ route, source }) => {
    const sourceShellAccess = expectedShellAccess(route, repository.proxy);
    const routing = expectedRouting(repository, route, source);
    const shellAccess = expectedEffectiveShellAccess(route, routing, repository.proxy);
    const capabilities = knownCapabilitiesForRoute(route, source, asOf) ?? [{
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
      lastVerifiedAt: asOf,
      owner: 'product/UX + domain owner',
      evidence: [source],
    }];
    const entry = {
      route,
      source,
      sourceShellAccess,
      shellAccess,
      roles: ['UNVERIFIED'],
      surface: expectedSurface(route, shellAccess),
      status: aggregateCapabilityStatus(capabilities),
      dataSource: aggregateDataSource(capabilities),
      supportedActions: aggregateActions(capabilities),
      profileOwners: ['UNVERIFIED'],
      directProjectionProfiles: directProjectionProfiles(source, repository.profileManifest),
      journeys: [],
      visibleLabel: 'unverified',
      menuExposure: 'unverified',
      decisionSafe: capabilities.every(({ decisionSafe }) => decisionSafe === true),
      routing,
      observedPageRedirectCalls: pageRedirectCalls(repository.repoRoot, source),
      owner: 'product/UX + domain owner',
      capabilities,
      evidence: uniqueSorted([
        source,
        repository.proxy.source,
        repository.configRedirects.source,
        repository.profileSource,
      ]),
      unverifiedFields: [...REVIEWABLE_FIELDS]
        .filter((field) => !KNOWN_ROUTE_CAPABILITIES[route]
          || !['status', 'dataSource', 'supportedActions'].includes(field))
        .sort(),
      review: { ...review },
    };

    if (route === '/admin/workflow') {
      entry.profileOwners = ['demo'];
      entry.evidence = uniqueSorted([
        ...entry.evidence,
        'frontend/src/app/admin/workflow/WorkflowClient.tsx',
      ]);
      entry.unverifiedFields = entry.unverifiedFields
        .filter((field) => field !== 'profileOwners');
    }
    return entry;
  });

  return {
    schemaVersion: 1,
    asOf,
    authority: 'route-role-capability-truth-census',
    scope: 'frontend/src/app/**/page.{js,jsx,ts,tsx}',
    notes: [
      'shellAccess is a proxy UI-shell admission class, not a domain capability authorization claim.',
      'directProjectionProfiles is a direct removePaths observation, not positive semantic profile ownership and not a full transitive artifact proof.',
      'unverified values are bounded review exceptions and keep G1 gateReady=false.',
      'Capability evidence levels are E0 entry, E1 reachable code, E2 authoritative source/policy, E3 executable contract definition, E4 current UI-to-server roundtrip artifact, and E5 deployed provenance/owner confirmation.',
      'candidateStatus records a hypothesis only; it never upgrades the asserted status without current E4 evidence.',
    ],
    sources: {
      pages: 'frontend/src/app/**/page.{js,jsx,ts,tsx}',
      proxy: repository.proxy.source,
      redirects: repository.configRedirects.source,
      profiles: repository.profileSource,
    },
    menuSnapshot: {
      status: 'blocked-external',
      source: MENU_CENSUS_SOURCE,
      retryCommand: 'node scripts/menu-census.mjs --json',
      review: {
        owner: 'product/IA + DB operator',
        reviewBy,
        reason: 'The read-only structural census could not run because DB_HOST was not present. It only reads tb_menu_info; role-aware exposure needs separate live schema evidence.',
      },
    },
    externalAliases: [...repository.configRedirects.redirects.entries()]
      .filter(([source]) => !repository.pages.some(({ route }) => route === source))
      .map(([source, routing]) => ({
        source,
        routing,
        sourceShellAccess: expectedShellAccess(source, repository.proxy),
        shellAccess: expectedEffectiveShellAccess(source, routing, repository.proxy),
        evidence: [repository.configRedirects.source, repository.proxy.source].sort(),
      }))
      .sort((left, right) => left.source.localeCompare(right.source)),
    routes,
  };
}

function isNonemptyString(value) {
  return typeof value === 'string' && value.trim() !== '';
}

function validIsoDate(value) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value ?? '')) return false;
  const parsed = new Date(`${value}T00:00:00Z`);
  return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function validateReview(review, label, nowMs, errors) {
  if (!review || !isNonemptyString(review.owner) || !isNonemptyString(review.reason)) {
    errors.push(`${label}: unverified fields require review owner and reason`);
    return;
  }
  if (!validIsoDate(review.reviewBy)) {
    errors.push(`${label}: reviewBy must be a real YYYY-MM-DD date`);
    return;
  }
  const deadline = Date.parse(`${review.reviewBy}T23:59:59.999Z`);
  if (deadline < nowMs) errors.push(`${label}: review exception expired on ${review.reviewBy}`);
}

function unresolvedMarkers(entry) {
  const fields = [];
  if (entry.status === 'unverified') fields.push('status');
  if (entry.dataSource === 'unverified') fields.push('dataSource');
  if (entry.visibleLabel === 'unverified') fields.push('visibleLabel');
  if (entry.menuExposure === 'unverified') fields.push('menuExposure');
  if (entry.roles?.includes('UNVERIFIED')) fields.push('roles');
  if (entry.profileOwners?.includes('UNVERIFIED')) fields.push('profileOwners');
  return fields;
}

function validateMenuSnapshot(snapshot, nowMs, errors) {
  if (!snapshot || !['live', 'blocked-external'].includes(snapshot.status)) {
    errors.push('menuSnapshot: status must be live or blocked-external');
    return;
  }
  if (!isNonemptyString(snapshot.source) || !isNonemptyString(snapshot.retryCommand)) {
    errors.push('menuSnapshot: source and retryCommand are required');
  }
  if (snapshot.source !== MENU_CENSUS_SOURCE) {
    errors.push('menuSnapshot: source must describe the tb_menu_info-only structural scope and must not claim role-aware exposure');
  }
  if (snapshot.status === 'blocked-external') {
    validateReview(snapshot.review, 'menuSnapshot', nowMs, errors);
  } else if (!validIsoDate(snapshot.capturedAt)) {
    errors.push('menuSnapshot: live evidence requires capturedAt');
  }
}

export function validateRouteCapabilities(manifest, repository, nowMs = Date.now()) {
  const errors = [];
  const warnings = [];
  const entries = Array.isArray(manifest?.routes) ? manifest.routes : [];
  const pages = Array.isArray(repository?.pages) ? repository.pages : [];

  if (manifest?.schemaVersion !== 1) errors.push('manifest schemaVersion must be 1');
  if (!validIsoDate(manifest?.asOf)) errors.push('manifest asOf must be a real YYYY-MM-DD date');
  if (pages.length === 0) errors.push('route population is empty');
  if (!Array.isArray(repository?.proxy?.userAccessibleAdminPaths)
    || !Array.isArray(repository?.proxy?.adminOnlySubpaths)) {
    errors.push('proxy access arrays could not be parsed');
  }
  validateMenuSnapshot(manifest?.menuSnapshot, nowMs, errors);

  const expectedByRoute = new Map();
  for (const page of pages) {
    if (expectedByRoute.has(page.route)) errors.push(`filesystem route is duplicated: ${page.route}`);
    expectedByRoute.set(page.route, page);
  }

  const expectedRoutingBySource = new Map(
    pages.map((page) => [page.route, expectedRouting(repository, page.route, page.source)]),
  );
  for (const [source, routing] of repository.configRedirects.redirects.entries()) {
    if (!expectedRoutingBySource.has(source)) expectedRoutingBySource.set(source, routing);
  }
  for (const [source, routing] of expectedRoutingBySource.entries()) {
    if (routing.kind === 'page') continue;
    const visited = new Set([source]);
    let currentRouting = routing;
    while (currentRouting.kind !== 'page') {
      const target = normalizedRoutingTarget(currentRouting.target);
      if (visited.has(target)) {
        errors.push(`redirect cycle detected from ${source} through ${target}`);
        break;
      }
      visited.add(target);
      if (!expectedByRoute.has(target)) {
        errors.push(`redirect destination is not a filesystem route: ${source} -> ${target}`);
        break;
      }
      currentRouting = expectedRoutingBySource.get(target) ?? { kind: 'page' };
    }
  }

  const actualByRoute = new Map();
  for (const entry of entries) {
    const label = `route ${entry?.route ?? '(missing)'}`;
    if (!isNonemptyString(entry?.route) || !entry.route.startsWith('/')) {
      errors.push(`${label}: route must be an absolute application path`);
      continue;
    }
    if (actualByRoute.has(entry.route)) {
      errors.push(`manifest route is duplicated: ${entry.route}`);
      continue;
    }
    actualByRoute.set(entry.route, entry);

    const expectedPage = expectedByRoute.get(entry.route);
    if (!expectedPage) {
      errors.push(`${label}: no matching page.ts/page.tsx exists`);
      continue;
    }
    if (entry.source !== expectedPage.source) {
      errors.push(`${label}: source must be ${expectedPage.source}`);
    }

    const sourceShellAccess = expectedShellAccess(entry.route, repository.proxy);
    if (!KNOWN_SHELL_ACCESS.has(entry.sourceShellAccess) || entry.sourceShellAccess !== sourceShellAccess) {
      errors.push(`${label}: sourceShellAccess must match the source path proxy evidence (${sourceShellAccess})`);
    }
    const expectedRouteRouting = expectedRouting(repository, entry.route, entry.source);
    const shellAccess = expectedEffectiveShellAccess(entry.route, expectedRouteRouting, repository.proxy);
    if (!KNOWN_SHELL_ACCESS.has(entry.shellAccess) || entry.shellAccess !== shellAccess) {
      errors.push(`${label}: shellAccess must match effective redirect/proxy evidence (${shellAccess})`);
    }
    const surface = expectedSurface(entry.route, shellAccess);
    if (!KNOWN_SURFACES.has(entry.surface) || entry.surface !== surface) {
      errors.push(`${label}: surface must match structural access evidence (${surface})`);
    }

    if (!Array.isArray(entry.roles) || entry.roles.length === 0
      || entry.roles.some((role) => !KNOWN_ROLES.has(role))
      || new Set(entry.roles).size !== entry.roles.length) {
      errors.push(`${label}: roles must be a non-empty unique known-role array`);
    }
    if (entry.roles?.includes('UNVERIFIED') && entry.roles.length !== 1) {
      errors.push(`${label}: UNVERIFIED cannot be mixed with asserted capability roles`);
    }
    if (!KNOWN_STATUSES.has(entry.status)) errors.push(`${label}: invalid capability status`);
    if (!isNonemptyString(entry.dataSource)) errors.push(`${label}: dataSource is required`);
    if (!Array.isArray(entry.supportedActions)
      || entry.supportedActions.some((action) => !isNonemptyString(action))) {
      errors.push(`${label}: supportedActions must be a string array`);
    }
    if (!Array.isArray(entry.capabilities) || entry.capabilities.length === 0) {
      errors.push(`${label}: capabilities must be a non-empty array`);
    } else {
      const capabilityIds = new Set();
      for (const capability of entry.capabilities) {
        const capabilityLabel = `${label} capability ${capability?.id ?? '(missing)'}`;
        if (!isNonemptyString(capability?.id)) errors.push(`${capabilityLabel}: id is required`);
        else if (capabilityIds.has(capability.id)) errors.push(`${capabilityLabel}: duplicate capability id`);
        else capabilityIds.add(capability.id);
        if (!KNOWN_STATUSES.has(capability?.status)) errors.push(`${capabilityLabel}: invalid status`);
        if (capability?.candidateStatus !== undefined
          && (!KNOWN_STATUSES.has(capability.candidateStatus) || capability.candidateStatus === 'unverified')) {
          errors.push(`${capabilityLabel}: candidateStatus must be a concrete known status`);
        }
        if (capability?.candidateStatus === 'live' && capability?.status !== 'partial') {
          errors.push(`${capabilityLabel}: a live candidate must remain partial until current E4 evidence exists`);
        }
        if (!isNonemptyString(capability?.dataSource)) errors.push(`${capabilityLabel}: dataSource is required`);
        if (!Array.isArray(capability?.actions)
          || capability.actions.some((action) => !isNonemptyString(action))
          || new Set(capability.actions).size !== capability.actions.length) {
          errors.push(`${capabilityLabel}: actions must be a unique string array`);
        }
        if (!Array.isArray(capability?.unsupportedVisibleActions)
          || capability.unsupportedVisibleActions.some((action) => !isNonemptyString(action))
          || new Set(capability.unsupportedVisibleActions).size !== capability.unsupportedVisibleActions.length) {
          errors.push(`${capabilityLabel}: unsupportedVisibleActions must be a unique string array`);
        }
        if (!isNonemptyString(capability?.actorScope)) errors.push(`${capabilityLabel}: actorScope is required`);
        if (!isNonemptyString(capability?.visibleLabel)) errors.push(`${capabilityLabel}: visibleLabel is required`);
        if (typeof capability?.primaryTask !== 'boolean') errors.push(`${capabilityLabel}: primaryTask must be boolean`);
        if (!KNOWN_EVIDENCE_LEVELS.has(capability?.evidenceLevel)) {
          errors.push(`${capabilityLabel}: evidenceLevel must be E0..E5`);
        }
        if (!validIsoDate(capability?.lastVerifiedAt)) {
          errors.push(`${capabilityLabel}: lastVerifiedAt must be a real YYYY-MM-DD date`);
        }
        if (!isNonemptyString(capability?.owner)) errors.push(`${capabilityLabel}: owner is required`);
        if (typeof capability?.decisionSafe !== 'boolean') {
          errors.push(`${capabilityLabel}: decisionSafe must be boolean`);
        }
        if (!Array.isArray(capability?.evidence) || capability.evidence.length === 0) {
          errors.push(`${capabilityLabel}: evidence is required`);
        } else {
          for (const evidence of capability.evidence) {
            if (!isNonemptyString(evidence) || !isFile(path.join(repository.repoRoot, evidence))) {
              errors.push(`${capabilityLabel}: evidence path does not exist: ${evidence}`);
            }
          }
        }
        if (capability?.status === 'demo' && capability?.decisionSafe !== false) {
          errors.push(`${capabilityLabel}: demo capability cannot be operational-decision safe`);
        }
        if (capability?.status === 'unavailable' && capability.actions?.length > 0) {
          errors.push(`${capabilityLabel}: unavailable capability cannot claim supported actions`);
        }
        if (capability?.status === 'live') {
          if (!['E4', 'E5'].includes(capability.evidenceLevel)) {
            errors.push(`${capabilityLabel}: live requires current E4 or E5 evidence`);
          }
          if (capability.unsupportedVisibleActions?.length > 0
            || /(?:mock|hardcoded|canonical-empty|none)/i.test(capability.dataSource)) {
            errors.push(`${capabilityLabel}: live cannot contain mock data or unsupported visible actions`);
          }
        }
        if (capability?.decisionSafe === true && capability?.evidenceLevel !== 'E5') {
          errors.push(`${capabilityLabel}: decisionSafe requires E5 deployed provenance and owner confirmation`);
        }
      }
      if (entry.status !== aggregateCapabilityStatus(entry.capabilities)) {
        errors.push(`${label}: route status must aggregate capability-level statuses`);
      }
      if (entry.dataSource !== aggregateDataSource(entry.capabilities)) {
        errors.push(`${label}: route dataSource must aggregate capability-level sources`);
      }
      if (!exactArray(entry.supportedActions, aggregateActions(entry.capabilities))) {
        errors.push(`${label}: supportedActions must aggregate capability-level actions`);
      }
      const expectedDecisionSafety = entry.capabilities.every(({ decisionSafe }) => decisionSafe === true);
      if (entry.decisionSafe !== expectedDecisionSafety) {
        errors.push(`${label}: decisionSafe must aggregate capability-level safety`);
      }
    }
    if (!Array.isArray(entry.profileOwners) || entry.profileOwners.length === 0
      || entry.profileOwners.some((profile) => !KNOWN_PROFILES.has(profile))
      || new Set(entry.profileOwners).size !== entry.profileOwners.length) {
      errors.push(`${label}: profileOwners must be a non-empty unique known-profile array`);
    }
    if (entry.profileOwners?.includes('UNVERIFIED') && entry.profileOwners.length !== 1) {
      errors.push(`${label}: UNVERIFIED cannot be mixed with asserted profile owners`);
    }
    if (!Array.isArray(entry.directProjectionProfiles)
      || !exactArray(entry.directProjectionProfiles, directProjectionProfiles(entry.source, repository.profileManifest))) {
      errors.push(`${label}: directProjectionProfiles drifted from reusable-base removePaths`);
    }
    if (!Array.isArray(entry.journeys)
      || entry.journeys.some((journey) => !isNonemptyString(journey))) {
      errors.push(`${label}: journeys must be a string array`);
    }
    if (typeof entry.decisionSafe !== 'boolean') errors.push(`${label}: decisionSafe must be boolean`);
    if (!isNonemptyString(entry.owner)) errors.push(`${label}: owner is required`);
    if (!isNonemptyString(entry.visibleLabel)) errors.push(`${label}: visibleLabel is required`);
    if (!['visible', 'hidden', 'not-menued', 'unverified'].includes(entry.menuExposure)) {
      errors.push(`${label}: invalid menuExposure`);
    }

    if (JSON.stringify(entry.routing) !== JSON.stringify(expectedRouteRouting)) {
      errors.push(`${label}: routing drifted from next.config.ts`);
    }
    const expectedRedirectCalls = pageRedirectCalls(repository.repoRoot, entry.source);
    if (!exactArray(entry.observedPageRedirectCalls, expectedRedirectCalls)) {
      errors.push(`${label}: observedPageRedirectCalls drifted from page source`);
    }
    if (expectedRouteRouting.kind === 'config-redirect'
      && expectedRedirectCalls.length > 0
      && !expectedRedirectCalls.includes(expectedRouteRouting.target)) {
      errors.push(`${label}: redirect sources disagree (next.config=${expectedRouteRouting.target}, page=${expectedRedirectCalls.join(',')})`);
    }

    if (!Array.isArray(entry.evidence) || entry.evidence.length === 0
      || entry.evidence.some((source) => !isNonemptyString(source))) {
      errors.push(`${label}: evidence must be a non-empty path array`);
    } else {
      for (const source of entry.evidence) {
        if (!isFile(path.join(repository.repoRoot, source))) {
          errors.push(`${label}: evidence path does not exist: ${source}`);
        }
      }
      if (!entry.evidence.includes(entry.source)) errors.push(`${label}: page source must be included in evidence`);
    }

    const declaredUnverified = Array.isArray(entry.unverifiedFields)
      ? uniqueSorted(entry.unverifiedFields)
      : [];
    if (declaredUnverified.some((field) => !REVIEWABLE_FIELDS.has(field))) {
      errors.push(`${label}: unverifiedFields contains an unsupported field`);
    }
    const markers = uniqueSorted(unresolvedMarkers(entry));
    if (markers.some((field) => !declaredUnverified.includes(field))) {
      errors.push(`${label}: unresolved markers must be declared in unverifiedFields`);
    }
    if (declaredUnverified.length > 0) validateReview(entry.review, label, nowMs, errors);
    else if (entry.review !== undefined) warnings.push(`${label}: review metadata exists without unverifiedFields`);

    if (entry.capabilities?.some(({ status }) => status === 'demo')
      && entry.profileOwners.some((profile) => ['core', 'collaboration'].includes(profile))) {
      errors.push(`${label}: demo capability leaks into a non-demo profile owner`);
    }
    if (entry.status === 'demo' && entry.decisionSafe !== false) {
      errors.push(`${label}: demo capability cannot be operational-decision safe`);
    }
  }

  for (const route of expectedByRoute.keys()) {
    if (!actualByRoute.has(route)) errors.push(`manifest is missing filesystem route: ${route}`);
  }

  const expectedExternalAliases = [...repository.configRedirects.redirects.entries()]
    .filter(([source]) => !expectedByRoute.has(source))
    .map(([source, routing]) => ({
      source,
      routing,
      sourceShellAccess: expectedShellAccess(source, repository.proxy),
      shellAccess: expectedEffectiveShellAccess(source, routing, repository.proxy),
      evidence: [repository.configRedirects.source, repository.proxy.source].sort(),
    }))
    .sort((left, right) => left.source.localeCompare(right.source));
  if (JSON.stringify(manifest?.externalAliases) !== JSON.stringify(expectedExternalAliases)) {
    errors.push('externalAliases drifted from page-independent next.config.ts redirects');
  }

  const workflow = actualByRoute.get('/admin/workflow');
  if (!workflow
    || workflow.status !== 'partial'
    || workflow.dataSource !== 'mixed'
    || !exactArray(workflow.profileOwners, ['demo'])
    || workflow.decisionSafe !== false
    || !workflow.capabilities?.some(({ id, status }) => id === 'workflow.canvas' && status === 'demo')
    || !workflow.capabilities?.some(({ id, status }) => id === 'workflow.mutations' && status === 'unavailable')) {
    errors.push('/admin/workflow must preserve its demo canvas and unavailable mutations as demo-profile-only capabilities');
  }

  const statusCounts = Object.fromEntries(
    [...KNOWN_STATUSES].map((status) => [status, entries.filter((entry) => entry.status === status).length]),
  );
  const unresolvedRoutes = entries.filter((entry) => (entry.unverifiedFields ?? []).length > 0).length;
  const menuReady = manifest?.menuSnapshot?.status === 'live';
  return {
    errors: uniqueSorted(errors),
    warnings: uniqueSorted(warnings),
    summary: {
      filesystemRoutes: pages.length,
      manifestRoutes: entries.length,
      statusCounts,
      unresolvedRoutes,
      sourceShellAccessCounts: Object.fromEntries(
        [...KNOWN_SHELL_ACCESS].map((access) => [access, entries.filter((entry) => entry.sourceShellAccess === access).length]),
      ),
      effectiveShellAccessCounts: Object.fromEntries(
        [...KNOWN_SHELL_ACCESS].map((access) => [access, entries.filter((entry) => entry.shellAccess === access).length]),
      ),
      effectiveAliases: entries.filter((entry) => entry.routing?.kind !== 'page').length,
      externalAliases: expectedExternalAliases.length,
      menuEvidence: manifest?.menuSnapshot?.status ?? 'missing',
      gateReady: errors.length === 0 && unresolvedRoutes === 0 && menuReady,
    },
  };
}

export function analyzeRouteCapabilities(repoRoot = ROOT, manifestPath = MANIFEST_PATH, nowMs = Date.now()) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const repository = inspectRouteRepository(repoRoot);
  return { manifest, repository, result: validateRouteCapabilities(manifest, repository, nowMs) };
}

function printReport(result) {
  console.log('\n=== UI Route Capability Truth Census ===');
  console.log(`filesystem routes : ${result.summary.filesystemRoutes}`);
  console.log(`manifest routes   : ${result.summary.manifestRoutes}`);
  console.log(`status counts     : ${JSON.stringify(result.summary.statusCounts)}`);
  console.log(`unresolved routes : ${result.summary.unresolvedRoutes}`);
  console.log(`menu evidence     : ${result.summary.menuEvidence}`);
  console.log(`G1 gate ready     : ${result.summary.gateReady ? 'yes' : 'no'}`);
  for (const warning of result.warnings) console.warn(`WARN: ${warning}`);
  for (const error of result.errors) console.error(`ERROR: ${error}`);
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === path.resolve(SCRIPT_PATH);
if (isMain) {
  const analysis = analyzeRouteCapabilities();
  if (process.argv.includes('--json')) console.log(JSON.stringify(analysis.result, null, 2));
  else printReport(analysis.result);
  const requireReviewed = process.argv.includes('--require-reviewed');
  if (analysis.result.errors.length > 0 || (requireReviewed && !analysis.result.summary.gateReady)) {
    process.exitCode = 1;
  }
}
