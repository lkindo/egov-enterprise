import { canOpenPage } from '@/lib/auth/page-access';
import { registeredPageEntry } from '@/lib/auth/page-authorization';
import type { MenuInfo } from '@/types/foundation/menu';
import { resolveMenuInternalRoute } from './internal-route';
import { openableMenus } from './openable-menus';

/**
 * 이 권한 집합이면 사이드바에 어떤 메뉴가 보이고, 숨는 메뉴는 왜 숨는가(2026-10-02 관리 콘솔 2단계 F0).
 *
 * 메뉴 편집기의 '그룹 미리보기'(초안 기준), 권한 편집기의 '화면별 권한' 상태 칸과 '메뉴 미리보기'(그룹 하나 또는 사용자의
 * 모든 그룹 합집합)가 같은 판정을 쓴다. 사이드바가 거치는 두 단계를 그대로 따른다.
 *
 * 1. 서버 메뉴 트리(MenuService#buildMenuTree): 메뉴 표시 배정(NAVIGATION)이 있고 사용 여부가 'Y' 인 메뉴만 남기고, 상위가
 *    남지 않은 메뉴는 조용히 버린다 — 상위가 숨으면 하위도 숨는다. 상위 번호가 없는 메뉴(고아)·순환도 최상위에 닿지 못해 숨는다.
 * 2. 화면 걸러내기(openableMenus — 사이드바·헤더·명령 센터와 같은 함수를 그대로 부른다): 기능권한(OPERATION)으로 들어갈 수
 *    없는 경로의 메뉴를 빼고, 열 수 있는 하위가 없는 분류를 뺀다. 판정은 라우트 게이트와 같은 canEnterRegisteredPage 다.
 *
 * 숨는 이유는 메뉴마다 하나다. 여럿이 겹치면 그 메뉴 자신의 사실을 먼저 말한다:
 *   'unused'(사용 안 함 — 모든 그룹에서 숨는다) → 'no-navigation'(메뉴 표시 없음) → 'parent-hidden'(상위가 숨음)
 *   → 'unregistered-route'(등록되지 않은 관리 화면 경로) / 'no-entry-permission'(진입 권한 없음) → 'no-openable-children'.
 *
 * 경로 없는 분류가 언제 숨는가는 하위가 **어느 단계에서** 빠졌는가에 달려 있다(지금 사이드바의 사실 그대로다).
 *   · 하위가 모두 1단계(메뉴 표시 없음·사용 안 함)에서 빠졌거나 처음부터 없으면, 서버 트리에서 그 분류는 하위가
 *     없는 메뉴가 된다. 서버가 그런 메뉴에 chkURL('#' 등 빈 값이 아닌 문자열)을 싣기 때문에 openableMenus 의 '빈 분류'
 *     규칙이 걸리지 않고, 사이드바는 그 분류를 누를 수 없는 흐린 항목으로 그린다(NavItem isRestricted). 그래서 **보임**이다.
 *   · 하위가 서버 트리에는 있었는데 2단계(진입 권한 없음·등록되지 않은 경로)에서 모두 빠지면 'no-openable-children' 으로 숨는다.
 * 앞의 경우를 '숨김'으로 바꾸려면 openableMenus 가 '#' 같은 주소를 '주소 없음'으로 봐야 한다 — 사이드바와 미리보기가 함께
 * 바뀌는 결정이며(미리보기만 바꾸면 사이드바와 어긋난다), 바꾸면 테스트 '경로도 하위도 없는 메뉴는 보인다' 를 같이 뒤집는다.
 *
 * 한계 — 노출 판정일 뿐 인가가 아니다(H3). 서버 권한과 라우트 게이트는 그대로 집행된다.
 *   · 라우트 없는 메뉴의 chkURL 은 '#' 로 둔다. 서버(MenuService#calculateUrl)는 연결 프로그램 파일명으로 '/'·추론 경로
 *     ('/admin/…') 같은 다른 문자열을 만들 수 있지만, 그 값은 내부 경로로 해석되지 않으므로(해석기는 라우트가 없으면 '.do' 만
 *     받는다 — internal-route.ts) 빈 값이 아닌 한 결과가 같다(대조 테스트가 그 분기들을 섞어 확인한다).
 *     2026-10-04 프로그램 목록 퇴역 뒤 서버 chkURL 은 modernRoute·파일명 추정 경로·'#'·'/' 뿐이고 빈 문자열이 되지 않는다.
 *     종전의 예외(연결 프로그램 원장 URL 이 빈 문자열이면 사이드바만 그 분류를 빼던 일)는 사라졌다.
 *   · 형제 순서는 menuOrdr, 같으면 menuNo 순이다(서버는 같은 순번의 순서를 정하지 않는다).
 */

