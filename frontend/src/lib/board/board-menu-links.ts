import { TAB_HUB as KNOWLEDGE_TAB_HUB } from '@/app/admin/help/knowledge-tabs';
import { knowledgeTabBoard, knowledgeTabsForBoard } from '@/app/admin/help/knowledge-tab-boards';
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
 * 게시판과 메뉴의 연결, 메뉴가 어느 그룹에 보이는지, 공개 준비가 됐는지를 판정한다(ADR-0040 결정 8).
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

/** 게시판 목록 화면 — 메뉴가 게시판 하나를 가리키는 주소. 마법사가 등록하는 메뉴 경로와 같다. */
export const BOARD_LIST_ROUTE = '/admin/community/boards/select-board-list';

/** 이 게시판을 가리킬 메뉴 경로(메뉴 관리에 새로 등록할 때 쓴다). */
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

export type CheckState = 'pass' | 'fail' | 'unknown' | 'not-applicable';

export interface ReadinessCheck {
  id: 'board-in-use' | 'general-menu' | 'edit-permission';
  state: CheckState;
  /** 편집 권한 확인에서 어느 그룹에도 배정되지 않은 권한 코드. */
  missing?: string[];
}

export interface PublicationReadiness {
  state: 'pass' | 'fail' | 'unknown';
  checks: ReadinessCheck[];
}

/** 지정 용도마다 필요한 편집 권한(공지·FAQ 지정 게시판은 그 편집 권한이 있어야 글을 쓴다). */
const DESIGNATION_EDIT_PERMISSIONS: Readonly<Record<string, string>> = {
  NOTICE: 'NOTICE_EDIT',
  FAQ: 'FAQ_EDIT',
};

/**
 * 공개 준비 점검 — 게시판 사용 중 ∧ 일반 그룹에 보이는 활성 메뉴가 있음 ∧ (공지·FAQ 지정이면 그 편집 권한이 어느 그룹엔가
 * 배정됨). 셋을 모두 통과해야 통과다. 하나라도 실패면 실패, 실패는 없고 확인하지 못한 항목이 있으면 확인 불가다.
 */
export function publicationReadiness(input: {
  boardInUse: boolean;
  links: BoardMenuLinks;
  groupSource: GroupSource;
  designations: readonly string[];
}): PublicationReadiness {
  const checks: ReadinessCheck[] = [];
  checks.push({ id: 'board-in-use', state: input.boardInUse ? 'pass' : 'fail' });

  // 탭 없는 허브 주소는 연결 자체가 확인되지 않으므로 통과 근거가 아니다(사용 안 함이 아니면 확인 불가).
  const menuState: CheckState = generalMenuState(input.links, (link) => link.basis.kind === 'hub-default');
  checks.push({ id: 'general-menu', state: menuState });

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

  const states = checks.map((check) => check.state);
  const state = states.includes('fail') ? 'fail' : states.includes('unknown') ? 'unknown' : 'pass';
  return { state, checks };
}
