import { createHash } from 'node:crypto';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, join, relative, resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
import { domainSupportFiles, supportFileDirectoryDomain } from './project-composer-source.mjs';
import { INTEGRATES, REGISTRATION_ONLY_CONTRIBUTIONS, REGISTRATION_ONLY_EVENTS, REGISTRATION_ONLY_PORTS, apiSourceOwner, degradationPredicate, deriveEventSources,
  deriveEventTriples, derivePortConnections, javaSourceFiles, requiresClosure, resolveIntegrations, sourceOwner } from './project-composer-integrations.mjs';
import { MODULES_DIRECTORY, loadComposerModules } from './composer-modules.mjs';
import { menuRouteKey } from './project-composer-db.mjs';
import { REQUIRES_USER_REASONS, attachUserReasons } from './project-composer-reasons.mjs';
import { COMPOSER_MENU_SNAPSHOT_PATH } from './project-composer-menu-preview.mjs';
import { SLOT_ROOT, slotPathKind } from './slot-registry.mjs';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = 'config/reusable-base-profiles.json';
const PERMISSIONS = 'config/governance/permission-catalog.json';
const APP_ROOT = 'business-app/src/main/java/nuri/business';
const API_ROOT = 'api-server/src/main/java/nuri/api';
const sorted = values => [...new Set(values)].sort();
const slash = value => value.split(sep).join('/');

