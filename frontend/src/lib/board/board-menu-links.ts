import { TAB_HUB as KNOWLEDGE_TAB_HUB } from '@/app/admin/help/knowledge-tabs';
import {
  KNOWLEDGE_CONTRIBUTED_TAB_BOARDS,
  knowledgeTabBoard,
  knowledgeTabsForBoard,
} from '@/app/admin/help/knowledge-tab-boards';
import {
  findRouteMenuLinks,
  generalMenuState,
  type GroupSource,
  type MenuLinkGroupInput,
  type MenuLinkMenuInput,
  type MenuSource,
  type RouteMenuLink,
} from '@/lib/navigation/route-menu-links';

/**
 * 게시판과 메뉴의 연결, 메뉴가 어느 그룹에 보이는지, 공개 준비가 됐는지를 판정한다(ADR-0040 결정 8, 공개 준비 기준은 ADR-0043
 * 결정 3 — 사용 중 + 이용자가 찾는 길 하나 이상).
 *
 * 게시판 운영 화면의 메뉴·접근 탭과 게시판 관리 목록의 '메뉴 연결' 칸이 같은 판정을 쓴다. 메뉴 원장·그룹 스냅샷을 읽는 방식,
 * 메뉴 경로 이름, 그룹별 노출 분류와 일반 그룹 판정은 공용 판정(@/lib/navigation/route-menu-links — ADR-0042 에서 콘텐츠 페이지와
 * 함께 쓰려고 옮겼다)이 하고, 이 모듈은 "이 메뉴가 이 게시판을 여는가" 와 게시판 고유 점검만 한다. 어느 원천을 읽을 권한이 없거나
 * 조회에 실패하면 그 사실을 그대로 돌려준다 — "연결 없음"·"모두에게 보임" 으로 추정하지 않는다.
 *
 * 연결 근거는 둘이다.
 *   · 게시판 주소: 메뉴 경로가 게시판 목록 화면(`/admin/community/boards/select-board-list`)이고 `bbsId` 가 이 게시판이다.
 *   · 허브 탭: 메뉴 경로가 지식 허브(TAB_HUB.routes)이고 `?tab=` 이 그리는 게시판이 이 게시판이다. 허브의 `?bbsId=` 진입은 그 값이
 *     허브 탭이 그리는 게시판일 때만 연결이다(허브가 그때만 그 탭을 연다). 탭 없는 허브 주소의 기본 탭은 화면이 정하므로 그런
 *     메뉴는 '확인 불가' 연결로 둔다.
 */

export type {
  GroupSource,
  MenuExposure,
  MenuSource,
} from '@/lib/navigation/route-menu-links';

/** 게시판 목록 화면 — 메뉴가 게시판 하나를 가리키는 주소. '메뉴에 붙이기' 가 메뉴 관리에 넘기는 경로와 같다(ADR-0043 결정 1). */
export const BOARD_LIST_ROUTE = '/admin/community/boards/select-board-list';

/** 이 게시판을 가리킬 메뉴 경로(메뉴 관리에 새로 등록할 때·'메뉴에 붙이기' 인계에 쓴다). */
export function boardMenuRoute(bbsId: string): string {
  return `${BOARD_LIST_ROUTE}?bbsId=${encodeURIComponent(bbsId)}`;
}

/** 메뉴 원장 행(공용 판정의 입력과 같다). */
export type BoardMenuInput = MenuLinkMenuInput;

/** 그룹 스냅샷 행(공용 판정의 입력과 같다). */
export type BoardGroupInput = MenuLinkGroupInput;

export type LinkBasis =
  | { kind: 'board-address' }
  | { kind: 'hub-tab'; tab: string }
  /** 탭 없는 허브 주소 — 기본 탭을 화면이 정하므로 이 게시판을 보이는지 확인할 수 없다. */
  | { kind: 'hub-default' };

export interface BoardMenuLink extends RouteMenuLink<LinkBasis> {
  /** 메뉴 이름이 게시판 이름과 다른가(예: 위키 메뉴가 일정 게시판을 연다). 게시판 이름을 모르면 false. */
  nameDiffers: boolean;
}

export type BoardMenuLinks =
  | { status: 'no-permission' }
  | { status: 'unknown' }
  | { status: 'ready'; links: BoardMenuLink[] };