/** 메뉴 키. 저장된 메뉴는 번호, 저장 전 초안의 새 메뉴는 'new-1' 같은 키다. 판정은 문자열로 맞춘다(menuPreviewKey). */
export type MenuPreviewKey = number | string;

/** 미리보기 입력 메뉴(메뉴 구조 한 줄과 같은 모양). */
export interface MenuPreviewMenu {
  menuNo: MenuPreviewKey;
  menuNm: string;
  /** 상위 메뉴 키. null·0·'' 은 최상위다. */
  upMenuSn: MenuPreviewKey | null;
  menuOrdr: number;
  /** null 과 '' 는 같다(라우트 없음). */
  modernRoute: string | null;
  /** 'Y' 만 사용이다(사이드바와 같은 판정). */
  useYn: string | null;
}

export type MenuHiddenReason =
  | 'no-navigation'
  | 'unused'
  | 'parent-hidden'
  | 'no-entry-permission'
  | 'unregistered-route'
  | 'no-openable-children';

/** 숨는 이유의 화면 문구. */
export const MENU_HIDDEN_REASON_LABELS: Readonly<Record<MenuHiddenReason, string>> = {
  'no-navigation': '메뉴 표시 없음',
  unused: '사용 안 함',
  'parent-hidden': '상위 메뉴 숨김',
  'no-entry-permission': '진입 권한 없음',
  'unregistered-route': '등록되지 않은 화면 경로',
  'no-openable-children': '열 수 있는 하위 메뉴 없음',
};

interface MenuVisibilityFacts {
  /** 메뉴 경로를 내부 경로로 해석한 값. 라우트가 없거나 해석할 수 없으면 null. */
  route: string | null;
  /**
   * 이 권한 집합으로 그 경로에 들어갈 수 있는가(라우트 게이트와 같은 판정, /admin 밖은 true). 경로가 없으면 null.
   * 메뉴가 숨어도 계산한다 — '메뉴 표시 없음' 인데 true 면 '메뉴 없이 주소로만 열림' 이다. 메뉴가 보이는데 false 면
   * 열 수 있는 하위가 있어 경로 없이 분류로만 남은 메뉴다.
   */
  canEnter: boolean | null;
}

export type MenuVisibility = MenuVisibilityFacts & (
  | { visible: true; reason: null }
  | { visible: false; reason: MenuHiddenReason }
);

/** 사이드바에 보일 메뉴. 자기 경로를 열 수 없어 분류로만 남은 메뉴는 route 가 null 이다. */
export interface MenuPreviewNode {
  menuNo: MenuPreviewKey;
  menuNm: string;
  route: string | null;
  children: MenuPreviewNode[];
}

export interface MenuVisibilityPreviewInput {
  menus: readonly MenuPreviewMenu[];
  /** 메뉴 표시(NAVIGATION) 배정 — 메뉴 키(번호 또는 권한 코드 문자열 '123', 새 메뉴 'new-1'). */
  navigation: Iterable<MenuPreviewKey>;
  /** 기능권한(OPERATION) 코드. */
  operations: Iterable<string>;
}

export interface MenuVisibilityPreview {
  /** 메뉴마다의 판정. 키는 menuPreviewKey(menuNo). 입력에 있던 메뉴는 모두 있다(같은 키가 겹치면 처음 것만). */
  byMenu: ReadonlyMap<string, MenuVisibility>;
  /** 사이드바에 보일 트리(영역 → 하위). 형제는 menuOrdr, menuNo 순. */
  tree: readonly MenuPreviewNode[];
}

