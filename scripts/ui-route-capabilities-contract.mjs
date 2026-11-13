#!/usr/bin/env node

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { MODULES_DIRECTORY, PRESETS_FILE, detectGeneratedComposition } from './composer-modules.mjs';
import { compositionProfiles, presetIds } from './composition-profiles.mjs';
import { parseModuleReferences, tokenizeDependencies } from './frontend-module-graph.mjs';
import { candidatePaths, repositoryFileLookup } from './frontend-module-resolver.mjs';
import { loadProjectComposerCatalog } from './project-composer-catalog.mjs';
import { COMPOSER_SELECTION_PATH, resolveProjectRecipe } from './project-composer-recipe.mjs';
import { slotConsumerFiles, slotPathKind } from './slot-registry.mjs';

const SCRIPT_PATH = fileURLToPath(import.meta.url);
const ROOT = path.resolve(path.dirname(SCRIPT_PATH), '..');
const MANIFEST_PATH = path.join(ROOT, 'config', 'ui-route-capabilities.json');

const KNOWN_ROLES = new Set(['ANONYMOUS', 'AUTHENTICATED', 'USER', 'ADMIN', 'SYSTEM', 'UNVERIFIED']);
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
  '/admin/notifications': [
    {
      id: 'notifications.stream', status: 'partial', candidateStatus: 'live', dataSource: 'notifications-api+websocket', actions: ['local-search', 'tab-filter'],
      // [2026-11-08] 진입 권한 NOTI_READ 의 기본 그룹에 ROLE_USER 가 있다 — 기본 설치에서 인증 사용자가 쓴다.
      unsupportedVisibleActions: ['refresh', 'row-options'], actorScope: 'AUTHENTICATED', visibleLabel: '알림 스트림', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/admin/notifications/NotificationsClient.tsx', 'frontend/src/app/components/ui/smart-notification-hub.tsx', 'frontend/src/lib/hooks/use-notifications.ts', 'frontend/e2e/journeys/notifications.spec.ts'],
    },
    {
      // [2026-09-06 DEC-OPS-042] 관리자 발송이 실기능이 됐다 — POST /api/v1/admin/notifications/dispatch(ADMIN/SYSTEM).
      //   live 는 E4(현재 UI→서버 왕복 산출물)가 있어야 하므로 partial + candidateStatus live 로 둔다(결재 허브와 같은 규칙).
      id: 'notifications.dispatch', status: 'partial', candidateStatus: 'live', dataSource: 'admin-notifications-dispatch-api', actions: ['send'],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '알림 보내기', primaryTask: false,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/admin/notifications/NotificationDispatchDialog.tsx', 'frontend/src/app/admin/notifications/__tests__/NotificationDispatchDialog.test.tsx', 'frontend/src/services/foundation/system/NotificationAdminService.ts', 'api-server/src/main/java/nuri/api/controller/business/notification/NotificationAdminApiController.java', 'api-server/src/test/java/nuri/api/controller/business/notification/NotificationAdminApiControllerTest.java'],
    },
    // [2026-11-08] notifications.health-metrics('98.2% / ACTIVE')는 화면에 없다(코드 검색 0건) — 원장과 함께 걷었다.
    // [2026-09-23] notifications.dispatch-preview 는 DEC-OPS-038(2026-09-06)이 데모 발송 뷰와 함께
    //   걷었고 원장에서도 사라졌는데 이 동결 목록에만 남아 있었다. 종전에는 동결과 커밋본을
    //   대조하지 않아 그 드리프트가 보이지 않았다 — 아래 프런트 라우트 검증이 이제 양방향으로 본다.
  ],
  '/approvals': [
    {
      // [2026-09-05] 기안 다이얼로그(POST /approvals)·처리한 결재 탭(GET /approvals/processed)·새로고침이
      // 실제 API 로 배선됐다. 종전 unsupported 였던 archive-filter 는 '내가 처리한 결재' 탭이 대신한다.
      // [2026-10-13 DEC-OPS-302] 'server-search' 를 지원하지 않는다는 판정은 DEC-OPS-165(2026-09-26)가 제목·요청일 기간·문서
      //   상태 조건을 서버 조회로 넣은 뒤에도 남아 있었다 — 그 조건은 search·filter 로 옮긴다. 같은 화면의
      //   'approvals.visualization-metrics'(워크플로우·무결성 지표, demo)도 걷는다 — 결재 허브에 지표 화면이 없어 아무것도 가리키지 않았다.
      id: 'approvals.pending-history', status: 'partial', candidateStatus: 'live', dataSource: 'approvals-api', actions: ['list', 'select-detail', 'confirm', 'reject', 'create', 'refresh', 'search', 'filter'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '결재 기안·목록·승인·반려', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/approvals/ApprovalHubClient.tsx', 'frontend/src/app/approvals/ApprovalDraftDialog.tsx', 'frontend/src/app/approvals/__tests__/ApprovalHubClient.actions.test.tsx', 'frontend/src/services/business/user/approval/ApprovalUserService.ts', 'frontend/e2e/journeys/approvals.spec.ts'],
    },
    {
      // [V2_151, DEC-OPS-416] 결재 첨부(기안 때 올리고 결재선·참조자·유효 대리결재자가 내려받는다)와 부재 대리결재(차례인 결재자가 부재
      //   기간에 맡긴 사람이 대신 승인·반려). 대표 결재 시험(approvals.spec.ts — 벤더 인증 증거 입력)과 따로 왕복 시험을 둔다.
      id: 'approvals.attachments-substitute', status: 'live', dataSource: 'approvals-api+files-api',
      actions: ['attach-file', 'download-attachment', 'substitute-confirm'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '결재 첨부 · 부재 대리결재', primaryTask: false,
      evidenceLevel: 'E4',
      roundtrips: [{
        spec: 'frontend/e2e/journeys/approval-attachments.spec.ts',
        test: '첨부를 붙여 올린 결재를 부재 중 대리결재자가 첨부를 내려받고 대신 승인한다',
        actions: ['attach-file', 'download-attachment', 'substitute-confirm'],
      }],
      evidence: ['frontend/e2e/journeys/approval-attachments.spec.ts', 'business-app/src/test/java/nuri/business/service/informalsanction/ApprovalAttachmentAccessTest.java', 'business-app/src/test/java/nuri/business/service/informalsanction/ApprovalSubstitutionServiceTest.java', 'frontend/src/app/approvals/ApprovalAttachmentList.tsx', 'frontend/src/app/approvals/ApprovalDocumentSections.tsx', 'frontend/src/app/approvals/ApprovalDraftDialog.tsx', 'frontend/src/app/approvals/__tests__/ApprovalAttachmentList.test.tsx'],
    },
  ],
  '/approvals/draft': [
    {
      // [2026-10-13 DEC-OPS-302] 2026-09-16(434c2111f) 부터 이 화면은 결재함과 같은 기안 창(ApprovalDraftDialog)을 연다 — 기안
      //   권한이 있으면 들어오자마자 열리고 상신하면 결재함으로 간다. 목업(demo)·비활성 상신(unavailable) 판정이 그 뒤에도 남아,
      //   인증 시작 구성 '공통 기반 + 결재' 가 시연 기능을 싣는다고 말했다. live 는 E4 가 있어야 하므로 결재 허브와 같게
      //   partial + candidateStatus live 다.
      id: 'draft.compose', status: 'partial', candidateStatus: 'live', dataSource: 'approvals-api', actions: ['create', 'back'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '새 결재 기안', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['frontend/src/app/approvals/draft/ApprovalDraftHubClient.tsx', 'frontend/src/app/approvals/ApprovalDraftDialog.tsx', 'frontend/src/app/approvals/__tests__/ApprovalDraftHubClient.test.tsx', 'frontend/src/app/approvals/__tests__/ApprovalDraftDialog.test.tsx', 'frontend/src/services/business/user/approval/ApprovalUserService.ts'],
    },
  ],
  '/admin/survey/polls/manage': [
    {
      id: 'poll-governance', status: 'unavailable', dataSource: 'none', actions: [],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '여론조사 관리는 이 화면에서 지원하지 않습니다.', primaryTask: true,
      evidenceLevel: 'E1', evidence: ['frontend/src/app/admin/survey/polls/manage/page.tsx'],
    },
  ],
  '/admin/user/absences': [
    {
      // [2026-09-23] DEC-OPS-049 가 이 기능을 배선했는데 원장은 2026-08-21 판정(미연동)에 머물러 있었다.
      //   live 는 E4(UI→서버 왕복 산출물)가 있어야 하므로 알림 발송과 같게 partial + candidateStatus live 로 둔다.
      id: 'absence-management', status: 'partial', candidateStatus: 'live', dataSource: 'admin-user-absences-api',
      // [V2_151] 부재 기간과 대리결재자 지정(대리결재 지정 창)을 더한다 — 지정 규칙은 서버가 판정한다(UserAbsenceServiceImpl).
      actions: ['mark-absent', 'mark-returned', 'assign-delegate'],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '부재 상태 관리', primaryTask: true,
      evidenceLevel: 'E3', evidence: ['business-core/src/main/java/nuri/business/service/system/user/impl/UserAbsenceServiceImpl.java', 'frontend/src/app/admin/user/UserOrgHubClient.tsx', 'frontend/src/app/admin/user/__tests__/UserOrgHubClient.absence.test.tsx', 'frontend/src/services/foundation/system/UserAbsenceAdminService.ts', 'frontend/src/app/admin/user/AbsenceDelegationDialog.tsx', 'frontend/src/app/admin/user/__tests__/AbsenceDelegationDialog.test.tsx'],
    },
    {
      id: 'absence.user-list-proxy', status: 'partial', dataSource: 'admin-users-api', actions: ['view-users', 'search-users'],
      unsupportedVisibleActions: [], actorScope: 'ADMIN|SYSTEM', visibleLabel: '전체 사용자 목록(부재자 아님)', primaryTask: false,
      evidenceLevel: 'E2', evidence: ['frontend/src/app/admin/user/absences/page.tsx', 'frontend/src/app/admin/user/UserOrgHubClient.tsx'],
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
      id: 'search.users', status: 'live', dataSource: 'authenticated-minimal-user-search-api', actions: ['keyword-search'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '임직원 검색', primaryTask: true,
      evidenceLevel: 'E4',
      roundtrips: [{
        spec: 'frontend/e2e/journeys/global-search.spec.ts',
        test: '통합 검색에서 게시글·임직원·권한 범위 메뉴 바로가기를 조회하고 이동한다',
        actions: ['keyword-search'],
      }],
      evidence: [
        'api-server/src/main/java/nuri/api/controller/UserApiController.java',
        'frontend/e2e/journeys/global-search.spec.ts',
        'frontend/src/app/search/SearchClient.tsx',
        'frontend/src/app/search/__tests__/SearchClient.contract.test.tsx',
        'frontend/src/services/business/user/UserSearchService.ts',
      ],
    },
    {
      id: 'search.menu-shortcuts', status: 'live', dataSource: 'head-menus-api', actions: ['navigate'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '메뉴 바로가기', primaryTask: false,
      evidenceLevel: 'E4',
      roundtrips: [{
        spec: 'frontend/e2e/journeys/global-search.spec.ts',
        test: '통합 검색에서 게시글·임직원·권한 범위 메뉴 바로가기를 조회하고 이동한다',
        actions: ['navigate'],
      }],
      evidence: [
        'frontend/e2e/journeys/global-search.spec.ts',
        'frontend/src/app/search/SearchClient.tsx',
        'frontend/src/services/business/user/MenuService.ts',
      ],
    },
    {
      // [2026-11-11] 게시글 탭은 게시판 기능 표지 안이라 게시판 없는 구성(core·survey·approval)에서는 BoardUserService 가 빠진다.
      //   생성물 투영에서는 E4 및 빠진 증거가 있는 동결 화면이 기관 검토 행(route-capability-review)으로 되돌아간다.
      id: 'search.articles', status: 'live', dataSource: 'boards-search-api', actions: ['keyword-search', 'navigate'],
      unsupportedVisibleActions: [], actorScope: 'AUTHENTICATED', visibleLabel: '게시글 검색', primaryTask: false,
      evidenceLevel: 'E4',
      roundtrips: [{
        spec: 'frontend/e2e/journeys/global-search.spec.ts',
        test: '통합 검색에서 게시글·임직원·권한 범위 메뉴 바로가기를 조회하고 이동한다',
        actions: ['keyword-search', 'navigate'],
      }],
      evidence: [
        'api-server/src/main/java/nuri/api/controller/business/board/BoardApiController.java',
        'frontend/e2e/journeys/global-search.spec.ts',
        'frontend/src/app/search/SearchClient.tsx',
        'frontend/src/services/business/user/board/BoardUserService.ts',
      ],
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

/*
 * [2026-11-09] E4 를 기계로 확인한다. 종전에는 'E4' 라고 적기만 하면 됐고 무엇이 왕복 산출물인지 아무것도 보지 않았다.
 *
 * E4 는 기능의 roundtrips 가 가리키는 브라우저 업무 흐름 시험(frontend/e2e/journeys, full-suite 프로젝트)이 그 기능의 동작을
 * 모두 덮는다는 뜻이다. 시험은 네트워크를 가로채지 않아야 하고(실제 서버 왕복 — spec 이 불러오는 frontend/e2e 의 fixture·helper
 * 까지 본다), 그 파일에 실제 test('<제목>', …) 호출이 정확히 한 번 있어야 한다(토큰으로 센다 — 주석 처리한 시험, 문자열 속 글자,
 * test.skip·test.describe 는 세지 않는다). 'current' 는 required CI 가 E2E 에 닿는 변경이 main 에 들어올 때마다 업무 흐름 전체를
 * 돌리고 재시도 통과도 실패로 치는 것으로 성립한다 — E2E 선택 규칙(ADR-0023)이 E2E 와 무관하다고 본 변경에서는 직전 전체 실행이
 * 증거로 남는다. 시험이 그 동작을 실제로 하는지는 사람이 검토해 roundtrips 에 적는다.
 * 시험 파일은 고치지 않고 가리키기만 한다 — 일부 업무 흐름 시험은 DB 벤더 인증 증거의 입력이다.
 */
const EVIDENCE_ORDER = ['E0', 'E1', 'E2', 'E3', 'E4', 'E5'];
const JOURNEY_SPEC_PREFIX = 'frontend/e2e/journeys/';
const E2E_SOURCE_PREFIX = 'frontend/e2e/';
// Playwright 의 네트워크 가로채기 — 어떤 객체에서든 이 이름의 멤버 호출이면 센다(page·context·browserContext·route 인자 모두).
const NETWORK_STUB_MEMBERS = new Set(['route', 'routeFromHAR', 'routeWebSocket', 'fulfill']);
// [2026-11-09] 리다이렉트 별칭은 의미가 목적지를 따른다(DEC-OPS-404) — 상태·출처·동작·이름을 목적지 화면 행에서 가져온다.
export const REDIRECT_CAPABILITY_ID = 'redirect-destination';
const REDIRECT_DERIVED_FIELDS = ['status', 'dataSource', 'supportedActions', 'visibleLabel'];
const UNREADABLE_SOURCE = /^UNTERMINATED_/;

/*
 * [2026-11-10 Codex 32차] 판정은 import 해석기와 같은 토큰 분석기(frontend-module-graph)로 한다 — 주석은 토큰이 되지 않고, 문자열·
 * 템플릿·정규식은 하나의 토큰이다. TypeScript 를 쓰지 않는 것은 이 모듈이 frontend 를 설치하지 않은 곳에서도 적재되는 생성기 폐포에
 * 있기 때문이다(frontend-reachability-census 의 적재 경계 계약).
 */
function sourceTokens(text, fileName) {
  const { tokens, issues } = tokenizeDependencies(text, fileName);
  return { tokens, readable: !issues.some(({ code }) => UNREADABLE_SOURCE.test(code)) };
}

/**
 * spec 의 실제 test('<제목>', …) 호출을 제목별로 센다 — 앞이 `.` 이 아닌 식별자 `test` 바로 뒤 `(`·문자열(또는 치환 없는 템플릿)·`,`.
 * test.skip·test.fixme·test.describe 와 주석·문자열 속 글자는 세지 않는다. 읽을 수 없는 소스(닫히지 않은 주석·문자열)는 null 이다.
 */
export function journeyTestDeclarations(text, fileName) {
  const { tokens, readable } = sourceTokens(text, fileName);
  if (!readable) return null;
  const counts = new Map();
  for (let index = 0; index < tokens.length; index += 1) {
    const [callee, open, title, comma] = tokens.slice(index, index + 4);
    if (callee.type !== 'identifier' || callee.value !== 'test' || tokens[index - 1]?.value === '.') continue;
    if (open?.value !== '(' || comma?.value !== ',') continue;
    if (title?.type !== 'string' && !(title?.type === 'template' && !title.interpolated)) continue;
    counts.set(title.value, (counts.get(title.value) ?? 0) + 1);
  }
  return counts;
}

function stubsNetwork(tokens) {
  return tokens.some((token, index) => token.value === '.' && tokens[index + 1]?.type === 'identifier'
    && NETWORK_STUB_MEMBERS.has(tokens[index + 1].value) && tokens[index + 2]?.value === '(');
}

/**
 * spec 과 그것이 불러오는 frontend/e2e 안의 모듈(fixture·helper·page object, 상대 경로 import 를 따라간다) 가운데 네트워크를
 * 가로채는 파일. 주석은 보지 않는다. 소스나 import 를 해석하지 못하면 가로채지 않는다고 말할 수 없으므로 그 파일을 결과에 넣는다.
 */
export function journeyNetworkStubSources(repoRoot, spec) {
  const seen = new Set([spec]);
  const queue = [spec];
  const stubbed = [];
  while (queue.length > 0) {
    const file = queue.shift();
    const absolute = path.join(repoRoot, file);
    if (!isFile(absolute)) continue;
    const text = fs.readFileSync(absolute, 'utf8');
    const { tokens, readable } = sourceTokens(text, file);
    if (!readable) {
      stubbed.push(`${file} (source could not be read)`);
      continue;
    }
    if (stubsNetwork(tokens)) stubbed.push(file);
    let references;
    try {
      ({ references } = parseModuleReferences(text, file));
    } catch {
      stubbed.push(`${file} (imports could not be parsed)`);
      continue;
    }
    for (const { specifier, typeOnly } of references) {
      if (typeOnly || !(specifier.startsWith('./') || specifier.startsWith('../'))) continue;
      const target = candidatePaths(path.resolve(path.dirname(absolute), specifier)).find((candidate) => isFile(candidate));
      if (!target) continue;
      const relative = normalize(path.relative(repoRoot, target));
      if (!relative.startsWith(E2E_SOURCE_PREFIX) || seen.has(relative)) continue;
      seen.add(relative);
      queue.push(relative);
    }
  }
  return stubbed.sort();
}

function lowestEvidenceLevel(capabilities) {
  const levels = (capabilities ?? []).map(({ evidenceLevel }) => EVIDENCE_ORDER.indexOf(evidenceLevel));
  return levels.length > 0 && levels.every((level) => level >= 0) ? EVIDENCE_ORDER[Math.min(...levels)] : 'E0';
}

function scopeUnion(capabilities) {
  return uniqueSorted((capabilities ?? []).flatMap(({ actorScope }) => String(actorScope ?? '').split('|')).filter(Boolean)).join('|');
}

/** 별칭의 기능 한 개를 목적지 화면 행에서 만든다. 날짜·소유자·증거 경로는 호출자가 정한다. */
export function redirectDestinationCapability(destination, { lastVerifiedAt, owner, evidence }) {
  return {
    id: REDIRECT_CAPABILITY_ID,
    status: destination.status,
    dataSource: destination.dataSource,
    actions: uniqueSorted(destination.supportedActions ?? []),
    unsupportedVisibleActions: [],
    actorScope: scopeUnion(destination.capabilities),
    visibleLabel: destination.visibleLabel,
    primaryTask: false,
    decisionSafe: false,
    evidenceLevel: lowestEvidenceLevel(destination.capabilities),
    lastVerifiedAt,
    owner,
    evidence: uniqueSorted(evidence),
  };
}

/** spec 하나를 한 번만 읽고 판정한다 — 없으면 null. */
function inspectJourneySpec(repoRoot, spec, cache) {
  if (!cache.has(spec)) {
    const target = path.join(repoRoot, spec);
    cache.set(spec, isFile(target) ? {
      declarations: journeyTestDeclarations(fs.readFileSync(target, 'utf8'), spec) ?? new Map(),
      stubbedBy: journeyNetworkStubSources(repoRoot, spec),
    } : null);
  }
  return cache.get(spec);
}

/** roundtrips 를 검사하고 덮은 동작을 돌려준다. */
function validateRoundtrips(capability, capabilityLabel, repoRoot, specCache, errors) {
  if (capability?.roundtrips === undefined) return [];
  if (!Array.isArray(capability.roundtrips) || capability.roundtrips.length === 0) {
    errors.push(`${capabilityLabel}: roundtrips must be a non-empty array when present`);
    return [];
  }
  const covered = [];
  const declared = new Set();
  for (const roundtrip of capability.roundtrips) {
    const spec = roundtrip?.spec;
    const title = roundtrip?.test;
    const key = `${spec}\0${title}`;
    if (declared.has(key)) errors.push(`${capabilityLabel}: roundtrip is listed twice: ${spec} / ${title}`);
    declared.add(key);
    if (!isNonemptyString(spec) || !spec.startsWith(JOURNEY_SPEC_PREFIX) || !spec.endsWith('.spec.ts')
      || spec.includes('..') || spec.includes('\\')) {
      errors.push(`${capabilityLabel}: roundtrip spec must be a browser journey under ${JOURNEY_SPEC_PREFIX}: ${spec}`);
      continue;
    }
    const inspection = inspectJourneySpec(repoRoot, spec, specCache);
    if (inspection === null) {
      errors.push(`${capabilityLabel}: roundtrip spec does not exist: ${spec}`);
      continue;
    }
    if (inspection.stubbedBy.length > 0) {
      errors.push(`${capabilityLabel}: roundtrip spec stubs the network, so it is not a server roundtrip: ${spec} (${inspection.stubbedBy.join(', ')})`);
    }
    if (!isNonemptyString(title) || title.includes('${')) {
      errors.push(`${capabilityLabel}: roundtrip test must be a literal test title: ${spec}`);
    } else if (inspection.declarations.get(title) !== 1) {
      errors.push(`${capabilityLabel}: roundtrip test must be declared exactly once as test('<title>', ...) in ${spec}: ${title}`);
    }
    if (!Array.isArray(roundtrip?.actions) || roundtrip.actions.length === 0
      || new Set(roundtrip.actions).size !== roundtrip.actions.length
      || roundtrip.actions.some((action) => !capability.actions?.includes(action))) {
      errors.push(`${capabilityLabel}: roundtrip actions must be a non-empty unique subset of the capability actions: ${spec} / ${title}`);
    } else {
      covered.push(...roundtrip.actions);
    }
    if (!capability.evidence?.includes(spec)) {
      errors.push(`${capabilityLabel}: roundtrip spec must be listed in evidence: ${spec}`);
    }
  }
  return uniqueSorted(covered);
}

function aggregateActions(capabilities) {
  return uniqueSorted((capabilities ?? []).flatMap(({ actions }) => actions ?? []));
}

function knownCapabilitiesForRoute(route, source, asOf) {
  const definitions = KNOWN_ROUTE_CAPABILITIES[route];
  if (!definitions) return null;
  return definitions.map((definition) => ({
    ...definition,
    ...(definition.roundtrips ? { roundtrips: structuredClone(definition.roundtrips) } : {}),
    actions: uniqueSorted(definition.actions ?? []),
    unsupportedVisibleActions: uniqueSorted(definition.unsupportedVisibleActions ?? []),
    decisionSafe: false,
    lastVerifiedAt: asOf,
    owner: 'product/UX + domain owner',
    evidence: uniqueSorted([source, ...(definition.evidence ?? [])]),
  }));
}

function isProjectedCapabilityReset(entry) {
  if (entry.capabilities?.length !== 1) return false;
  const [capability] = entry.capabilities;
  return capability?.id === 'route-capability-review'
    && capability?.status === 'unverified'
    && capability?.candidateStatus === undefined
    && capability?.dataSource === 'unverified'
    && capability?.actorScope === 'UNVERIFIED'
    && capability?.visibleLabel === 'unverified'
    && capability?.primaryTask === true
    && capability?.decisionSafe === false
    && capability?.evidenceLevel === 'E0'
    && exactArray(capability?.actions ?? [], [])
    && exactArray(capability?.unsupportedVisibleActions ?? [], [])
    && ['status', 'dataSource', 'supportedActions'].every((field) => entry.unverifiedFields?.includes(field));
}

function frozenCapabilityRequiresProjectionReset(frozen, repository) {
  return repository?.profileProjections?.projection === true
    && frozen.some((definition) => ['E4', 'E5'].includes(definition.evidenceLevel)
      || (definition.evidence ?? []).some((file) => !isFile(path.join(repository.repoRoot, file))));
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

// Root operational contracts run before frontend dependencies are installed.
// Keep this small source-binding check dependency-free; quoted examples and comments
// must not count as executable evidence. Proxy runtime tests own actual HTTP behavior.
const literalToken = (value) => `__literal_${Buffer.from(value).toString('hex')}__`;
function bindingCode(source) {
  return source.replace(/"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/[^\r\n]*|\/\*[\s\S]*?\*\//g, (part) => {
    if (part.startsWith('//') || part.startsWith('/*')) return '';
    if (part.startsWith('`')) return '__template__';
    return literalToken(part.slice(1, -1));
  }).replace(/\s+/g, '');
}

export function validatePageAuthorizationBinding(proxySource, helperSource) {
  const proxy = bindingCode(proxySource);
  const helper = bindingCode(helperSource);
  const errors = [];
  if (!proxy.includes(`import{canEnterRegisteredPage,loadPageAuthorization,requiresRegisteredPermission}from${literalToken('@/lib/auth/page-authorization')};`)) {
    errors.push('proxy must import the registered page authorization implementation');
  }
  // [2026-11-08] /admin 전체와, /admin 밖이라도 기능권한이 등록된 화면(설문 응답 관리)을 같은 분기로 막는다.
  const guardedBranch = `constnormalizedPath=pathname.toLowerCase();if(matchesPrefix(normalizedPath,${literalToken('/admin')})||requiresRegisteredPermission(pathname)){`
    + 'constauthorization=accessToken?awaitloadPageAuthorization(accessToken,userSubject):null;'
    + 'if(!authorization||!canEnterRegisteredPage(pathname,authorization)){'
    + `constfallbackUrl=newURL(${literalToken('/')},request.url);`
    + `fallbackUrl.searchParams.set(${literalToken('auth_error')},${literalToken('unauthorized')});`
    + 'constdenied=withNonce(NextResponse.redirect(fallbackUrl));'
    + `denied.headers.set(${literalToken('x-mw-auth')},__template__);returndenied;}}`;
  if (!proxy.includes(guardedBranch)) {
    errors.push('proxy must apply current authorization and the original pathname to every admin page before returning permission denial');
  }
  if (!helper.includes(`import{PAGE_PERMISSIONS,PAGE_PERMISSION_MODES}from${literalToken('@/types/generated-permissions')};`)
    || !helper.includes('constexact=PAGE_PERMISSIONS[normalizedPath];')
    || !helper.includes('if(!entry)returnfalse;constrequired=entry[1];'
      + `if(PAGE_PERMISSION_MODES[entry[0]]===${literalToken('ALL')})returnrequired.length>0&&required.every(permission=>canPermission(subject,permission));`
      + 'returnrequired.length===0||canAnyPermission(subject,required);')) {
    errors.push('page helper must consume generated PAGE_PERMISSIONS, prefer exact routes, and deny unregistered pages');
  }
  // 게이트 편입 판정 — 권한이 등록된 경로 모양과 대소문자를 가리지 않고 맞추며, 권한이 빈 배열인 화면은 넣지 않는다.
  if (!helper.includes('exportfunctionrequiresRegisteredPermission(pathname:string):boolean{'
      + `constnormalizedPath=pathname.replace(/\\/$/,${literalToken('')});constregistered=PAGE_PERMISSIONS[normalizedPath];if(registered)returnregistered.length>0;`
      + `constsegments=normalizedPath.toLowerCase().split(${literalToken('/')});`
      + 'returnObject.entries(PAGE_PERMISSIONS).some(([route,required])=>{if(required.length===0)returnfalse;'
      + `constrouteSegments=route.replace(/\\/$/,${literalToken('')}).toLowerCase().split(${literalToken('/')});`
      + 'returnrouteSegments.length===segments.length&&routeSegments.every((segment,index)=>'
      + '/^\\[[^.[\\]]+\\]$/.test(segment)?segments[index].length>0:segment===segments[index],);});}')) {
    errors.push('page helper must gate every page with registered permissions, case-insensitively and never pages that only require sign-in');
  }
  return errors;
}

export function parsePageAuthorizationSources(source, helper, catalog, generated) {
  const generatedMatch = /^export const PAGE_PERMISSIONS:[^=]+?=\s*(\{[\s\S]*?\});\s*$/m.exec(generated);
  const generatedPages = generatedMatch ? JSON.parse(generatedMatch[1]) : null;
  const generatedModesMatch = /^export const PAGE_PERMISSION_MODES:[^=]+?=\s*(\{[\s\S]*?\});\s*$/m.exec(generated);
  const generatedModes = generatedModesMatch ? JSON.parse(generatedModesMatch[1]) : null;
  const bindingErrors = validatePageAuthorizationBinding(source, helper);
  const pagePermissions = catalog.pagePermissions;
  const codes = new Set((catalog.permissions ?? []).map(({ code }) => code));
  if (!pagePermissions || typeof pagePermissions !== 'object' || Array.isArray(pagePermissions)
    || Object.keys(pagePermissions).length === 0
    || Object.entries(pagePermissions).some(([route, required]) => !route.startsWith('/') || !Array.isArray(required)
      || required.some((code) => !codes.has(code)) || new Set(required).size !== required.length)) {
    bindingErrors.push('page permission registry is missing, empty or invalid');
  }
  if (JSON.stringify(pagePermissions) !== JSON.stringify(generatedPages)) {
    bindingErrors.push('generated PAGE_PERMISSIONS must exactly match the source page permission registry');
  }
  const pagePermissionModes = catalog.pagePermissionModes ?? {};
  if (!pagePermissionModes || typeof pagePermissionModes !== 'object' || Array.isArray(pagePermissionModes)
      || Object.entries(pagePermissionModes).some(([route, mode]) => !Array.isArray(pagePermissions?.[route])
        || pagePermissions[route].length === 0 || !['ANY', 'ALL'].includes(mode))) {
    bindingErrors.push('page permission mode registry is invalid');
  }
  if (JSON.stringify(pagePermissionModes) !== JSON.stringify(generatedModes)) {
    bindingErrors.push('generated PAGE_PERMISSION_MODES must exactly match the source page permission modes');
  }
  return { pagePermissions, pagePermissionModes, bindingErrors };
}

export function readProxyAccessRules(repoRoot = ROOT) {
  const sourcePath = path.join(repoRoot, 'frontend', 'src', 'proxy.ts');
  const policySource = 'config/governance/permission-catalog.json';
  const generatedSource = 'frontend/src/types/generated-permissions.ts';
  const helperSource = 'frontend/src/lib/auth/page-authorization.ts';
  return {
    source: normalize(path.relative(repoRoot, sourcePath)),
    policySource,
    generatedSource,
    helperSource,
    ...parsePageAuthorizationSources(
      fs.readFileSync(sourcePath, 'utf8'),
      fs.readFileSync(path.join(repoRoot, helperSource), 'utf8'),
      JSON.parse(fs.readFileSync(path.join(repoRoot, policySource), 'utf8')),
      fs.readFileSync(path.join(repoRoot, generatedSource), 'utf8'),
    ),
  };
}

function matchesPrefix(route, prefix) {
  return route === prefix || route.startsWith(`${prefix}/`);
}

export function expectedShellAccess(route, proxyRules) {
  if (route === '/login') return 'public';
  const pages = proxyRules.pagePermissions ?? {};
  if (!matchesPrefix(route.toLowerCase(), '/admin')) {
    // [2026-11-08] /admin 밖이라도 기능권한이 등록된 화면은 proxy 가 같은 분기로 막는다(requiresRegisteredPermission).
    //   정확히 등록된 화면은 그 등록이 정한다 — 동적 형제의 권한이 인증만 요구하는 정적 화면을 게이트에 넣지 않는다.
    const exactRequired = pages[route.replace(/\/$/, '')];
    if (Array.isArray(exactRequired)) return exactRequired.length > 0 ? 'admin-system' : 'authenticated';
    const lowerSegments = route.replace(/\/$/, '').toLowerCase().split('/');
    const gated = Object.entries(pages).some(([candidate, required]) => {
      if (!Array.isArray(required) || required.length === 0) return false;
      const candidates = candidate.replace(/\/$/, '').toLowerCase().split('/');
      return candidates.length === lowerSegments.length && candidates.every((part, index) =>
        /^\[[^.[\]]+\]$/.test(part) ? lowerSegments[index].length > 0 : part === lowerSegments[index]);
    });
    return gated ? 'admin-system' : 'authenticated';
  }
  const normalized = route.replace(/\/$/, '');
  const exact = pages[normalized];
  const segments = normalized.split('/');
  const required = exact ?? Object.entries(pages).find(([candidate]) => {
    const candidates = candidate.replace(/\/$/, '').split('/');
    return candidates.length === segments.length && candidates.every((part, index) =>
      /^\[[^.[\]]+\]$/.test(part) ? segments[index].length > 0 : part === segments[index]);
  })?.[1];
  // admin-system is a legacy census label for a gated shell, not an ADMIN/SYSTEM
  // role monopoly. Unknown pages stay gated: no registered permission can open them.
  return Array.isArray(required) && required.length === 0 ? 'authenticated' : 'admin-system';
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

/**
 * 화면 소스를 직접 지우지 않는 시작 구성(directProjectionProfiles). `profileProjections` 는 시작 구성마다 생성기와 같은 해석기가 계산한
 * 화면 제외 경로다(profileProjections). 연쇄 제거는 보지 않는다 — 그것은 도달성 census 와 생성기 화면 대조의 일이다.
 */
export function directProjectionProfiles(source, profileProjections) {
  const frontendRelative = source.replace(/^frontend\//, '');
  return profileProjections.profiles
    .filter(({ removePaths }) => !removePaths.some((removal) => pathCoveredByRemoval(frontendRelative, removal)))
    .map(({ profile }) => profile)
    .sort();
}

const presetRecipe = (preset) => ({ schemaVersion: 1, project: { name: 'route-ledger' }, sourceRef: 'main', selection: { preset } });
const projectionsByRoot = new Map();
/**
 * 시작 구성마다 화면을 직접 지우는 경로(11단계 C5 — pack 대신 기능 소유). 원본 저장소에서는 카탈로그로 시작 구성을 풀어 생성기와 같은
 * 해석기가 계산한 화면 제외 경로(composition.frontend.removePaths)를 쓰고, 생성물에서는 거버넌스 투영이 남긴 구성 스냅숏 하나를 쓴다
 * — 생성물에는 원본 카탈로그를 적재할 원천이 없다. 생성물 판별은 매니페스트 v2 의 표지(presets.json 의 active)다. 표지가 구조와 맞지
 * 않거나, 생성물인데 구성 스냅숏이 표지와 다르면 실패한다.
 */
export function profileProjections(repoRoot = ROOT) {
  const root = path.resolve(repoRoot);
  if (!projectionsByRoot.has(root)) {
    const generated = detectGeneratedComposition(root);
    let value;
    if (generated.projection) {
      const { composition } = JSON.parse(fs.readFileSync(path.join(root, COMPOSER_SELECTION_PATH), 'utf8'));
      if (composition?.profile !== generated.profile || !Array.isArray(composition?.frontend?.removePaths)) {
        throw new Error(`composer selection snapshot does not describe the generated composition: ${generated.profile}`);
      }
      value = { projection: true, profiles: [{ profile: generated.profile, removePaths: [...composition.frontend.removePaths] }] };
    } else {
      const catalog = loadProjectComposerCatalog(root);
      value = { projection: false, profiles: catalog.presets.map((preset) => ({ profile: preset.id,
        removePaths: [...resolveProjectRecipe(presetRecipe(preset.id), catalog).frontend.removePaths] })) };
    }
    projectionsByRoot.set(root, value);
  }
  return projectionsByRoot.get(root);
}

export function inspectRouteRepository(repoRoot = ROOT) {
  let projections;
  return {
    repoRoot,
    pages: discoverPageRoutes(repoRoot),
    proxy: readProxyAccessRules(repoRoot),
    configRedirects: discoverConfigRedirects(repoRoot),
    // 시작 구성 투영은 원장 행을 만들거나 검사할 때만 푼다 — 화면·프록시·리다이렉트만 보는 호출자(거버넌스 투영의 별칭 정리 등)가
    // 카탈로그를 적재하지 않게 한다.
    get profileProjections() {
      projections ??= profileProjections(repoRoot);
      return projections;
    },
    profileSource: `${MODULES_DIRECTORY}/${PRESETS_FILE}`,
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
      directProjectionProfiles: directProjectionProfiles(source, repository.profileProjections),
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

    return entry;
  });

  return {
    schemaVersion: 1,
    asOf,
    authority: 'route-role-capability-truth-census',
    scope: 'frontend/src/app/**/page.{js,jsx,ts,tsx}',
    notes: [
      'shellAccess is a proxy UI-shell admission class, not a domain capability authorization claim.',
      'roles and capability actorScope describe the intended users in the default installation (persona, ADR-0016 default groups); they are not an authorization rule — a custom group holding the permission can use the route, and access is decided by explicit OPERATION/NAVIGATION grants, ALL/ANY page modes, excluded groups and object conditions.',
      'admin-system is a compatibility label for an explicit OPERATION-gated admin shell, not an ADMIN/SYSTEM role restriction; unregistered admin paths are denied. NAVIGATION controls menu display separately.',
      'directProjectionProfiles is a direct feature-removal observation (the preset composition frontend.removePaths), not positive semantic profile ownership and not a full transitive artifact proof.',
      'unverified values are bounded review exceptions and keep G1 gateReady=false.',
      'Capability evidence levels are E0 entry, E1 reachable code, E2 authoritative source/policy, E3 executable contract definition, E4 current UI-to-server roundtrip artifact, and E5 deployed provenance/owner confirmation.',
      'candidateStatus records a hypothesis only; it never upgrades the asserted status without current E4 evidence.',
      'E4 is machine-bound: a capability is E4 exactly when its roundtrips name browser journey tests (frontend/e2e/journeys; no network stubbing in the spec or the frontend/e2e fixtures and helpers it imports; one real test() call with that literal title, so commented-out, skipped or describe calls do not count) whose actions together cover every capability action. Required CI runs every journey whenever a change that the E2E selection (ADR-0023) picks lands on main and counts a retry pass as a failure; after a change the selection judges unrelated, the previous full run remains the evidence. Whether a test really performs an action is a reviewed claim. E4 and E5 never transfer to a generated project.',
      'A redirect alias follows its destination (DEC-OPS-404): its single redirect-destination capability takes the destination page status, dataSource, supportedActions, visibleLabel, combined actorScope and lowest evidence level, resolved by path (query and tab do not split a route).',
    ],
    sources: {
      pages: 'frontend/src/app/**/page.{js,jsx,ts,tsx}',
      proxy: repository.proxy.source,
      pagePermissions: repository.proxy.policySource,
      generatedPagePermissions: repository.proxy.generatedSource,
      pageAuthorization: repository.proxy.helperSource,
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

function validateReview(review, label, asOf, errors) {
  if (!review || !isNonemptyString(review.owner) || !isNonemptyString(review.reason)) {
    errors.push(`${label}: unverified fields require review owner and reason`);
    return;
  }
  if (!validIsoDate(review.reviewBy)) {
    errors.push(`${label}: reviewBy must be a real YYYY-MM-DD date`);
    return;
  }
  // ADR-0018: the technical contract validates the recorded review, while
  // governance-review reports calendar freshness without changing route truth.
  if (validIsoDate(asOf) && review.reviewBy < asOf) {
    errors.push(`${label}: reviewBy predates its evidence review`);
  }
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

function validateMenuSnapshot(snapshot, asOf, errors) {
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
    validateReview(snapshot.review, 'menuSnapshot', asOf, errors);
  } else if (!validIsoDate(snapshot.capturedAt)) {
    errors.push('menuSnapshot: live evidence requires capturedAt');
  }
}

// 대소문자를 가리지 않는다 — 대소문자를 가리지 않는 디스크에서 `__TESTS__`·`.TEST.tsx` 로 시험 파일을 숨기지 못하게 한다(Codex 23차).
// 폴더 조각과 파일 이름을 따로 본다 — 한 정규식의 갈래에 고정점을 섞으면 CodeQL 이 막는다(js/regex/missing-regexp-anchor).
const TEST_DIRECTORY = /(?:^|\/)__tests__\//i;
const TEST_FILE_NAME = /\.(?:test|spec)\.[cm]?[jt]sx?$/i;
const isTestSource = (file) => TEST_DIRECTORY.test(file) || TEST_FILE_NAME.test(file);
// 한 줄에 하나뿐인 기본 바인딩 import(`import Name from '지정자';`). 바인딩 없는 import·빈 `{}`·이름 import·한 줄 여러 import 는
// 받지 않는다 — 판정할 수 없는 형태는 허용하지 않는 쪽이다(Codex 24차: `import  './x'` 처럼 공백만 늘린 부수효과 import).
const DEFAULT_IMPORT_LINE = /^\s*import\s+([A-Za-z_$][\w$]*)\s+from\s+(['"])([^'"\r\n]+)\2\s*;?\s*$/;
const stripComments = (text) => text.replace(/\/\*[\s\S]*?\*\//g, '').replace(/\/\/[^\r\n]*/g, '');

/** 저장소 기준 정규 경로인가 — 역슬래시·빈 조각·`.`·`..` 가 없다. 경로 판정(투영·슬롯)이 원문 접두사를 보므로 우회 표기를 막는다. */
function isCanonicalRepositoryPath(file) {
  return !file.includes('\\') && path.posix.normalize(file) === file
    && file.split('/').every((segment) => segment !== '' && segment !== '.' && segment !== '..');
}

/**
 * 화면 page 소스가 기본 바인딩 import 로 직접 싣고 JSX 로 그리는 파일인가. 지정자는 상대 경로와 `@/`(frontend/src)만 푼다.
 * 세 가지가 모두 맞아야 한다 — 파서가 그 줄을 타입 전용이 아닌 정적 import 로 읽고, 그 줄이 한 줄짜리 기본 바인딩 import 이며 같은
 * 지정자를 가리키고, 주석을 뺀 소스가 그 바인딩을 `<이름` 으로 그린다. 그 밖의 참조 — 타입 전용(재수출의 `{ type … }` 포함)·re-export·
 * 동적 import(실행 여부를 알 수 없다)·require·require.resolve·바인딩 없는 import·쓰지 않는 바인딩 — 는 화면이 그 모듈을 그린다는 근거로
 * 세지 않는다(Codex 22·23·24차). 판정할 수 없으면 허용하지 않는 쪽이다.
 */
export function pageLoadsModule(repoRoot, pageSource, target) {
  const importer = path.join(repoRoot, pageSource);
  const wanted = path.resolve(repoRoot, target);
  let source;
  let references;
  try {
    source = fs.readFileSync(importer, 'utf8');
    ({ references } = parseModuleReferences(source, pageSource));
  } catch {
    return false;
  }
  const lines = source.split(/\r?\n/);
  const rendered = new Set([...stripComments(source).matchAll(/<([A-Za-z_$][\w$]*)[\s/>]/g)].map((match) => match[1]));
  return references.some(({ kind, specifier, typeOnly, line }) => {
    if (typeOnly || kind !== 'static-import') return false;
    const statement = DEFAULT_IMPORT_LINE.exec(lines[line - 1] ?? '');
    if (!statement || statement[3] !== specifier || !rendered.has(statement[1])) return false;
    const base = specifier.startsWith('@/') ? path.join(repoRoot, 'frontend', 'src', specifier.slice(2))
      : specifier.startsWith('./') || specifier.startsWith('../') ? path.resolve(path.dirname(importer), specifier) : null;
    return base !== null && candidatePaths(base).includes(wanted);
  });
}

/**
 * 시연 역량이 시연 밖 구성이 싣는 화면에 있어도 되는가(2026-11-09 DEC-OPS-409) — 화면은 여러 구성에 남고 시연 기능이 슬롯 기여로 패널만
 * 붙일 때뿐이다. 원본 저장소(모든 시작 구성의 투영을 아는 곳)에서 다음을 모두 만족해야 한다.
 * - 역량의 증거가 모두 정규 경로의, 시험이 아닌 frontend/src 파일이고, 시연은 싣지만 시연 밖의 어떤 시작 구성도 싣지 않는다(화면 제외
 *   경로로 계산한다). 공통 파일(허브 셸·배지)을 적으면 허용하지 않는다 — 표본이 공통 파일에 있으면 실제로 실린다(2026-11-08 허브 승인
 *   철회). `showcase/../../app/…` 처럼 시연 경로를 거쳐 공통 파일을 가리키는 표기도, 디스크의 이름과 대소문자가 다른 표기도 거부한다
 *   (Codex 22·23차).
 * - 그 가운데 하나 이상이 슬롯 기여(src/extensions/<기능>/<슬롯>.ts)이고, 그 슬롯의 소비자를 이 화면의 page 가 기본 바인딩 import 로 직접 싣고
 *   JSX 로 그린다(pageLoadsModule).
 *   지워지는 시험 파일이나 다른 화면 슬롯의 기여만으로는 이 화면에 무엇이 붙는지 말하지 않는다(Codex 20차 반례).
 * 생성물은 자기 구성 하나만 알아 판정할 수 없으므로 허용하지 않는다 — 생성물의 소유는 UNVERIFIED 라 이 가드에 걸리지도 않는다.
 */
function demoContributionRemovedOutsideDemo(capability, entry, repository, nonDemoPresets) {
  const projections = repository?.profileProjections;
  if (projections?.projection !== false || !Array.isArray(projections.profiles)) return false;
  if (!nonDemoPresets.every((preset) => projections.profiles.some(({ profile }) => profile === preset))) return false;
  const evidence = capability?.evidence;
  if (!Array.isArray(evidence) || evidence.length === 0) return false;
  const shipsOnlyInDemo = (file) => {
    const shipping = directProjectionProfiles(file, projections);
    return shipping.includes('demo') && !shipping.some((profile) => nonDemoPresets.includes(profile));
  };
  // 디스크의 실제 이름과 대소문자까지 같은 파일만 받는다(대소문자를 가리지 않는 디스크에서도 같은 판정).
  const exactFile = repositoryFileLookup(repository.repoRoot);
  if (!evidence.every((file) => isNonemptyString(file) && isCanonicalRepositoryPath(file) && file.startsWith('frontend/src/')
    && !isTestSource(file) && exactFile(path.resolve(repository.repoRoot, file)) === 'exact' && shipsOnlyInDemo(file))) return false;
  return evidence.some((file) => {
    let kind;
    try {
      kind = slotPathKind(file);
    } catch {
      return false;
    }
    return kind?.kind === 'contribution'
      && slotConsumerFiles(kind.slot).some((consumer) => pageLoadsModule(repository.repoRoot, entry.source, consumer));
  });
}

export function validateRouteCapabilities(manifest, repository) {
  // 원본 시연 프로필의 소유 기록은 기능을 직접 선택한 생성물에서도 유효하다.
  const knownProfiles = new Set([...compositionProfiles(), 'demo', 'UNVERIFIED']);
  const nonDemoPresets = presetIds().filter((profile) => profile !== 'demo');
  const errors = [];
  const warnings = [];
  const entries = Array.isArray(manifest?.routes) ? manifest.routes : [];
  const pages = Array.isArray(repository?.pages) ? repository.pages : [];

  if (manifest?.schemaVersion !== 1) errors.push('manifest schemaVersion must be 1');
  if (!validIsoDate(manifest?.asOf)) errors.push('manifest asOf must be a real YYYY-MM-DD date');
  if (pages.length === 0) errors.push('route population is empty');
  if (!Array.isArray(repository?.proxy?.bindingErrors)) errors.push('proxy page authorization binding was not inspected');
  else errors.push(...repository.proxy.bindingErrors);
  if (!exactArray(Object.keys(repository?.proxy?.pagePermissions ?? {}).sort(), pages.map(({ route }) => route).sort())) {
    errors.push('page permission registry must cover exactly the filesystem route population');
  }
  for (const [key, expected] of Object.entries({
    pagePermissions: repository?.proxy?.policySource,
    generatedPagePermissions: repository?.proxy?.generatedSource,
    pageAuthorization: repository?.proxy?.helperSource,
  })) {
    if (!expected || manifest?.sources?.[key] !== expected) errors.push(`sources.${key} must bind the current page authorization source`);
  }
  validateMenuSnapshot(manifest?.menuSnapshot, manifest?.asOf, errors);

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
  const journeySpecs = new Map();
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
        // 별칭의 기능은 목적지에서 가져오므로 증거 등급도 목적지 것이다 — 아래 별칭 대조가 본다.
        const derivedRedirect = expectedRouteRouting.kind !== 'page' && capability?.id === REDIRECT_CAPABILITY_ID;
        if (!derivedRedirect) {
          const covered = validateRoundtrips(capability, capabilityLabel, repository.repoRoot, journeySpecs, errors);
          const allActions = uniqueSorted(capability?.actions ?? []);
          const fullyCovered = allActions.length > 0 && exactArray(covered, allActions);
          if (capability?.evidenceLevel === 'E4' && !fullyCovered) {
            errors.push(`${capabilityLabel}: E4 requires journey roundtrips that together cover every action`);
          }
          if (fullyCovered && !['E4', 'E5'].includes(capability?.evidenceLevel)) {
            errors.push(`${capabilityLabel}: journey roundtrips cover every action, so evidenceLevel must be E4`);
          }
          if (['E4', 'E5'].includes(capability?.evidenceLevel) && capability?.candidateStatus === 'live') {
            errors.push(`${capabilityLabel}: current E4 evidence promotes the live candidate — set status live and drop candidateStatus`);
          }
        } else if (capability?.roundtrips !== undefined) {
          errors.push(`${capabilityLabel}: a redirect alias takes its evidence from the destination and cannot declare roundtrips`);
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
      /*
       * [2026-09-23] 동결 목록과 커밋된 원장을 양방향으로 대조한다.
       *
       * 종전에 KNOWN_ROUTE_CAPABILITIES 는 baseline 을 '생성' 하기만 했고 커밋본과 비교되지 않았다.
       * 그래서 기능을 배선하며 원장만 고치면 동결은 낡은 값을 그대로 들고 있었고, 반대로 동결만
       * 고치면 아무 신호도 나지 않았다 — 다음 baseline 재생성이 고친 행을 되돌리는 경로다.
       * 실제로 부재 관리 행이 배선(2026-09-07) 뒤에도 미연동으로 남아 있었다.
       *
       * 날짜는 비교하지 않는다. 생성기는 행마다 census 의 asOf 를 넣는데, 특정 행만 다시 확인한
       * 날짜(lastVerifiedAt)는 그보다 뒤일 수 있고 그것은 드리프트가 아니라 더 정확한 사실이다.
       */
      const frozen = KNOWN_ROUTE_CAPABILITIES[entry.route];
      if (frozen) {
        if (frozenCapabilityRequiresProjectionReset(frozen, repository)) {
          if (!isProjectedCapabilityReset(entry)) {
            errors.push(`${label}: projected route whose frozen capability uses E4/E5 or absent evidence must reset to route-capability-review`);
          }
        } else {
          const byId = new Map(entry.capabilities.map((capability) => [capability.id, capability]));
          const frozenIds = frozen.map(({ id }) => id).sort();
          if (!exactArray([...byId.keys()].sort(), frozenIds)) {
            errors.push(`${label}: capability ids must match the frozen capability expectation`);
          }
          for (const definition of frozen) {
            const capability = byId.get(definition.id);
            if (!capability) continue;
            for (const field of ['status', 'candidateStatus', 'dataSource', 'visibleLabel', 'evidenceLevel', 'primaryTask', 'actorScope']) {
              if ((capability[field] ?? null) !== (definition[field] ?? null)) {
                errors.push(`${label}/${definition.id}: ${field} drifted from the frozen expectation`);
              }
            }
            for (const field of ['actions', 'unsupportedVisibleActions']) {
              if (!exactArray(capability[field] ?? [], uniqueSorted(definition[field] ?? []))) {
                errors.push(`${label}/${definition.id}: ${field} drifted from the frozen expectation`);
              }
            }
            if (JSON.stringify(capability.roundtrips ?? null) !== JSON.stringify(definition.roundtrips ?? null)) {
              errors.push(`${label}/${definition.id}: roundtrips drifted from the frozen expectation`);
            }
          }
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
      || entry.profileOwners.some((profile) => !knownProfiles.has(profile))
      || new Set(entry.profileOwners).size !== entry.profileOwners.length) {
      errors.push(`${label}: profileOwners must be a non-empty unique known-profile array`);
    }
    if (entry.profileOwners?.includes('UNVERIFIED') && entry.profileOwners.length !== 1) {
      errors.push(`${label}: UNVERIFIED cannot be mixed with asserted profile owners`);
    }
    if (!Array.isArray(entry.directProjectionProfiles)
      || !exactArray(entry.directProjectionProfiles, directProjectionProfiles(entry.source, repository.profileProjections))) {
      errors.push(`${label}: directProjectionProfiles drifted from the preset compositions' frontend removePaths`);
    }
    // 확인한 소유(profileOwners)는 투영 관찰을 가리지 않는다. 원본 저장소에서 화면 소스를 지우지 않는 시작 구성은 모두 소유에 적혀야
    // 한다 — 손으로 적은 소유가 그 화면을 싣는 시작 구성을 빠뜨리면 아래 데모 누수 가드가 그 구성을 보지 못한다.
    // 생성물은 자기 구성 하나만 알고 그 이름이 'custom' 일 수 있어 보지 않는다 — 원본 저장소의 이 대조가 모든 시작 구성을 이미 본다.
    if (repository?.profileProjections?.projection === false && Array.isArray(entry.profileOwners)
      && !entry.profileOwners.includes('UNVERIFIED') && Array.isArray(entry.directProjectionProfiles)) {
      const omitted = entry.directProjectionProfiles.filter((profile) => !entry.profileOwners.includes(profile));
      if (omitted.length) errors.push(`${label}: profileOwners omit presets that ship the screen: ${omitted.join(', ')}`);
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
    if (declaredUnverified.length > 0) validateReview(entry.review, label, manifest?.asOf, errors);
    else if (entry.review !== undefined) warnings.push(`${label}: review metadata exists without unverifiedFields`);

    if (entry.capabilities?.some((capability) => capability?.status === 'demo'
        && !demoContributionRemovedOutsideDemo(capability, entry, repository, nonDemoPresets))
      && entry.profileOwners.some((profile) => nonDemoPresets.includes(profile))) {
      errors.push(`${label}: demo capability leaks into a non-demo profile owner`);
    }
    if (entry.status === 'demo' && entry.decisionSafe !== false) {
      errors.push(`${label}: demo capability cannot be operational-decision safe`);
    }
  }

  /*
   * [2026-11-09] 리다이렉트 별칭은 목적지를 따른다(DEC-OPS-404 — 의미는 목적지). 별칭 행의 상태·출처·동작·이름은 최종 목적지 화면 행과
   * 같아야 하고, 기능은 목적지에서 만든 redirect-destination 하나다. 별칭이나 목적지가 그 필드를 아직 미확인으로 두면 대조하지 않는다 —
   * 생성물에서 목적지가 원본 증거를 잃어 미확인이 되면, 별칭은 다른 복사된 행처럼 원본 관찰을 그대로 들고 있다.
   * 목적지는 경로 단위로 푼다(쿼리·탭은 화면 행을 나누지 않는다).
   */
  for (const entry of entries) {
    const routing = expectedRoutingBySource.get(entry?.route);
    if (!routing || routing.kind === 'page' || !actualByRoute.has(entry.route)) continue;
    const label = `route ${entry.route}`;
    const visited = new Set([entry.route]);
    let destination = actualByRoute.get(normalizedRoutingTarget(routing.target));
    while (destination && expectedRoutingBySource.get(destination.route)?.kind !== 'page' && !visited.has(destination.route)) {
      visited.add(destination.route);
      destination = actualByRoute.get(normalizedRoutingTarget(expectedRoutingBySource.get(destination.route)?.target));
    }
    if (!destination || expectedRoutingBySource.get(destination.route)?.kind !== 'page') continue;
    const aliasOpen = (entry.unverifiedFields ?? []).some((field) => REDIRECT_DERIVED_FIELDS.includes(field));
    const destinationOpen = destination.status === 'unverified'
      || (destination.unverifiedFields ?? []).some((field) => REDIRECT_DERIVED_FIELDS.includes(field));
    if (aliasOpen || destinationOpen) continue;
    if (entry.visibleLabel !== destination.visibleLabel) {
      errors.push(`${label}: redirect alias visibleLabel must follow its destination ${destination.route}`);
    }
    const expected = redirectDestinationCapability(destination, { lastVerifiedAt: '', owner: '', evidence: [] });
    const [capability, ...extra] = entry.capabilities ?? [];
    if (extra.length > 0 || capability?.id !== REDIRECT_CAPABILITY_ID) {
      errors.push(`${label}: a redirect alias has exactly one ${REDIRECT_CAPABILITY_ID} capability`);
      continue;
    }
    for (const field of ['status', 'dataSource', 'actorScope', 'visibleLabel', 'primaryTask', 'evidenceLevel']) {
      if (capability[field] !== expected[field]) {
        errors.push(`${label}: redirect alias ${field} must follow its destination ${destination.route} (${JSON.stringify(expected[field])})`);
      }
    }
    for (const field of ['actions', 'unsupportedVisibleActions']) {
      if (!exactArray(capability[field] ?? [], expected[field])) {
        errors.push(`${label}: redirect alias ${field} must follow its destination ${destination.route}`);
      }
    }
    if (capability.candidateStatus !== undefined) errors.push(`${label}: a redirect alias has no candidateStatus`);
    const ownEvidence = routing.kind === 'config-redirect' ? [entry.source, repository.configRedirects.source] : [entry.source];
    if (ownEvidence.some((source) => !capability.evidence?.includes(source))) {
      errors.push(`${label}: redirect alias evidence must include its redirect source(s): ${ownEvidence.join(', ')}`);
    }
  }

  for (const route of expectedByRoute.keys()) {
    if (!actualByRoute.has(route)) errors.push(`manifest is missing filesystem route: ${route}`);
  }
  /*
   * [2026-10-05] 동결 목록에서 원장 쪽으로도 대조한다. 위의 대조는 원장의 화면마다 동결 항목을 찾으므로,
   * 원장에서 사라진 화면의 동결 항목은 아무것도 지키지 않으면서 신호 없이 남는다.
   * 실제로 2026-09-08 걷은 마이페이지 화면의 항목이 한 달 가까이 남아 있었다.
   *
   * 원장에 없어도 되는 경우는 하나다 — 화면 파일도 없고, 어떤 시작 구성의 투영이 기능 제외 경로로
   * 그 화면을 걷는 경우(축소 구성에서 빠진 demo 화면)다. 모든 시작 구성이 남기는 화면이면
   * 투영으로 사라질 수 없으므로 동결 항목이 낡은 것이다.
   *
   * 생성물은 자기 구성의 제외 경로만 알고 다른 시작 구성을 모른다. 그래서 생성물에서는 화면 파일이 없는 것만으로
   * 투영이 걷은 화면으로 본다 — 원본 저장소에서 이 검사가 모든 동결 화면의 원장 행을 이미 요구했기 때문이다.
   * 생성물 판별은 표지 하나가 아니라 생성기가 쓰는 구조까지 본다(profileProjections → detectGeneratedComposition).
   */
  const projections = repository?.profileProjections;
  const profileCount = projections?.profiles?.length ?? 0;
  for (const route of Object.keys(KNOWN_ROUTE_CAPABILITIES)) {
    if (actualByRoute.has(route)) continue;
    const removedByProjection = !expectedByRoute.has(route) && profileCount > 0 && (projections.projection
      || directProjectionProfiles(`frontend/src/app${route}/page.tsx`, projections).length < profileCount);
    if (!removedByProjection) errors.push(`frozen capability expectation has no ledger route: ${route}`);
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

export function analyzeRouteCapabilities(repoRoot = ROOT, manifestPath = MANIFEST_PATH) {
  const manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
  const repository = inspectRouteRepository(repoRoot);
  return { manifest, repository, result: validateRouteCapabilities(manifest, repository) };
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