export function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(',')}]`;
  if (value !== null && typeof value === 'object') {
    return `{${Object.keys(value).sort().map(key => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(',')}}`;
  }
  return JSON.stringify(value);
}

export function compositionDigest(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function fail(message) { throw new Error(`project-composer catalog: ${message}`); }
function walk(directory) {
  if (!existsSync(directory)) return [];
  if (!statSync(directory).isDirectory()) return [directory];
  return readdirSync(directory, { withFileTypes: true }).flatMap(entry => entry.isDirectory()
    ? walk(join(directory, entry.name)) : [join(directory, entry.name)]).sort();
}

// These declarations refine the existing pack ownership. Database ownership and
// backend paths are discovered below, never copied into a second table manifest.
// 메뉴는 경로를 소유한 기능에 속한다. `menuTabs` 는 다른 기능의 셸에 이 기능이 기여한 탭 메뉴이고,
// 셸이 남아 있어도 이 기능이 빠지면 숨긴다. 선언은 메뉴 스냅숏의 실제 행과 맞아야 한다.
const FEATURES = {
  addressbook: { label: '주소록', permissions: ['ADBK'], paths: [
    'src/app/admin/collaboration/address-book', 'src/services/business/user/addressbook', 'src/types/business/addressbook.ts',
    // 슬롯 기여(PR-4): 수신자 피커의 주소록 출처. 기능 디렉터리째 기능과 함께 직접 지워진다.
    'src/extensions/addressbook'], routes: ['/admin/collaboration/address-book'] },
  board: { label: '게시판·지식', permissions: ['BOARD', 'BBS_MST', 'SATISFY', 'NOTICE', 'FAQ'], paths: [
    'src/app/actions/boardActions.ts', 'src/services/business/user/board/BoardUserService.ts',
    'src/services/foundation/system/BoardAdminService.ts', 'src/services/business/board/SatisfactionService.ts',
    'src/services/business/knowledge/knowledgeService.ts', 'src/app/admin/community/boards',
    // Phase 0c: 게시물·자료 이용 통계 화면은 게시판 데이터만 보여 준다. 통계 셸·나머지 통계 화면은 core 다.
    'src/app/admin/stats/board', 'src/app/admin/stats/data-usage',
    // 허브 분해 H2(결정 ⑤): 지식 허브 셸은 게시판 소유다. 위키·FAQ·Q&A 는 셸 고유 탭이고 커뮤니티 탭은 커뮤니티의 hub-tabs 기여다.
    //   질의응답 해결 판정은 셸과 도움말 서비스가 함께 쓰는 게시판 모듈이다.
    'src/app/admin/help', 'src/lib/board',
    // 허브 분해 H4: 통계 셸의 게시물·자료 이용 탭과 통계 요약의 누적 게시물 칸 기여(stats-panels).
    // 업무 홈(Phase 2 9단계): 글 수 카드·최근 글 목록·새 게시글 작성 조각과 그 조회(home-sections 기여).
    'src/extensions/board', 'src/app/components/dashboard/BoardHome.tsx', 'src/queries/board-home-query.ts',
    // Phase 2 커뮤니티 후속 C1b: 게시글 모아보기는 이름과 달리 게시판을 골라 게시글을 보는 게시판 화면이다(커뮤니티 데이터를 쓰지 않는다).
    'src/app/admin/community/board'],
  routes: ['/admin/community/board', '/admin/community/boards', '/admin/help', '/admin/stats/board', '/admin/stats/data-usage'] },
  comment: { label: '댓글', permissions: ['COMMENT'], paths: [
    'src/app/actions/commentActions.ts', 'src/services/business/comment/commentService.ts',
    'src/services/foundation/system/CommentAdminService.ts', 'src/app/admin/system/comments'],
  routes: ['/admin/system/comments'] },
  // 커뮤니티·홍보(배너·팝업)·시연 화면은 따로 고른다(DEC-OPS-256 ①). 셋 사이에는 코드 참조가 없다.
  community: { label: '커뮤니티', permissions: ['COMMUNITY'], paths: [
    'src/app/admin/community/[id]', 'src/app/admin/community/page.tsx', 'src/app/cop/cmy',
    'src/services/business/community', 'src/services/foundation/system/CommunityAdminService.ts', 'src/types/business/community.ts',
    // 허브 분해 H2: 지식 허브의 커뮤니티 탭 기여와 그 뷰·대화상자, 그리고 커뮤니티 탭으로 가는 별칭 화면.
    'src/components/business/community', 'src/extensions/community', 'src/app/admin/community/boards/page.tsx'],
  routes: ['/admin/community', '/admin/community/[id]', '/admin/community/boards', '/cop/cmy'],
  exactRoutes: ['/admin/community', '/admin/community/boards'], menuTabs: ['/admin/help?tab=COMMUNITY'] },
  // 업무 홈(Phase 2 9단계): 업무 홈 셸은 core 이고, 이 기능은 '실시간 상태' 구역을 home-sections 로 기여한다.
  dashboard: { label: '실시간 대시보드', permissions: [], paths: [
    'src/components/features/dashboard/RealTimeDashboard.tsx', 'src/components/features/dashboard/RealTimeHomeSection.tsx',
    'src/extensions/dashboard'], routes: [] },
  // 행사(약도·행사별 외부인사 포함)와 포상은 따로 고른다(DEC-OPS-256 ①). 외부인사 기본 키가 행사 번호를 품고 물리 외래 키가 행사를 가리킨다.
  event: { label: '행사·외부인사', permissions: ['EVENT', 'EXT_HR'], paths: [
    'src/app/admin/operation/events', 'src/app/admin/operation/external-hr', 'src/app/admin/operation/rough-map',
    'src/services/foundation/operation/ExternalHrAdminService.ts', 'src/services/foundation/operation/eventService.ts',
    'src/services/foundation/operation/__tests__/eventService.test.ts'],
  routes: ['/admin/operation/events', '/admin/operation/external-hr', '/admin/operation/rough-map'] },
  help: { label: '도움말·온라인 매뉴얼', permissions: ['HELP'], paths: [
    'src/app/admin/system/hpcm', 'src/app/admin/uss/olh', 'src/app/help',
    'src/services/business/user/help', 'src/services/foundation/system/HpcmAdminService.ts', 'src/services/foundation/user',
    // 슬롯 기여(PR-6): 머리글·바닥글·오류 화면의 도움말 링크. 기능 디렉터리째 기능과 함께 직접 지워진다.
    'src/extensions/help'],
  routes: ['/admin/system/hpcm', '/admin/uss/olh', '/help'] },
  informalsanction: { label: '약식 전자결재', permissions: ['INFORMAL', 'APPROVAL', 'WORKFLOW'], paths: [
    'src/app/admin/sanctn/workflow', 'src/app/admin/system/ism', 'src/app/admin/workflow', 'src/app/approvals',
    'src/services/business/user/approval',
    // 업무 홈(Phase 2 9단계): 결재 대기 카드·결재함 열기 단추와 그 조회(home-sections 기여).
    'src/app/components/dashboard/ApprovalHome.tsx', 'src/queries/approval-home-query.ts', 'src/extensions/informalsanction'], routes: ['/admin/sanctn/workflow', '/admin/system/ism', '/admin/workflow', '/approvals'] },
  isg: { label: '인터넷 서비스 안내', permissions: ['SERVICE'], paths: [
    'src/app/admin/system/isg', 'src/services/foundation/system/InternetSvcGuidanceAdminService.ts'], routes: ['/admin/system/isg'] },
  mail: { label: '메일', permissions: ['MAIL'], paths: [
    'src/services/business/mail/MailService.ts', 'src/app/admin/collaboration/mail-history', 'src/app/admin/collaboration/mail-send',
    // 슬롯 기여(허브 분해 H1): 협업 허브 머리의 메일 발송 링크.
    'src/extensions/mail'],
  routes: ['/admin/collaboration/mail-history', '/admin/collaboration/mail-send'], requirements: ['메일 발송에 사용할 SMTP 설정'] },
  memoreport: { label: '메모 보고', permissions: ['MEMO_RPT'], paths: [
    'src/services/business/memoreport', 'src/app/admin/operation/memo-reports',
    // 슬롯 기여(업무 허브 분해 W1): 업무 보고 화면 머리의 메모보고 관리 링크와 안내 문장.
    'src/extensions/memoreport'], routes: ['/admin/operation/memo-reports'] },
  note: { label: '쪽지', permissions: ['NOTE'], paths: ['src/services/business/user/NoteService.ts', 'src/app/note', 'src/app/components/dashboard/UnreadNotesCard.tsx',
    // 슬롯 기여(허브 분해 H1): 협업 허브의 쪽지 탭과 명령 센터의 협업 허브 바로가기.
    'src/extensions/note'],
    routes: ['/note'] },
  notification: { label: '알림', permissions: ['NOTI'], paths: [
    'src/app/components/layout/header-notifications.tsx', 'src/app/components/ui/app-notification-drawer.tsx',
    'src/lib/hooks/use-notifications.ts', 'src/services/foundation/system/NotificationAdminService.ts', 'src/app/admin/notifications',
    // 슬롯 기여(PR-6): 머리글의 알림 벨.
    'src/extensions/notification'],
  routes: ['/admin/notifications'] },
  promotion: { label: '배너·팝업', permissions: ['BANNER', 'POPUP'], paths: [
    'src/app/actions/promotionActions.ts', 'src/app/components/dashboard/BannerSlider.tsx', 'src/app/components/dashboard/PopupManager.tsx',
    'src/app/admin/system/banner', 'src/services/business/user/BannerService.ts', 'src/services/business/user/PopupService.ts',
    'src/services/foundation/system/BannerAdminService.ts', 'src/services/foundation/system/PopupAdminService.ts', 'src/types/foundation/banner.ts',
    // 업무 홈(Phase 2 9단계): 공지 팝업·홍보 배너 조각(home-sections 기여).
    'src/app/components/dashboard/PromotionHome.tsx', 'src/extensions/promotion'],
  routes: ['/admin/system/banner'] },
  report: { label: '업무 보고', permissions: ['WORK_RPT'], paths: [
    'src/app/smart-toolkit/work-report', 'src/components/business/report', 'src/services/business/user/ReportService.ts',
    // 슬롯 기여(업무 허브 분해 W1): 나의 업무 탭 줄의 업무 보고 탭.
    'src/extensions/report'],
  routes: ['/smart-toolkit/work-report'] },
  // 일지(tb_diary_info)는 엔티티만 있고 화면·API 가 없다. 이름이 없는 기능을 약속하지 않는다.
  reward: { label: '포상', permissions: ['REWARD'], paths: [
    'src/app/admin/operation/rewards', 'src/services/foundation/operation/RewardAdminService.ts'],
  routes: ['/admin/operation/rewards'] },
  schedule: { label: '일정', permissions: ['SCHEDULE'], paths: [
    'src/app/smart-toolkit/schedule', 'src/components/business/schedule', 'src/services/business/schedule', 'src/types/business/schedule.ts',
    // 슬롯 기여(업무 허브 분해 W1): 나의 업무 탭 줄의 일정 탭.
    'src/extensions/schedule'],
  routes: ['/smart-toolkit/schedule'] },
  scrap: { label: '스크랩', permissions: ['SCRAP'], paths: [
    'src/services/business/user/ScrapService.ts', 'src/app/admin/collaboration/scraps',
    // 슬롯 기여(스크랩 슬롯): 게시글 상세의 스크랩 버튼과 그 버튼이 부르는 쓰기. 기능과 함께 직접 지워진다.
    'src/queries/scrap-post-action.ts', 'src/extensions/scrap'],
  routes: ['/admin/collaboration/scraps'] },
  // 프런트 전용 기능이다 — Java·테이블·권한이 없다(manifest frontendOnlyDomains). 화면 진입 권한은 core 권한이다.
  showcase: { label: '시연 화면', permissions: [], paths: [
    'src/app/admin/patterns', 'src/app/admin/system/layout', 'src/app/admin/system/monitoring/components/HarnessAtlasPanels.tsx',
    // 허브 분해 H3: 감시 허브의 하네스 아틀라스 탭 기여.
    'src/extensions/showcase'],
  routes: ['/admin/patterns', '/admin/system/layout'] },
  sms: { label: '문자 발송', permissions: ['SMS'], paths: [
    'src/services/foundation/operation/SmsAdminService.ts', 'src/app/admin/uss/ion/sms', 'src/app/cop/sms'],
  routes: ['/admin/uss/ion/sms', '/cop/sms'], requirements: ['문자 발송 공급자 설정'] },
  survey: { label: '설문·투표', permissions: ['SURVEY', 'SURVEY_RSP', 'POLL'], paths: [
    'src/app/admin/survey', 'src/app/survey', 'src/lib/api/survey.ts', 'src/services/business/user/poll',
    'src/services/foundation/survey', 'src/services/foundation/system/SurveyAdminService.ts', 'src/types/business/poll.ts', 'src/types/business/survey.ts',
    // 허브 분해 H4: 통계 셸의 설문조사 분석 탭 기여(stats-panels).
    'src/extensions/survey'],
  routes: ['/admin/survey', '/survey'] },
  template: { label: '템플릿', permissions: ['TEMPLATE'], paths: [
    'src/app/admin/community/templates', 'src/app/admin/sanctn/forms', 'src/services/foundation/system/TemplateAdminService.ts'],
  routes: ['/admin/community/templates', '/admin/sanctn/forms'] },
};

// Required only by explicit domain selections. Legacy presets retain their
// existing reduced route surface; their pack projection is unchanged.
// 협업 허브는 core 셸 + 쪽지·스크랩 탭 기여(hub-tabs)라 공동 화면이 아니다(허브 분해 H1). 지식 허브는 게시판 셸 + 커뮤니티 탭
// 기여다(허브 분해 H2). 나의 업무(/admin/work-hub)도 core 셸 + 업무 보고·일정 탭 링크 기여(shell-links 의 work-hub 배치)다
// (업무 허브 분해 W1). 남은 공동 화면은 없다 — 여러 기능이 한 화면 파일을 함께 소유해야 하면 { id, domains, paths, routes, reason,
// evidence } 행을 둔다(직접 선택에서만 서로를 요구하는 간선이 된다). 행이 비어 있는 동안 이 경로(frontendRules·sharedRoutes·
// shared-ui 간선·화면 생존 판정)는 실제·합성 자료 어느 쪽으로도 실행되지 않는다 — 다음 공동 화면 행을 두는 변경이 그 행으로
// 간선과 화면 생존 시험을 함께 둔다.
const SHARED_UI = [];

// 화면이 다른 기능의 코드·API 에 기대는 의존. 허브 분해 H2 에서 지식 허브 공동 화면 간선이 가리던 의존을 명시한다.
// 커뮤니티 → 게시판은 게시글 모아보기 화면을 게시판 소유로 옮기며 걷었다(C1b). 그 결합은 커뮤니티 사용자 API 의 Java 간선이 센다.
// 커뮤니티 → 템플릿은 관리 창 후보를 커뮤니티 API 로 받으며 선택 연동(포트)이 되었다(C2, project-composer-integrations.mjs).
// 업무 홈(Phase 2 9단계)에서 묶음 realtime-stats 를 걷으며, 실시간 구역이 알림 기능의 알림 정규화를 쓰는 코드 의존을 적는다.
//   대시보드→게시판은 의존이 아니라 포트 연동이다(project-composer-integrations.mjs) — 게시판이 없으면 '신규 게시글' 카드만 빠진다.
const UI_DEPENDENCIES = [
  { from: 'help', domain: 'board', reason: '도움말 센터의 자주 묻는 질문·질의응답이 게시판 API 를 부른다.',
    evidence: 'frontend/src/services/business/user/help/HelpUserService.ts', symbol: 'getPublicFaqsOperation' },
  { from: 'dashboard', domain: 'notification', reason: '실시간 상태 구역이 개인 알림 큐의 알림을 알림 기능의 정규화로 읽는다.',
    evidence: 'frontend/src/components/features/dashboard/RealTimeDashboard.tsx', symbol: 'normalizeNotification' },
];

const OPTIONAL_FOREIGN_KEYS = [{
  name: 'fk_tb_bbs_master_tb_cmnty_info', childTable: 'tb_bbs_master', parentTable: 'tb_cmnty_info',
  sourceDomain: 'board', targetDomain: 'community',
  reason: '커뮤니티 귀속은 선택 연동이며 기존 collaboration 투영에서도 커뮤니티 없는 게시판을 제공한다.',
  evidence: 'api-server/src/main/resources/db/migration/V2_102__add_reference_integrity_fks.sql',
}];

/*
 * 기능 사이의 필수 물리 외래 키. 자식 테이블을 고르면 부모 테이블도 있어야 DB 투영이 성공한다.
 * 해석기는 이 목록으로 위반을 계획 단계에서 찾고(자동 포함하지 않음), DB 생성기는 실제로 적용한
 * 스키마의 기능 사이 외래 키가 이 목록과 OPTIONAL_FOREIGN_KEYS 의 합과 정확히 같은지 대조한다.
 * 2026-10-07 전체 마이그레이션 적용 결과에서 기능 사이 외래 키는 5개와 선택 1개뿐이었다.
 * Phase 0c 에서 자료 이용 기록(tb_dta_use_stats)이 게시판 소유가 되어 그 외래 키가 기능 안으로 들어왔고,
 * 이제 이 4개와 선택 1개다. 설문만 골라도 게시판이 필요 없는 이유다.
 */
const REQUIRED_FOREIGN_KEYS = [
  { name: 'fk_tb_bbs_comment_tb_bbs_item', childTable: 'tb_bbs_comment', parentTable: 'tb_bbs_item', sourceDomain: 'comment', targetDomain: 'board',
    reason: '댓글은 게시글에 속한다.', evidence: 'api-server/src/main/resources/db/migration/V2_69__board_post_bigint_identity.sql' },
  { name: 'fk_tb_bbs_comment_tb_bbs_master', childTable: 'tb_bbs_comment', parentTable: 'tb_bbs_master', sourceDomain: 'comment', targetDomain: 'board',
    reason: '댓글은 게시판에 속한다.', evidence: 'api-server/src/main/resources/db/migration/V2_14__add_referential_fks_batch2.sql' },
  { name: 'fk_tb_bbs_scrap_tb_bbs_item', childTable: 'tb_bbs_scrap', parentTable: 'tb_bbs_item', sourceDomain: 'scrap', targetDomain: 'board',
    reason: '스크랩은 게시글을 가리킨다.', evidence: 'api-server/src/main/resources/db/migration/V2_69__board_post_bigint_identity.sql' },
  { name: 'fk_tb_rward_manage_tb_ifml_atrz_info', childTable: 'tb_rward_manage', parentTable: 'tb_ifml_atrz_info', sourceDomain: 'reward', targetDomain: 'informalsanction',
    reason: '포상은 결재 문서를 참조한다.', evidence: 'api-server/src/main/resources/db/migration/V2_78__informal_sanction_bigint_identity.sql' },
];

function javaCode(source) {
  return source.replace(/\/\*[\s\S]*?\*\/|\/\/[^\r\n]*|"""[\s\S]*?"""|"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'/g,
    value => value.replace(/[^\r\n]/g, ' '));
}

/*
 * 아래 판정들은 카탈로그와 수동 도메인 삭제(domain-deletion-plan.mjs)가 함께 쓴다. 삭제 판정은 카탈로그 전체 검증 없이
 * 지금 트리(생성물·이미 지운 트리 포함)에서 같은 간선을 계산해야 해서, 순회는 따로 하되 간선 규칙은 여기 하나만 둔다.
 */
/** api-server 생산 소스의 루트(저장소 기준). 간선은 이 아래 `.java` 파일에서 센다. */
export const API_SOURCE_ROOT = API_ROOT;

/**
 * api-server 생산 소스 하나가 만드는 기능 간선(DEC-OPS-280). 생성기는 지운 기능의 타입을 참조하는 api-server 파일을 연쇄로
 * 지우므로, 디렉터리 소유 기능(apiSourceOwner)의 컨트롤러가 다른 기능 타입을 참조하면 소유 기능은 그 기능을 요구한다.
 * 이 간선이 없으면 소유 기능만 고른 생성물에서 그 컨트롤러가 조용히 지워진다(커뮤니티 사용자 API 가 게시판 참조로 사라지던 경로).
 * 소유 디렉터리 없이 둘 이상을 참조하면 어느 기능에 속하는지 정할 수 없어 실패한다. `features` 는 기능 id 집합이다.
 * @returns {{ owner: string | null, referenced: string[], requires: string[] }}
 */
export function apiSourceRequirements(path, source, features) {
  const referenced = sorted(javaDomainReferences(source).filter(domain => features.has(domain)));
  const owner = referenced.length ? apiSourceOwner(path, features) : null;
  if (!owner && referenced.length > 1) {
    fail(`api-server source references several capabilities without an owning directory: ${path} (${referenced.join(', ')})`);
  }
  return { owner, referenced, requires: owner ? referenced.filter(domain => domain !== owner) : [] };
}
/** 업무 앱 생산 소스의 상대 경로가 속한 기능 디렉터리. 업무 앱 소스가 아니면 null. */
export function appSourceDomain(path) {
  return path.startsWith(`${APP_ROOT}/`) ? path.slice(APP_ROOT.length + 1).match(/^(?:domain|service)\/([^/]+)\//)?.[1] ?? null : null;
}

/** Java 소스가 정규화된 이름으로 참조하는 기능 디렉터리(정적·와일드카드 import 포함, 주석·문자열 제외). 중복이 있을 수 있다. */
export function javaDomainReferences(source) {
  return [...javaCode(source).matchAll(/(?<![\w$])nuri\.business\.(?:domain|service)\.([a-z][a-z0-9_]*)\./g)].map(match => match[1]);
}

/** 생성 묶음 선언이 이 기능에 요구하는 기능. 같은 묶음의 다른 기능과 그 묶음의 requiresDomains 다. */
export function clusterRequirements(manifest, domain) {
  return (manifest.clusters ?? []).filter(cluster => cluster.domains.includes(domain)).flatMap(cluster =>
    [...cluster.domains, ...(cluster.requiresDomains ?? [])].filter(item => item !== domain).map(required => ({ domain: required, cluster })));
}
function covers(prefix, candidate) { return candidate === prefix || candidate.startsWith(`${prefix}/`); }
// 여러 기능 가운데 하나라도 남으면 남는 화면 파일(mode 'any'). 매니페스트 v2 에서는 첫 기능 파일의 owns.frontendAny 다.
const JOINT_FRONTEND = [
  { path: 'src/app/admin/sanctn/WorkflowHubClient.tsx', domains: ['informalsanction', 'template'], mode: 'any' },
  // 운영 세그먼트의 오류 경계는 행사·포상 중 하나라도 남으면 남는다. 두 기능 paths 에 함께 넣으면 한쪽이 빠질 때 지워진다.
  { path: 'src/app/admin/operation/error.tsx', domains: ['event', 'reward'], mode: 'any' },
];
function frontendRules(declarations, domains) {
  return [
    ...domains.flatMap(domain => declarations.features[domain].paths.map(path => ({ path, domains: [domain] }))),
    ...declarations.sharedUi.flatMap(group => group.paths.map(path => ({ path, domains: group.domains }))),
    ...declarations.jointFrontend.map(rule => ({ ...rule, domains: [...rule.domains] })),
  ];
}

/*
 * 슬롯 기여 디렉터리(슬롯 단계 PR-4). src/extensions 아래 디렉터리는 기능 id 여야 하고, 그 기능의 paths 에 `src/extensions/<기능 id>` 로
 * 선언돼야 한다(양방향). v1 선언은 그 기능을 소유한 pack 의 removePaths 에도 있어야 한다(legacy 검사) — 한쪽에만 있으면 직접 선택과
 * 프리셋이 기여를 다르게 지운다. 디렉터리 밖 최상위 파일은 슬롯 장치와 레지스트리뿐이다. 기여 파일 목록을 돌려준다 — 선택 연동의
 * 기여 분류가 쓴다.
 */
function slotContributionInventory(root, declarations) {
  const { features, legacy } = declarations;
  const directory = join(root, 'frontend', SLOT_ROOT);
  const contributions = [];
  for (const entry of existsSync(directory) ? readdirSync(directory, { withFileTypes: true }) : []) {
    const path = `${SLOT_ROOT}/${entry.name}`;
    if (!entry.isDirectory()) {
      if (!['device', 'registry'].includes(slotPathKind(path)?.kind)) fail(`slot root holds an unknown file: ${path}`);
      continue;
    }
    if (!Object.hasOwn(features, entry.name)) fail(`slot contribution directory is not a feature: ${path}`);
    if (!features[entry.name].paths.includes(path)) fail(`slot contribution directory is missing from its feature paths: ${path}`);
    legacy?.checkSlotDirectory(path, entry.name);
    for (const file of walk(join(directory, entry.name))) {
      const kind = slotPathKind(slash(relative(join(root, 'frontend'), file)));
      contributions.push({ path: `frontend/${kind.file}`, owner: kind.owner, slot: kind.slot });
    }
  }
  // 반대 방향: 선언은 기능 자신의 디렉터리 하나만 가리킨다. 없는 디렉터리는 위의 경로 실재 검사가 거부한다.
  for (const [id, feature] of Object.entries(features)) for (const path of feature.paths.filter(path => covers(SLOT_ROOT, path))) {
    if (path !== `${SLOT_ROOT}/${id}`) fail(`feature declares a slot path that is not its own contribution directory: ${id} ${path}`);
  }
  legacy?.checkPackSlotPaths(features);
  return contributions.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

/*
 * v1 선언의 pack 축(11단계 매니페스트 v2 전환 전까지). 생성기 투영은 pack 을 보지 않는다(C3). 이 축은 pack 을 읽는 옛 소비자를 위해서만
 * 남는다 — 구성의 pack 목록(`capability.pack`·시작 구성 pack → composition.packs: 생성물 투영 manifest·lock·거버넌스 투영·검토 범위, C4)과
 * pack removePaths 가 기능 선언과 어긋나지 않는다는 검사(프리셋을 pack 으로 보는 관찰자 — 도달성 census·라우트 원장, C5)다.
 */
function v1PackAxis(manifest) {
  const packOf = new Map();
  for (const [packId, pack] of Object.entries(manifest.packs)) for (const domain of pack.backend?.appDomains ?? []) packOf.set(domain, packId);
  return {
    packOf,
    // 시작 구성의 pack 목록. 프런트 제거 경로는 직접 선택과 같이 카탈로그 규칙에서 계산한다(해석기 단일화, 11단계 C2).
    presets: new Map(Object.entries(manifest.profiles).map(([id, profile]) => [id, { packs: profile.packs }])),
    checkSlotDirectory(path, id) {
      const pack = packOf.get(id);
      if (!(manifest.packs[pack]?.frontend?.removePaths ?? []).includes(path)) fail(`slot contribution directory is missing from its pack removePaths: ${path} (${pack})`);
    },
    checkPackSlotPaths(features) {
      for (const [packId, pack] of Object.entries(manifest.packs)) for (const path of (pack.frontend?.removePaths ?? []).filter(path => covers(SLOT_ROOT, path))) {
        const id = path.slice(SLOT_ROOT.length + 1);
        if (packOf.get(id) !== packId || !features[id]?.paths.includes(path)) fail(`pack removes a slot path that is not its feature's contribution directory: ${packId} ${path}`);
      }
    },
    // Older packs own umbrella directories; verify every file against the
    // narrower feature declarations so new unowned UI cannot silently survive.
    checkFrontendUmbrellas(root, rules) {
      const legacyFrontendPaths = Object.values(manifest.packs).flatMap(pack => pack.frontend?.removePaths ?? []);
      for (const path of legacyFrontendPaths) {
        if (!existsSync(join(root, 'frontend', path))) fail(`manifest frontend ownership path missing: ${path}`);
        for (const file of walk(join(root, 'frontend', path))) {
          const relativePath = slash(relative(join(root, 'frontend'), file));
          if (!rules.some(rule => covers(rule.path, relativePath))) fail(`frontend pack path has no capability refinement: ${relativePath}`);
        }
      }
    },
  };
}