function linkBasis(bbsId: string, route: string): LinkBasis | null {
  const url = new URL(route, 'https://egov.invalid');
  const path = url.pathname.replace(/\/+$/, '') || '/';
  if (path === BOARD_LIST_ROUTE) return url.searchParams.get('bbsId') === bbsId ? { kind: 'board-address' } : null;
  if (!(KNOWLEDGE_TAB_HUB.routes as readonly string[]).includes(path)) return null;
  // 허브는 ?bbsId= 가 탭이 그리는 게시판일 때만 그 탭을 연다(?tab= 보다 먼저) — 그때만 그 탭으로 연결이다.
  const entryBoard = url.searchParams.get('bbsId');
  const entryTabs = knowledgeTabsForBoard(entryBoard);
  if (entryTabs.length > 0) return entryBoard === bbsId ? { kind: 'hub-tab', tab: entryTabs[0] } : null;
  const tab = url.searchParams.get('tab');
  if (tab === null || tab === '') return knowledgeTabsForBoard(bbsId).length > 0 ? { kind: 'hub-default' } : null;
  return knowledgeTabBoard(tab) === bbsId ? { kind: 'hub-tab', tab: tab.toUpperCase() } : null;
}

/** 이 게시판을 가리키는 메뉴(사용 안 함 메뉴 포함)와 각 메뉴의 노출. 메뉴 원장을 읽지 못하면 그 사실만 돌려준다. */
export function findBoardMenuLinks(bbsId: string, menuSource: MenuSource, groupSource: GroupSource,
  boardName?: string | null): BoardMenuLinks {
  const found = findRouteMenuLinks(menuSource, groupSource, (route) => linkBasis(bbsId, route));
  if (found.status !== 'ready') return found;
  return {
    status: 'ready',
    links: found.links.map((link) => ({
      ...link,
      nameDiffers: !!boardName && link.menuNm.trim() !== boardName.trim(),
    })),
  };
}

/**
 * 게시판 관리 목록·운영 화면 머리의 메뉴 상태 요약(ADR-0043, G4·G5). 상세 나열(메뉴 위치·근거·노출)은 그 아래 그대로 둔다.
 *   · no-permission: 메뉴 원장을 볼 권한이 없다.  · unknown: 메뉴 원장을 불러오지 못했거나, 일반 그룹 표시는 없는데 노출을
 *     판정하지 못한 연결(그룹 확인 권한 없음·조회 실패·탭 없는 허브 주소)이 있다.
 *   · none: 연결된 메뉴가 없다.  · general: 일반 그룹에 보이는 활성 메뉴가 count 개다.
 *   · admin-only: 활성 메뉴가 관리자 그룹에만 보인다.  · hidden: 활성 메뉴가 어느 그룹에도 보이지 않는다.
 *   · inactive: 연결된 메뉴가 모두 비활성이다.
 * 일반 그룹 판정은 공개 준비 점검의 메뉴 판정(generalMenuState)과 같다 — 탭 없는 허브 주소는 통과 근거가 아니다.
 */
export type BoardMenuSummary =
  | { kind: 'no-permission' }
  | { kind: 'unknown' }
  | { kind: 'none' }
  | { kind: 'general'; count: number }
  | { kind: 'admin-only' }
  | { kind: 'hidden' }
  | { kind: 'inactive' };

export type BoardMenuSummaryKind = BoardMenuSummary['kind'];

/** 탭 없는 허브 주소 — 연결 자체가 확인되지 않으므로 일반 그룹 표시의 근거가 아니다. */
const isUncertainLink = (link: RouteMenuLink<LinkBasis>) => link.basis.kind === 'hub-default';

export function summarizeBoardMenuLinks(links: BoardMenuLinks): BoardMenuSummary {
  if (links.status === 'no-permission') return { kind: 'no-permission' };
  if (links.status === 'unknown') return { kind: 'unknown' };
  if (links.links.length === 0) return { kind: 'none' };
  const certain = links.links.filter((link) => !isUncertainLink(link));
  const general = certain.filter((link) => link.exposure.kind === 'general').length;
  if (general > 0) return { kind: 'general', count: general };
  const state = generalMenuState(links, isUncertainLink);
  if (state === 'unknown') return { kind: 'unknown' };
  if (certain.some((link) => link.exposure.kind === 'admin-only')) return { kind: 'admin-only' };
  if (links.links.some((link) => link.exposure.kind === 'hidden')) return { kind: 'hidden' };
  return { kind: 'inactive' };
}

