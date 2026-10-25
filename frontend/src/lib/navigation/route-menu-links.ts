import { resolveMenuInternalRoute } from '@/lib/navigation/internal-route';
import {
  grantSets,
  menuPreviewKey,
  previewMenuVisibility,
  type MenuPreviewMenu,
} from '@/lib/navigation/menu-visibility-preview';

/**
 * 어떤 화면 주소를 가리키는 메뉴를 찾고, 그 메뉴가 어느 그룹의 사이드바에 보이는지 판정한다(ADR-0040 결정 8 의 판정을 공용화,
 * ADR-0042).
 *
 * 게시판 운영 화면(게시판 주소·허브 탭)과 콘텐츠 페이지 관리(`/pages/<주소>`)가 같은 판정을 쓴다. 기능마다 다른 것은 "이 메뉴
 * 경로가 내 화면인가" 하나라서, 그 판정만 `match` 로 받는다. 이 모듈은 게시판·도움말·콘텐츠 페이지 코드를 import 하지 않는다 —
 * 그 기능을 뺀 생성물에서도 그대로 컴파일돼야 한다(config/modules 의 기능 소유 경계).
 *
 * 순수 함수이고, 입력은 메뉴 원장(메뉴 구조 응답 — 사용 안 함 메뉴 포함)과 그룹 스냅샷(권한 배정 응답)이다. 어느 하나를 읽을
 * 권한이 없거나 조회에 실패하면 그 사실을 그대로 돌려준다 — "연결 없음"·"모두에게 보임" 으로 추정하지 않는다.
 *
 * 노출은 사이드바와 같은 판정(previewMenuVisibility)을 그룹마다 부른다. 관리자 그룹(ADMIN_GROUP_CODES)에만 보이면 "관리자
 * 그룹만", 그 밖의 그룹(사용자 정의 그룹 포함)에 하나라도 보이면 "일반 그룹 표시" 다. 이 구분은 화면 표시용 분류일 뿐 인가가
 * 아니다(H3).
 */

/** 관리자 그룹 코드(게시판 설계 §3.3). 표시 분류만 한다 — 화면 권한 판정에 쓰지 않는다. */
export const ADMIN_GROUP_CODES: ReadonlySet<string> = new Set(['ROLE_ADMIN', 'ROLE_SYSTEM']);

/** 메뉴 경로의 pathname 을 읽을 때 쓰는 기준 주소 — 결과의 origin 은 쓰지 않는다. */
const ROUTE_BASE = 'https://egov.invalid';

export interface MenuLinkMenuInput {
  menuNo: number;
  menuNm: string;
  upMenuSn: number | null;
  menuOrdr: number;
  modernRoute: string | null;
  useYn: string;
}

export interface MenuLinkGroupInput {
  code: string;
  name: string;
  grants: readonly { type: string; code: string }[];
}

export type MenuSource =
  | { status: 'ready'; menus: readonly MenuLinkMenuInput[] }
  | { status: 'no-permission' }
  | { status: 'failed' };

export type GroupSource =
  | { status: 'ready'; groups: readonly MenuLinkGroupInput[] }
  | { status: 'no-permission' }
  | { status: 'failed' };

export type MenuExposure =
  | { kind: 'inactive' }
  | { kind: 'hidden' }
  | { kind: 'admin-only'; groups: string[] }
  | { kind: 'general'; groups: string[] }
  | { kind: 'no-permission' }
  | { kind: 'unknown' };

export interface RouteMenuLink<B> {
  menuNo: number;
  menuNm: string;
  /** 최상위부터 이 메뉴까지의 이름. */
  path: string[];
  route: string;
  /** 이 메뉴를 연결로 본 근거(기능마다 다르다). */
  basis: B;
  exposure: MenuExposure;
}

export type RouteMenuLinks<B> =
  | { status: 'no-permission' }
  | { status: 'unknown' }
  | { status: 'ready'; links: RouteMenuLink<B>[] };

/**
 * 메뉴 경로의 pathname — 쿼리·해시를 떼고 끝의 `/` 를 지운다(`/pages/a/` 와 `/pages/a` 는 같은 화면이다). 비교만 하고 이 값으로
 * 이동하지 않는다. 경로는 resolveMenuInternalRoute 를 거친 값이어야 한다.
 */