/**
 * v2 카탈로그에 덧붙이는 v1 pack 축(11단계 C2~C5). 생성기 투영은 C3 부터 매니페스트 v2 의 기능 소유로 하고 pack 을 보지 않는다. 구성의
 * pack 목록(composition.packs)과 manifest removePaths 검사는 pack 을 읽는 옛 소비자(위 v1PackAxis)가 걷힐 때까지 v1 manifest 에서 온다.
 * manifest 의 기능·시작 구성이 config/modules 와 다르면(v1 을 고치고 다시 만들지 않음) 여기서 멈춘다. 그 밖의 선언은 v2 만 읽는다.
 * 생성물의 투영 manifest 가 pack 목록을 담는 동안은 카탈로그 해시도 manifest 에 결속한다.
 */
function v1PackOverlay(root, declarations) {
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  const axis = v1PackAxis(manifest);
  const regenerate = `npm run modules:generate 로 ${MODULES_DIRECTORY} 를 다시 만든다`;
  if (canonicalJson([...axis.packOf.keys()].sort()) !== canonicalJson(Object.keys(declarations.features).sort())) {
    fail(`v1 manifest appDomains differ from ${MODULES_DIRECTORY} (${regenerate})`);
  }
  if (canonicalJson(Object.keys(manifest.profiles).sort()) !== canonicalJson(declarations.presets.map(preset => preset.id).sort())) {
    fail(`v1 manifest profiles differ from ${MODULES_DIRECTORY}/presets.json (${regenerate})`);
  }
  for (const preset of declarations.presets) {
    const domains = sorted(manifest.profiles[preset.id].packs.flatMap(pack => manifest.packs[pack]?.backend?.appDomains ?? []));
    if (canonicalJson(domains) !== canonicalJson(sorted(preset.domains))) fail(`v1 manifest profile domains differ from presets.json: ${preset.id} (${regenerate})`);
  }
  return { ...axis, provenance: { manifest: MANIFEST, manifestHash: compositionDigest(manifest) } };
}