/** 메뉴 키를 판정용 문자열로 맞춘다 — 번호 123 과 권한 코드 '123' 은 같은 메뉴다. */
export function menuPreviewKey(menuNo: MenuPreviewKey): string {
  return String(menuNo);
}

/** 권한 목록을 메뉴 표시·기능권한 집합으로 나눈다. 사용자 미리보기는 그 사용자 그룹들의 grants 를 이어 붙여 넘긴다(합집합). */
export function grantSets(grants: Iterable<{ type: string; code: string }>): { navigation: Set<string>; operations: Set<string> } {
  const navigation = new Set<string>();
  const operations = new Set<string>();
  for (const grant of grants) {
    if (grant.type === 'NAVIGATION') navigation.add(grant.code);
    else if (grant.type === 'OPERATION') operations.add(grant.code);
  }
  return { navigation, operations };
}

/** 권한 카탈로그의 메뉴 목록을 미리보기 입력으로 바꾼다(권한 편집기용). 카탈로그 순서(menu_ordr, menu_sn)를 형제 순서로 쓴다. */
export function menuPreviewMenusFromCatalog(
  navigation: readonly { code: string; name: string; parentCode: string | null; route: string | null; useYn: string }[],
): MenuPreviewMenu[] {
  return navigation.map((item, index) => ({
    menuNo: item.code,
    menuNm: item.name,
    upMenuSn: item.parentCode,
    menuOrdr: index,
    modernRoute: item.route,
    useYn: item.useYn,
  }));
}

/** 미리보기의 권한 상태는 늘 '알려진' 상태다 — openableMenus 는 권한 상태를 모르면 거르지 않으므로 표지를 준다. */
const PREVIEW_AUTHORIZATION_VERSION = 'menu-visibility-preview';

function isRootParent(parent: MenuPreviewKey | null): boolean {
  return parent == null || parent === 0 || parent === '' || parent === '0';
}

function compareKeys(left: string, right: string): number {
  return left.localeCompare(right, 'en', { numeric: true });
}