export function routePathname(route: string): string {
  return new URL(route, ROUTE_BASE).pathname.replace(/\/+$/, '') || '/';
}

function pathNames(menu: MenuLinkMenuInput, byNo: ReadonlyMap<number, MenuLinkMenuInput>): string[] {
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
function groupVisibility(menus: readonly MenuLinkMenuInput[], groups: readonly MenuLinkGroupInput[]) {
  const previewMenus: MenuPreviewMenu[] = menus.map((menu) => ({ ...menu }));
  return groups.map((group) => {
    const sets = grantSets(group.grants);
    return {
      group,
      byMenu: previewMenuVisibility({ menus: previewMenus, navigation: sets.navigation, operations: sets.operations }).byMenu,
    };
  });
}

function exposureOf(menu: MenuLinkMenuInput, groupSource: GroupSource,
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

/**
 * `match` 가 근거를 돌려주는 메뉴(사용 안 함 메뉴 포함)와 각 메뉴의 노출. `match` 는 resolveMenuInternalRoute 를 통과한 경로만
 * 받는다 — 이동할 수 없는 경로(`#`·외부 주소 등)는 연결이 아니다. 메뉴 원장을 읽지 못하면 그 사실만 돌려준다.
 */
export function findRouteMenuLinks<B>(menuSource: MenuSource, groupSource: GroupSource,
  match: (route: string) => B | null): RouteMenuLinks<B> {
  if (menuSource.status === 'no-permission') return { status: 'no-permission' };
  if (menuSource.status === 'failed') return { status: 'unknown' };
  const byNo = new Map(menuSource.menus.map((menu) => [menu.menuNo, menu] as const));
  let visibility: ReturnType<typeof groupVisibility> | null = null;
  const links: RouteMenuLink<B>[] = [];
  for (const menu of menuSource.menus) {
    const route = resolveMenuInternalRoute({ modernRoute: menu.modernRoute });
    if (!route) continue;
    const basis = match(route);
    if (basis === null) continue;
    if (visibility === null && groupSource.status === 'ready') visibility = groupVisibility(menuSource.menus, groupSource.groups);
    links.push({
      menuNo: menu.menuNo,
      menuNm: menu.menuNm,
      path: pathNames(menu, byNo),
      route,
      basis,
      exposure: exposureOf(menu, groupSource, visibility),
    });
  }
  return { status: 'ready', links };
}

/**
 * 일반 그룹에 보이는 활성 메뉴가 있는가 — 공개 준비 점검의 메뉴 항목.
 *   · 활성이고 관리자 그룹 밖의 그룹에 보이는 연결이 있으면 'pass'.
 *   · 그렇지 않은데 노출을 판정하지 못한 연결(그룹 확인 권한 없음·조회 실패)이 있거나, 메뉴 원장 자체를 읽지 못했으면 'unknown'.
 *   · 그 밖(연결 없음·사용 안 함·숨김·관리자 그룹만)은 'fail'.
 * `uncertain` 은 연결 자체가 확인되지 않은 근거(예: 탭 없는 허브 주소)를 고른다 — 그런 연결은 노출이 일반이어도 통과 근거가
 * 아니고, 사용 안 함이 아니면 'unknown' 이다. 메뉴 원장 결과(RouteMenuLinks)나 연결 목록을 그대로 받는다.
 */
export function generalMenuState<B>(links: RouteMenuLinks<B> | readonly RouteMenuLink<B>[],
  uncertain: (link: RouteMenuLink<B>) => boolean = () => false): 'pass' | 'fail' | 'unknown' {
  let list: readonly RouteMenuLink<B>[];
  if ('status' in links) {
    if (links.status !== 'ready') return 'unknown';
    list = links.links;
  } else list = links;
  const certain = list.filter((link) => !uncertain(link));
  if (certain.some((link) => link.exposure.kind === 'general')) return 'pass';
  if (certain.some((link) => link.exposure.kind === 'no-permission' || link.exposure.kind === 'unknown')
    || list.some((link) => uncertain(link) && link.exposure.kind !== 'inactive')) return 'unknown';
  return 'fail';
}