/**
 * v1 선언(manifest + 이 파일·연동·사유 모듈의 상수)을 카탈로그 빌더의 기능 단위 정규형으로 모은다. 매니페스트 v2(config/modules,
 * composer-modules.mjs)도 같은 모양을 만든다 — 두 원천이 같은 카탈로그를 내는지를 임시 동치 계약이 본다(11단계 C1, 전환 C7 에서 걷는다).
 */
export function v1ComposerDeclarations(root = ROOT) {
  root = resolve(root);
  const manifest = JSON.parse(readFileSync(join(root, MANIFEST), 'utf8'));
  const packDomains = sorted(Object.values(manifest.packs).flatMap(pack => pack.backend?.appDomains ?? []));
  return {
    source: { label: 'manifest', ownerNoun: 'pack', domainsLabel: 'manifest appDomains', provenance: { manifest: MANIFEST, manifestHash: compositionDigest(manifest) } },
    features: FEATURES,
    groups: Object.entries(manifest.packs).map(([id, pack]) => ({ id, domains: pack.backend?.appDomains ?? [],
      tables: pack.database?.tables ?? [], sequences: pack.database?.sequences ?? [] })),
    frontendOnly: Object.entries(manifest.packs).flatMap(([id, pack]) => (pack.backend?.frontendOnlyDomains ?? []).map(domain => ({ domain, owner: id }))),
    supportFiles: () => domainSupportFiles(root, manifest),
    sharedTables: manifest.sharedTableContracts ?? [],
    bundleEdges: packDomains.flatMap(domain => clusterRequirements(manifest, domain).map(({ domain: to, cluster }) =>
      ({ from: domain, to, reason: cluster.reason, evidence: `${MANIFEST}#clusters/${cluster.id}` }))),
    sharedUi: SHARED_UI, uiDependencies: UI_DEPENDENCIES, jointFrontend: JOINT_FRONTEND,
    requiredForeignKeys: REQUIRED_FOREIGN_KEYS, optionalForeignKeys: OPTIONAL_FOREIGN_KEYS,
    userReasons: REQUIRES_USER_REASONS,
    presets: Object.entries(manifest.profiles).map(([id, profile]) => ({ id, domains: profile.packs.flatMap(pack => manifest.packs[pack].backend?.appDomains ?? []) })),
    integrates: INTEGRATES, registrationOnlyEvents: REGISTRATION_ONLY_EVENTS, registrationOnlyContributions: REGISTRATION_ONLY_CONTRIBUTIONS,
    registrationOnlyPorts: REGISTRATION_ONLY_PORTS,
    legacy: v1PackAxis(manifest),
  };
}