function isGatedPath(route: string): boolean {
  const path = route.split(/[?#]/, 1)[0].toLowerCase();
  return path === '/admin' || path.startsWith('/admin/');
}

/** 이 권한 집합이면 사이드바에 무엇이 보이고 왜 숨는가. 순수 함수다(입력을 바꾸지 않는다). */
export function previewMenuVisibility(input: MenuVisibilityPreviewInput): MenuVisibilityPreview {
  const navigation = new Set([...input.navigation].map(menuPreviewKey));
  const subject = { permissions: [...new Set(input.operations)], authorizationVersion: PREVIEW_AUTHORIZATION_VERSION };

  // 같은 키가 겹치면 처음 것만 쓴다. synthetic 은 openableMenus 안에서만 쓰는 임시 번호다(새 메뉴 키는 번호가 아니다).
  const entries = new Map<string, PreviewEntry>();
  for (const menu of input.menus) {
    const key = menuPreviewKey(menu.menuNo);
    if (entries.has(key)) continue;
    entries.set(key, {
      key,
      menu,
      parent: isRootParent(menu.upMenuSn) ? null : menuPreviewKey(menu.upMenuSn as MenuPreviewKey),
      synthetic: entries.size + 1,
    });
  }
  const bySynthetic = new Map([...entries.values()].map((entry) => [entry.synthetic, entry] as const));
  const entryOf = (menuNo: number): PreviewEntry => {
    const entry = bySynthetic.get(menuNo);
    if (!entry) throw new Error('메뉴 미리보기의 메뉴 번호가 입력과 맞지 않습니다.');
    return entry;
  };

  // 1단계 — 서버 메뉴 트리: 배정 ∧ 사용 ∧ 모든 상위가 남음. 상위 사슬이 최상위에 닿지 못하면(고아·순환) 숨는다.
  const ownReason = (entry: PreviewEntry): MenuHiddenReason | null => {
    if (entry.menu.useYn !== 'Y') return 'unused';
    if (!navigation.has(entry.key)) return 'no-navigation';
    return null;
  };
  const serverVisible = new Map<string, boolean>();
  const isServerVisible = (key: string, visiting: Set<string>): boolean => {
    const known = serverVisible.get(key);
    if (known !== undefined) return known;
    const entry = entries.get(key);
    let visible = false;
    if (entry && ownReason(entry) === null && !visiting.has(key)) {
      visiting.add(key);
      visible = entry.parent === null || isServerVisible(entry.parent, visiting);
      visiting.delete(key);
    }
    serverVisible.set(key, visible);
    return visible;
  };
  for (const key of entries.keys()) isServerVisible(key, new Set());

  // 서버 트리를 사이드바가 받는 모양(MenuInfo, 하위 배열 포함)으로 만든다.
  const childrenOf = new Map<string | null, PreviewEntry[]>();
  for (const entry of entries.values()) {
    if (!serverVisible.get(entry.key)) continue;
    const siblings = childrenOf.get(entry.parent) ?? [];
    siblings.push(entry);
    childrenOf.set(entry.parent, siblings);
  }
  for (const siblings of childrenOf.values()) {
    siblings.sort((left, right) => (left.menu.menuOrdr - right.menu.menuOrdr) || compareKeys(left.key, right.key));
  }
  const toMenuInfo = (entry: PreviewEntry): MenuInfo => ({
    menuNo: entry.synthetic,
    menuNm: entry.menu.menuNm,
    upperMenuId: 0,
    upMenuSn: 0,
    menuOrdr: entry.menu.menuOrdr,
    modernRoute: entry.menu.modernRoute || undefined,
    // 서버 calculateUrl 과 같이 라우트가 있으면 그 값, 없으면 '#'(빈 값이 아니다 — 위 머리 주석).
    chkURL: entry.menu.modernRoute || '#',
    useYn: 'Y',
    children: (childrenOf.get(entry.key) ?? []).map(toMenuInfo),
  });
  const serverTree = (childrenOf.get(null) ?? []).map(toMenuInfo);

  // 2단계 — 화면 걸러내기: 사이드바와 같은 함수.
  const kept = new Set<string>();
  const toNode = (menu: MenuInfo): MenuPreviewNode => {
    const entry = entryOf(menu.menuNo);
    kept.add(entry.key);
    return {
      menuNo: entry.menu.menuNo,
      menuNm: entry.menu.menuNm,
      route: resolveMenuInternalRoute(menu),
      children: (menu.children ?? []).map(toNode),
    };
  };
  const tree = openableMenus(serverTree, subject).map(toNode);

  const byMenu = new Map<string, MenuVisibility>();
  for (const entry of entries.values()) {
    const route = resolveMenuInternalRoute({ modernRoute: entry.menu.modernRoute || null });
    const canEnter = route === null ? null : canOpenPage(subject, route);
    const facts = { route, canEnter };
    if (kept.has(entry.key)) {
      byMenu.set(entry.key, { ...facts, visible: true, reason: null });
      continue;
    }
    let reason: MenuHiddenReason;
    const own = ownReason(entry);
    if (own) reason = own;
    else if (!serverVisible.get(entry.key)) reason = 'parent-hidden';
    else if (route !== null && canEnter === false) {
      reason = isGatedPath(route) && registeredPageEntry(route.split(/[?#]/, 1)[0]) === null ? 'unregistered-route' : 'no-entry-permission';
    } else if (route === null) reason = 'no-openable-children';
    // 열 수 있는 경로인데 빠졌다면 화면 걸러내기에서 상위가 빠진 경우뿐이다(열 수 있는 하위가 있으면 상위는 남으므로 실제로는 없다).
    else reason = 'parent-hidden';
    byMenu.set(entry.key, { ...facts, visible: false, reason });
  }

  return { byMenu, tree };
}

interface PreviewEntry {
  key: string;
  menu: MenuPreviewMenu;
  /** 상위 메뉴 키. 최상위면 null. */
  parent: string | null;
  synthetic: number;
}