/**
 * 게시판이 귀속된 커뮤니티(서버 응답의 community — ADR-0043 결정 3). 이름·이용 가능 여부를 모르면(커뮤니티 기능이 없거나 찾지
 * 못함) null 이다. inUse 는 이용자가 커뮤니티 화면을 열 수 있는지(사용 중이고 정식 등록)다.
 */
export interface BoardCommunityInput {
  cmntySn: number;
  cmntyNm: string | null;
  inUse: boolean | null;
}

/** 업무 홈 카드를 그리는 지정 용도(서버 설정 nuri.boards.notice-id·task-id). */
export const HOME_CARD_DESIGNATIONS = ['NOTICE', 'TASK'] as const;
export type HomeCardDesignation = (typeof HOME_CARD_DESIGNATIONS)[number];

/**
 * 이용자가 이 게시판에 닿는 길(ADR-0043 결정 3, NAV-07). 메뉴는 접근을 막지 않으므로(ADR-0040 §3.1) 사용 중인 게시판은 메뉴가
 * 없어도 아래 길로 열린다. 화면이 '이용자가 이미 닿는 길' 칸과 공개 준비 점검에 같은 값을 쓴다.
 *  · hubTabs: 지식 허브가 늘 두는 탭(위키·자주 묻는 질문·질의응답)이 이 게시판을 그린다 — 허브와 같은 대응표(knowledge-tab-boards).
 *  · contributedHubTabs: 그 기능을 넣은 구성에만 있는 허브 탭(커뮤니티). 구성을 모르므로 찾는 길로 세지 않고 조건을 붙여 보인다.
 *  · homeCards: 업무 홈 카드 — 서버가 알려 준 지정 용도(공지·업무).
 *  · community: 귀속 커뮤니티의 화면(귀속이 없으면 null).
 *  · search: 통합 검색에 이 게시판의 글이 나오는가 — 사용 중이고 커뮤니티 귀속이 아닐 때다(찾는 길로 세지 않고 보이기만 한다).
 *  · generalMenu: 일반 그룹에 보이는 활성 메뉴 판정(generalMenuState).
 */
export interface BoardEntryPaths {
  hubTabs: string[];
  contributedHubTabs: string[];
  homeCards: HomeCardDesignation[];
  community: BoardCommunityInput | null;
  search: boolean;
  generalMenu: 'pass' | 'fail' | 'unknown';
}

export function boardEntryPaths(input: {
  bbsId: string;
  boardInUse: boolean;
  designations: readonly string[];
  community: BoardCommunityInput | null;
  links: BoardMenuLinks;
}): BoardEntryPaths {
  const tabs = knowledgeTabsForBoard(input.bbsId);
  return {
    hubTabs: tabs.filter((tab) => !(tab in KNOWLEDGE_CONTRIBUTED_TAB_BOARDS)),
    contributedHubTabs: tabs.filter((tab) => tab in KNOWLEDGE_CONTRIBUTED_TAB_BOARDS),
    homeCards: HOME_CARD_DESIGNATIONS.filter((designation) => input.designations.includes(designation)),
    community: input.community,
    search: input.boardInUse && input.community === null,
    generalMenu: generalMenuState(input.links, isUncertainLink),
  };
}

export type CheckState = 'pass' | 'fail' | 'unknown' | 'not-applicable';

export interface ReadinessCheck {
  id: 'board-in-use' | 'entry-path' | 'edit-permission';
  state: CheckState;
  /** 편집 권한 확인에서 어느 그룹에도 배정되지 않은 권한 코드. */
  missing?: string[];
}

/**
 * 통과를 막지는 않지만 알려야 할 사실.
 *  · community-general-menu: 커뮤니티 귀속 게시판인데 일반 그룹에 보이는 메뉴가 있다 — 회원이 아닌 사용자는 그 메뉴로 들어와
 *    거부된다(입구는 커뮤니티 화면이다).
 *  · closed-board-general-menu: 사용 안 함 게시판인데 일반 그룹에 보이는 활성 메뉴가 있다 — 이용자는 열리지 않는 메뉴를 본다.
 */
