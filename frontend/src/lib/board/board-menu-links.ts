import { TAB_HUB as KNOWLEDGE_TAB_HUB } from '@/app/admin/help/knowledge-tabs';
import { knowledgeTabBoard, knowledgeTabsForBoard } from '@/app/admin/help/knowledge-tab-boards';
import { resolveMenuInternalRoute } from '@/lib/navigation/internal-route';
import {
  grantSets,
  menuPreviewKey,
  previewMenuVisibility,
  type MenuPreviewMenu,
} from '@/lib/navigation/menu-visibility-preview';

/**
 * 게시판과 메뉴의 연결, 메뉴가 어느 그룹에 보이는지, 공개 준비가 됐는지를 판정한다(ADR-0040 결정 8).
 *
 * 게시판 운영 화면의 메뉴·접근 탭과 게시판 관리 목록의 '메뉴 연결' 칸이 같은 판정을 쓴다. 순수 함수이고, 입력은 메뉴 원장
 * (메뉴 구조 응답 — 사용 안 함 메뉴 포함)과 그룹 스냅샷(권한 배정 응답)이다. 어느 하나를 읽을 권한이 없거나 조회에 실패하면
 * 그 사실을 그대로 돌려준다 — "연결 없음"·"모두에게 보임" 으로 추정하지 않는다.
 *
 * 연결 근거는 둘이다.
 *   · 게시판 주소: 메뉴 경로가 게시판 목록 화면(`/admin/community/boards/select-board-list`)이고 `bbsId` 가 이 게시판이다.
 *   · 허브 탭: 메뉴 경로가 지식 허브(TAB_HUB.routes)이고 `?tab=` 이 그리는 게시판이 이 게시판이다. 허브의 `?bbsId=` 진입은 그 값이
 *     허브 탭이 그리는 게시판일 때만 연결이다(허브가 그때만 그 탭을 연다). 탭 없는 허브 주소의 기본 탭은 화면이 정하므로 그런
 *     메뉴는 '확인 불가' 연결로 둔다.
 *
 * 노출은 사이드바와 같은 판정(previewMenuVisibility)을 그룹마다 부른다. 관리자 그룹(아래 두 코드)에만 보이면 "관리자 그룹만",
 * 그 밖의 그룹(사용자 정의 그룹 포함)에 하나라도 보이면 "일반 그룹 표시" 다. 이 구분은 화면 표시용 분류일 뿐 인가가 아니다(H3).
 */

/** 게시판 목록 화면 — 메뉴가 게시판 하나를 가리키는 주소. 마법사가 등록하는 메뉴 경로와 같다. */
export const BOARD_LIST_ROUTE = '/admin/community/boards/select-board-list';

/** 이 게시판을 가리킬 메뉴 경로(메뉴 관리에 새로 등록할 때 쓴다). */
export function boardMenuRoute(bbsId: string): string {
  return `${BOARD_LIST_ROUTE}?bbsId=${encodeURIComponent(bbsId)}`;
}

/** 관리자 그룹 코드(설계 §3.3). 표시 분류만 한다 — 화면 권한 판정에 쓰지 않는다. */
const ADMIN_GROUP_CODES: ReadonlySet<string> = new Set(['ROLE_ADMIN', 'ROLE_SYSTEM']);

export interface BoardMenuInput {
  menuNo: number;
  menuNm: string;
  upMenuSn: number | null;
  menuOrdr: number;
  modernRoute: string | null;
  useYn: string;
}

export interface BoardGroupInput {
  code: string;
  name: string;
  grants: readonly { type: string; code: string }[];
}

export type MenuSource =
  | { status: 'ready'; menus: readonly BoardMenuInput[] }
  | { status: 'no-permission' }
  | { status: 'failed' };

export type GroupSource =
  | { status: 'ready'; groups: readonly BoardGroupInput[] }
  | { status: 'no-permission' }
  | { status: 'failed' };

export type LinkBasis =
  | { kind: 'board-address' }
  | { kind: 'hub-tab'; tab: string }
  /** 탭 없는 허브 주소 — 기본 탭을 화면이 정하므로 이 게시판을 보이는지 확인할 수 없다. */
  | { kind: 'hub-default' };

export type MenuExposure =
  | { kind: 'inactive' }
  | { kind: 'hidden' }
  | { kind: 'admin-only'; groups: string[] }
  | { kind: 'general'; groups: string[] }
  | { kind: 'no-permission' }
  | { kind: 'unknown' };