/**
 * Read-only producer inventory. Does not contact a DB, execute Git or create output.
 * 선언은 매니페스트 v2(config/modules)에서 읽는다(11단계 C2). pack 을 읽는 옛 소비자가 걷힐 때까지(C5) pack 축만 v1 manifest 에서 덧붙인다.
 */
export function loadProjectComposerCatalog(root = ROOT) {
  root = resolve(root);
  const { declarations } = loadComposerModules(root);
  return buildProjectComposerCatalog(root, { ...declarations, legacy: v1PackOverlay(root, declarations) });
}

/**
 * 정규형 선언(v1ComposerDeclarations·loadComposerModules)과 저장소 사실(Java 소스·권한 원장·메뉴 스냅숏·화면 파일)로 카탈로그를 만든다.
 * 선언에서 계산할 수 있는 사실은 적지 않고 소스와 양방향으로 대조한다(설계서 9.1 R5).
 */
export function buildProjectComposerCatalog(root, declarations) {
  root = resolve(root);
  const { features, source } = declarations;
  const permissions = JSON.parse(readFileSync(join(root, PERMISSIONS), 'utf8'));
  for (const dependency of declarations.uiDependencies) {
    if (!readFileSync(join(root, dependency.evidence), 'utf8').includes(dependency.symbol)) fail(`declared UI dependency drifted: ${dependency.evidence}`);
  }
  const domainOwners = new Map();
  for (const group of declarations.groups) for (const domain of group.domains) {
    if (domainOwners.has(domain)) fail(`duplicate domain owner: ${domain}`);
    domainOwners.set(domain, group.id);
  }
  const domains = sorted(domainOwners.keys());
  if (canonicalJson(domains) !== canonicalJson(Object.keys(features).sort())) fail(`capability declarations differ from ${source.domainsLabel}`);
  // 프런트 전용 기능(DEC-OPS-273). Java·테이블·권한 도메인이 없어야 하고, 선언한 자리(pack·기능 파일)가 그 기능을 소유해야 한다.
  const frontendOnlyDomains = new Set();
  for (const { domain, owner } of declarations.frontendOnly) {
    if (domainOwners.get(domain) !== owner) fail(`frontend-only capability is not an appDomain of its ${source.ownerNoun}: ${domain}`);
    frontendOnlyDomains.add(domain);
  }
  const tableOwners = new Map();
  const sequenceOwners = new Map();
  for (const group of declarations.groups) {
    for (const [kind, values, owners] of [['table', group.tables, tableOwners], ['sequence', group.sequences, sequenceOwners]]) {
      for (const value of values) { if (owners.has(value)) fail(`duplicate ${kind} owner: ${value}`); owners.set(value, group.id); }
    }
  }
  const coreGroup = declarations.groups.find(group => group.id === 'core');
  if (!coreGroup || coreGroup.domains.length) fail('core declarations must exist and own no selectable capability');
  const inventory = new Map(domains.map(domain => [domain, { files: [], tables: [], sequences: [], edges: [] }]));
  const sourceFingerprints = declarations.uiDependencies.map(({ evidence }) => ({ path: evidence,
    sha256: compositionDigest(readFileSync(join(root, evidence), 'utf8').replace(/\r\n/g, '\n')) }));
  const supportRequirements = new Map();
  const supportFiles = declarations.supportFiles();
  for (const [domain, files] of supportFiles) for (const path of files) {
    inventory.get(domain).files.push(path);
    // 다른 도메인 디렉터리의 지원 파일은 그 도메인이 있어야 존재한다. 업무 앱 생산 소스의 지문은 아래 순회가 남긴다.
    const directoryDomain = supportFileDirectoryDomain(path);
    if (directoryDomain) {
      if (!inventory.has(directoryDomain)) fail(`support file directory domain is not selectable: ${path}`);
      const known = supportRequirements.get(domain) ?? [];
      if (!known.some(row => row.domain === directoryDomain)) supportRequirements.set(domain, [...known, { domain: directoryDomain, path }]);
    }
    if (!path.startsWith(`${APP_ROOT}/`)) sourceFingerprints.push({ path, sha256: compositionDigest(readFileSync(join(root, path), 'utf8').replace(/\r\n/g, '\n')) });
  }
  for (const absolute of walk(join(root, APP_ROOT)).filter(path => path.endsWith('.java'))) {
    const path = slash(relative(root, absolute));
    const domain = appSourceDomain(path);
    if (!inventory.has(domain)) fail(`unowned application source: ${path}`);
    const javaSource = readFileSync(absolute, 'utf8');
    const owner = inventory.get(domain);
    owner.files.push(path);
    sourceFingerprints.push({ path, sha256: compositionDigest(javaSource.replace(/\r\n/g, '\n')) });
    for (const match of javaSource.matchAll(/@Table\s*\(\s*name\s*=\s*"([^"]+)"/g)) owner.tables.push(match[1]);
    for (const match of javaSource.matchAll(/sequenceName\s*=\s*"([^"]+)"/g)) owner.sequences.push(match[1]);
    // Includes fully qualified field types (RewardManage), static and wildcard imports.
    for (const referenced of javaDomainReferences(javaSource)) {
      if (referenced !== domain && inventory.has(referenced)) owner.edges.push({ domain: referenced, evidence: path });
    }
  }
  // api-server 컨트롤러가 다른 기능 타입을 참조하는 결합도 간선이다(DEC-OPS-280). 업무 앱 순회만으로는 보이지 않는다.
  const selectable = new Set(inventory.keys());
  for (const absolute of walk(join(root, API_ROOT)).filter(path => path.endsWith('.java'))) {
    const path = slash(relative(root, absolute));
    const javaSource = readFileSync(absolute, 'utf8');
    const { owner, requires } = apiSourceRequirements(path, javaSource, selectable);
    if (!requires.length) continue;
    for (const required of requires) inventory.get(owner).edges.push({ domain: required, evidence: path });
    sourceFingerprints.push({ path, sha256: compositionDigest(javaSource.replace(/\r\n/g, '\n')) });
  }
  const sharedTables = declarations.sharedTables;
  for (const shared of sharedTables) for (const consumer of shared.consumers) {
    if (!inventory.has(consumer) || !tableOwners.has(shared.table)) fail(`invalid shared table consumer: ${shared.table}/${consumer}`);
    inventory.get(consumer).tables.push(shared.table);
  }
  const ownedTables = new Map();
  for (const [domain, data] of inventory) for (const table of sorted(data.tables)) {
    if (!tableOwners.has(table)) fail(`entity table absent from ${source.label}: ${domain}/${table}`);
    if (tableOwners.get(table) !== domainOwners.get(domain)
      && !sharedTables.some(shared => shared.table === table && shared.consumers.includes(domain))) fail(`cross-${source.ownerNoun} table lacks shared contract: ${domain}/${table}`);
    if (ownedTables.has(table) && !sharedTables.some(shared => shared.table === table
      && shared.consumers.includes(domain) && shared.consumers.includes(ownedTables.get(table)))) fail(`duplicate domain table without shared contract: ${table}`);
    ownedTables.set(table, domain);
  }
  for (const [table, owner] of tableOwners) if (owner !== 'core' && !ownedTables.has(table)) fail(`unowned optional table: ${table}`);
  for (const [sequence, owner] of sequenceOwners) if (owner !== 'core'
    && ![...inventory.values()].some(value => value.sequences.includes(sequence))) fail(`unowned optional sequence: ${sequence}`);

  const rules = frontendRules(declarations, domains);
  for (const rule of rules) if (!existsSync(join(root, 'frontend', rule.path))) fail(`frontend ownership path missing: ${rule.path}`);
  // 한 경로는 한 기능 집합만 소유한다. 같은 경로를 두 기능이 선언하면 한 기능만 고른 구성이 그 경로를 남기면서 동시에 지운다.
  // 접두 경로 안쪽 파일을 다른 기능이 소유하는 중첩(게시판 디렉터리 안의 커뮤니티 화면)은 경로가 달라 여기에 걸리지 않는다.
  const pathOwners = new Map();
  for (const rule of rules) {
    const owners = sorted(rule.domains).join('+');
    if (pathOwners.has(rule.path) && pathOwners.get(rule.path) !== owners) fail(`duplicate frontend path owner: ${rule.path} (${pathOwners.get(rule.path)}, ${owners})`);
    pathOwners.set(rule.path, owners);
  }
  declarations.legacy?.checkFrontendUmbrellas(root, rules);

  const contributions = slotContributionInventory(root, declarations);

  const declaredPermissionDomains = new Map();
  for (const domain of domains) for (const permissionDomain of features[domain].permissions) {
    if (declaredPermissionDomains.has(permissionDomain)) fail(`duplicate permission domain ownership: ${permissionDomain}`);
    if (!permissions.permissions.some(permission => permission.domain === permissionDomain)) fail(`unknown permission domain: ${permissionDomain}`);
    declaredPermissionDomains.set(permissionDomain, domain);
  }
  const allRoutes = Object.keys(permissions.pagePermissions).sort();
  for (const feature of Object.values(features)) for (const prefix of feature.routes) {
    if (!allRoutes.some(route => covers(prefix, route))) fail(`route declaration has no canonical page: ${prefix}`);
  }
  const routeOwners = new Map();
  for (const domain of domains) for (const route of allRoutes) {
    const feature = features[domain];
    if (feature.routes.some(prefix => (feature.exactRoutes ?? []).includes(prefix) ? route === prefix : covers(prefix, route))) {
      const previous = routeOwners.get(route);
      // Narrower paths override an umbrella (/admin/community vs its templates). 같은 길이면 정확히 그 화면만 선언한 쪽(exactRoutes)이
      // 접두 선언을 이긴다 — 게시판 디렉터리 안의 커뮤니티 탭 별칭(/admin/community/boards)이 그 예다(허브 분해 H2).
      const specificity = Math.max(...feature.routes.filter(prefix => covers(prefix, route))
        .map(prefix => prefix.length + ((feature.exactRoutes ?? []).includes(prefix) ? 0.5 : 0)));
      if (!previous || specificity > previous.specificity) routeOwners.set(route, { domain, specificity });
      else if (specificity === previous.specificity && previous.domain !== domain) fail(`ambiguous route owner: ${route}`);
    }
  }
  const sharedRoutes = new Map(declarations.sharedUi.flatMap(group => group.routes.map(route => [route, group.domains])));
  const mandatoryPermissions = permissions.permissions.filter(permission => !declaredPermissionDomains.has(permission.domain)).map(permission => permission.code).sort();
  const mandatoryRoutes = allRoutes.filter(route => !routeOwners.has(route) && !sharedRoutes.has(route));
  // 간선마다 사용자용 한 문장을 붙인다. 선언과 간선이 어긋나면 여기서 실패한다(설계서 9.1 R5).
  const capabilities = attachUserReasons(domains.map(domain => {
    const feature = features[domain];
    const data = inventory.get(domain);
    if (frontendOnlyDomains.has(domain)) {
      if (data.files.length) fail(`frontend-only capability has backend source: ${domain}`);
      if (data.tables.length || feature.permissions.length) fail(`frontend-only capability declares tables or permission domains: ${domain}`);
    } else if (!data.files.length) fail(`capability has no source: ${domain}`);
    const requires = [];
    for (const edge of data.edges) requires.push({ domain: edge.domain, kind: 'java', reason: `${domain} 소스가 ${edge.domain} 타입을 참조한다.`, evidence: edge.evidence });
    for (const support of supportRequirements.get(domain) ?? []) {
      requires.push({ domain: support.domain, kind: 'java', reason: `${domain} 이 쓰는 지원 구현이 ${support.domain} 소스에 있다.`, evidence: support.path });
    }
    for (const edge of declarations.bundleEdges.filter(row => row.from === domain)) {
      requires.push({ domain: edge.to, kind: 'manifest', reason: edge.reason, evidence: edge.evidence });
    }
    for (const cluster of declarations.sharedUi) if (cluster.domains.includes(domain)) {
      for (const required of cluster.domains.filter(item => item !== domain)) requires.push({ domain: required, kind: 'shared-ui', reason: cluster.reason, evidence: cluster.evidence, customOnly: true });
    }
    for (const dependency of declarations.uiDependencies.filter(row => row.from === domain)) {
      const { from, symbol, ...edge } = dependency;
      requires.push({ ...edge, kind: 'ui-import', customOnly: true });
    }
    return {
      // 카드 요약·영역 같은 화면 문구는 해시 밖의 표시 문구(project-composer-presentation.mjs)가 맡는다.
      id: domain, label: feature.label, available: true,
      ...(declarations.legacy ? { pack: declarations.legacy.packOf.get(domain) } : {}),
      requires: requires.sort((a, b) => canonicalJson(a) < canonicalJson(b) ? -1 : canonicalJson(a) > canonicalJson(b) ? 1 : 0),
      backend: { sourcePaths: ['domain', 'service'].map(layer => `${APP_ROOT}/${layer}/${domain}`).filter(path => existsSync(join(root, path))), sourceFiles: data.files.sort() },
      database: { tables: sorted(data.tables), explicitSequences: sorted(data.sequences) },
      frontend: { paths: feature.paths, routes: allRoutes.filter(route => routeOwners.get(route)?.domain === domain) },
      menuRoutes: allRoutes.filter(route => routeOwners.get(route)?.domain === domain),
      menuTabs: sorted(feature.menuTabs ?? []),
      permissionCodes: permissions.permissions.filter(permission => feature.permissions.includes(permission.domain)).map(permission => permission.code).sort(),
      requirements: feature.requirements ?? [],
    };
  }), declarations.userReasons);
  // 시작 구성은 이름 붙은 기능 목록이고 필수 의존 폐포에 닫혀 있어야 한다. 시작 구성도 직접 선택과 같은 간선을 따르므로(해석기 단일화,
  // 11단계 C2) 닫히지 않은 목록은 해석 중이 아니라 카탈로그 결함으로 거부한다.
  const closure = requiresClosure(capabilities);
  for (const preset of declarations.presets) for (const domain of preset.domains) {
    if (!Object.hasOwn(features, domain)) fail(`preset names an unknown capability: ${preset.id} (${domain})`);
    const missing = [...closure(domain)].filter(required => !preset.domains.includes(required)).sort();
    if (missing.length) fail(`preset is not closed under requires: ${preset.id} (${domain} -> ${missing.join(', ')})`);
  }
  // 탭 기여는 실제 메뉴 행과 셸 화면이 있어야 한다. 맞지 않는 선언은 아무 메뉴도 고르지 못한 채 조용히 남는다.
  const menuRows = JSON.parse(readFileSync(join(root, COMPOSER_MENU_SNAPSHOT_PATH), 'utf8')).menus
    .filter(row => row.use_yn === 'Y' && row.del_yn !== 'Y' && row.modern_route).map(row => menuRouteKey(row.modern_route).key);
  const tabContributors = new Map();
  for (const capability of capabilities) for (const route of capability.menuTabs) {
    const contribution = menuRouteKey(route);
    if (!contribution.tab || contribution.key !== route) fail(`menu tab must be a canonical path with one tab: ${route}`);
    if (!allRoutes.includes(contribution.path)) fail(`menu tab shell has no canonical page: ${route}`);
    if (!menuRows.includes(contribution.key)) fail(`menu tab has no active menu row: ${route}`);
    if (tabContributors.has(route)) fail(`menu tab has two contributors: ${route}`);
    tabContributors.set(route, capability.id);
  }
  for (const contract of [...declarations.requiredForeignKeys, ...declarations.optionalForeignKeys]) {
    if (!readFileSync(join(root, contract.evidence), 'utf8').includes(`ADD CONSTRAINT ${contract.name}`)) fail(`declared foreign key drifted: ${contract.name}`);
    const owns = (domain, table) => capabilities.find(capability => capability.id === domain)?.database.tables.includes(table);
    if (!owns(contract.sourceDomain, contract.childTable) || !owns(contract.targetDomain, contract.parentTable)) fail(`declared foreign key ownership drifted: ${contract.name}`);
  }
  const presets = declarations.presets.map(preset => ({ id: preset.id, domains: sorted(preset.domains),
    ...(declarations.legacy ? declarations.legacy.presets.get(preset.id) : {}) }));
  // 선택 연동: 발행·수신을 실제 소스에서 계산해 선언과 양방향으로 대조한다(설계서 9.1·B4).
  // 포트 연결도 같은 소유 판정으로 계산해 선언과 양방향으로 대조한다(11단계 C2). 네 모듈의 생산 Java 는 한 번만 읽는다.
  const supportOwners = new Map([...supportFiles].flatMap(([domain, files]) => files.map(file => [file, domain])));
  const ownerOf = sourceOwner(supportOwners, domains, closure);
  const javaFiles = javaSourceFiles(root);
  const integrates = resolveIntegrations({ root, declared: declarations.integrates, registrationOnly: declarations.registrationOnlyEvents,
    registrationOnlyContributions: declarations.registrationOnlyContributions,
    triples: deriveEventTriples(root, ownerOf, deriveEventSources(root, ownerOf, javaFiles)),
    ports: derivePortConnections(root, ownerOf, javaFiles), registrationOnlyPorts: declarations.registrationOnlyPorts,
    canDegrade: degradationPredicate(capabilities, presets), domains, optionalForeignKeys: declarations.optionalForeignKeys, contributions });
  const catalog = {
    schemaVersion: 1, mandatory: ['foundation', 'core'], databaseVendors: ['postgresql'], backendLayouts: ['multi-module', 'single-module'],
    provenance: { ...source.provenance, ...(declarations.legacy?.provenance ?? {}), permissions: PERMISSIONS, permissionsHash: compositionDigest(permissions), sourceInventoryHash: compositionDigest(sourceFingerprints) },
    presets, capabilities, frontendRules: rules, sharedUi: declarations.sharedUi, integrates,
    core: { tables: sorted(coreGroup.tables), explicitSequences: sorted(coreGroup.sequences), permissionCodes: mandatoryPermissions, menuRoutes: mandatoryRoutes },
    sharedTableContracts: sharedTables, optionalForeignKeys: declarations.optionalForeignKeys, requiredForeignKeys: declarations.requiredForeignKeys,
  };
  return { ...catalog, catalogHash: compositionDigest(catalog) };
}