export type ReadinessWarning = 'community-general-menu' | 'closed-board-general-menu';

export interface PublicationReadiness {
  state: 'pass' | 'fail' | 'unknown';
  checks: ReadinessCheck[];
  paths: BoardEntryPaths;
  warnings: ReadinessWarning[];
}

/** 지정 용도마다 필요한 편집 권한(공지·FAQ 지정 게시판은 그 편집 권한이 있어야 글을 쓴다). */
const DESIGNATION_EDIT_PERMISSIONS: Readonly<Record<string, string>> = {
  NOTICE: 'NOTICE_EDIT',
  FAQ: 'FAQ_EDIT',
};

/**
 * 이용자가 찾는 길 판정(ADR-0043 결정 3).
 *  · 귀속 게시판: 입구는 커뮤니티 화면 하나다 — 커뮤니티가 이용 가능하면 통과, 사용 중지면 실패(입구가 없다), 모르면 확인 불가.
 *    일반 그룹 메뉴가 있어도 비회원은 거부되므로 통과 근거가 아니다(경고만 한다).
 *  · 귀속이 아닌 게시판: 지식 허브 탭·업무 홈 카드가 있거나 일반 그룹에 보이는 활성 메뉴가 있으면 통과다. 없으면 메뉴 판정을
 *    따른다 — 관리자 그룹에만 보이는 메뉴는 세지 않고(실패), 메뉴·그룹을 판정하지 못했으면 확인 불가다(통과로 추정하지 않는다).
 */
function entryPathState(paths: BoardEntryPaths): CheckState {
  if (paths.community !== null) {
    if (paths.community.inUse === true) return 'pass';
    if (paths.community.inUse === false) return 'fail';
    return 'unknown';
  }
  if (paths.hubTabs.length > 0 || paths.homeCards.length > 0) return 'pass';
  return paths.generalMenu;
}

/**
 * 공개 준비 점검(ADR-0043 결정 3 — ADR-0040 결정 8 의 '일반 그룹 메뉴 필수' 를 대체한다) — 게시판 사용 중 ∧ 이용자가 찾는 길이
 * 하나 이상 ∧ (공지·FAQ 지정이면 그 편집 권한이 어느 그룹엔가 배정됨). 셋을 모두 통과해야 통과다. 하나라도 실패면 실패, 실패는
 * 없고 확인하지 못한 항목이 있으면 확인 불가다. 이용자용 게시판 목록(디렉터리)은 메뉴 데이터 승인 뒤(2차) 찾는 길에 더한다.
 */
export function publicationReadiness(input: {
  bbsId: string;
  boardInUse: boolean;
  links: BoardMenuLinks;
  groupSource: GroupSource;
  designations: readonly string[];
  community: BoardCommunityInput | null;
}): PublicationReadiness {
  const paths = boardEntryPaths(input);
  const checks: ReadinessCheck[] = [];
  checks.push({ id: 'board-in-use', state: input.boardInUse ? 'pass' : 'fail' });
  checks.push({ id: 'entry-path', state: entryPathState(paths) });

  const needed = [...new Set(input.designations.map((designation) => DESIGNATION_EDIT_PERMISSIONS[designation])
    .filter((code): code is string => !!code))];
  if (needed.length === 0) checks.push({ id: 'edit-permission', state: 'not-applicable' });
  else if (input.groupSource.status !== 'ready') checks.push({ id: 'edit-permission', state: 'unknown' });
  else {
    const granted = new Set(input.groupSource.groups.flatMap((group) => group.grants
      .filter((grant) => grant.type === 'OPERATION').map((grant) => grant.code)));
    const missing = needed.filter((code) => !granted.has(code));
    checks.push({ id: 'edit-permission', state: missing.length === 0 ? 'pass' : 'fail', ...(missing.length > 0 ? { missing } : {}) });
  }

  const warnings: ReadinessWarning[] = [];
  const hasGeneralMenu = paths.generalMenu === 'pass';
  if (hasGeneralMenu && paths.community !== null) warnings.push('community-general-menu');
  if (hasGeneralMenu && !input.boardInUse) warnings.push('closed-board-general-menu');

  const states = checks.map((check) => check.state);
  const state = states.includes('fail') ? 'fail' : states.includes('unknown') ? 'unknown' : 'pass';
  return { state, checks, paths, warnings };
}