export interface BoardMenuLink {
  menuNo: number;
  menuNm: string;
  /** 최상위부터 이 메뉴까지의 이름. */
  path: string[];
  route: string;
  basis: LinkBasis;
  exposure: MenuExposure;
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

function pathNames(menu: BoardMenuInput, byNo: ReadonlyMap<number, BoardMenuInput>): string[] {
  const names = [menu.menuNm];
  const seen = new Set([menu.menuNo]);
  let parent = menu.upMenuSn;
  while (parent !== null && parent !== 0 && !seen.has(parent)) {
    const next = byNo.get(parent);
    if (!next) break;
    names.unshift(next.menuNm);
    seen.add(parent);
    parent = next.upMenuSn;
  }
  return names;
}

/** 그룹마다 사이드바 판정을 한 번씩 계산해 둔다. */
function groupVisibility(menus: readonly BoardMenuInput[], groups: readonly BoardGroupInput[]) {
  const previewMenus: MenuPreviewMenu[] = menus.map((menu) => ({ ...menu }));
  return groups.map((group) => {
    const sets = grantSets(group.grants);
    return {
      group,
      byMenu: previewMenuVisibility({ menus: previewMenus, navigation: sets.navigation, operations: sets.operations }).byMenu,
    };
  });
}

function exposureOf(menu: BoardMenuInput, groupSource: GroupSource,
  visibility: ReturnType<typeof groupVisibility> | null): MenuExposure {
  if (menu.useYn !== 'Y') return { kind: 'inactive' };
  if (groupSource.status === 'no-permission') return { kind: 'no-permission' };
  if (groupSource.status === 'failed' || visibility === null) return { kind: 'unknown' };
  const key = menuPreviewKey(menu.menuNo);
  const visibleTo = visibility.filter(({ byMenu }) => byMenu.get(key)?.visible === true).map(({ group }) => group);
  if (visibleTo.length === 0) return { kind: 'hidden' };
  const names = visibleTo.map((group) => group.name || group.code);
  return visibleTo.every((group) => ADMIN_GROUP_CODES.has(group.code))
    ? { kind: 'admin-only', groups: names }
    : { kind: 'general', groups: names };
}

/** 이 게시판을 가리키는 메뉴(사용 안 함 메뉴 포함)와 각 메뉴의 노출. 메뉴 원장을 읽지 못하면 그 사실만 돌려준다. */
export function findBoardMenuLinks(bbsId: string, menuSource: MenuSource, groupSource: GroupSource,
  boardName?: string | null): BoardMenuLinks {
  if (menuSource.status === 'no-permission') return { status: 'no-permission' };
  if (menuSource.status === 'failed') return { status: 'unknown' };
  const byNo = new Map(menuSource.menus.map((menu) => [menu.menuNo, menu] as const));
  let visibility: ReturnType<typeof groupVisibility> | null = null;
  const links: BoardMenuLink[] = [];
  for (const menu of menuSource.menus) {
    const route = resolveMenuInternalRoute({ modernRoute: menu.modernRoute });
    if (!route) continue;
    const basis = linkBasis(bbsId, route);
    if (!basis) continue;
    if (visibility === null && groupSource.status === 'ready') visibility = groupVisibility(menuSource.menus, groupSource.groups);
    links.push({
      menuNo: menu.menuNo,
      menuNm: menu.menuNm,
      path: pathNames(menu, byNo),
      route,
      basis,
      exposure: exposureOf(menu, groupSource, visibility),
      nameDiffers: !!boardName && menu.menuNm.trim() !== boardName.trim(),
    });
  }
  return { status: 'ready', links };
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

  let menuState: CheckState;
  if (input.links.status !== 'ready') menuState = 'unknown';
  else {
    const certain = input.links.links.filter((link) => link.basis.kind !== 'hub-default');
    if (certain.some((link) => link.exposure.kind === 'general')) menuState = 'pass';
    else if (certain.some((link) => link.exposure.kind === 'no-permission' || link.exposure.kind === 'unknown')
      || input.links.links.some((link) => link.basis.kind === 'hub-default' && link.exposure.kind !== 'inactive')) {
      menuState = 'unknown';
    } else menuState = 'fail';
  }
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
