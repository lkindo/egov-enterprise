import type { AuthorizationCatalog } from '@/lib/auth/authorization-management-contract';
import { buildNavigationPermissionTree, type NavigationPermissionNode } from '@/lib/auth/navigation-permission-tree';
import { resolveMenuScreen } from '@/lib/navigation/menu-screen-resolution';
import { SCREEN_REGISTRY, type PermissionBundle } from '@/types/generated-screen-registry';
import { isProtectedPermission, operationKey } from './operation-permission-matrix-model';

/**
 * '권한 묶음 적용'의 순수 모델(2026-10-02, 관리 콘솔 UX 3단계 G2, 사용자 결정 D5).
 *
 * 묶음은 체크를 대신해 줄 뿐이다 — 인가 의미는 그대로다. 묶음을 고르면 그 기능권한(OPERATION)과, 묶음이 여는 화면·관련
 * 화면을 가리키는 메뉴와 그 상위 메뉴 전부의 메뉴 표시(NAVIGATION)를 그룹 초안에 **명시적으로** 더한다(상위 메뉴 묵시 배정 금지 —
 * 더한 메뉴는 초안에 보이고 저장 전 요약이 센다). 저장은 기존 '권한 변경 저장'(버전 확인·보호 권한·감사)이 한다.
 * 이 모듈은 선택 상태를 바꾸지 않는다 — 무엇을 더할지 계산할 뿐이다. 빼기는 없다(다른 묶음·개별 체크와 겹친 권한을 잘못
 * 회수할 수 있다 — 회수는 표에서 한다).
 *
 * 메뉴가 어느 화면을 여는지는 화면별 권한 표·화면 관리와 같은 공용 판정(resolveMenuScreen)으로 정한다 — 별칭 메뉴(주소록처럼
 * 다른 화면으로 넘기는 경로)는 넘기는 화면으로 센다. 메뉴 계층은 편집기와 같은 검증(buildNavigationPermissionTree)을 거친다.
 *
 * 메뉴 표시를 더하는 메뉴:
 *  · 사용 중(useYn 'Y')이고 경로가 있고, 그 경로가 여는 화면이 묶음의 화면(screens) 또는 관련 화면(relatedScreens)에 있는
 *    메뉴와 그 상위 메뉴 전부. 두 화면 목록은 생성기가 계산한다(생성 파일 머리 주석): screens 는 진입 권한을 묶음이 충족하는
 *    화면, relatedScreens 는 로그인 사용자 누구나 들어가는 화면(쪽지함·일정 등) 가운데 묶음의 권한을 쓰기(등록·수정·삭제 등)로
 *    쓰는 화면이다(2026-10-03, 선택지 ①). 쓰기가 없는 누구나 들어가는 화면(통합 검색·설문 참여 목록 등)의 메뉴는 더하지 않는다
 *    — 미리보기가 그 사실을 안내한다.
 *  · 상위 가운데 사용 안 함 메뉴가 있으면 그 메뉴는 더하지 않는다 — 사이드바에 보이지 않으므로 더해도 소용이 없고, 사용 안 함
 *    상위를 켜면 그 아래 다른 메뉴까지 쓰이는 것처럼 보인다. 미리보기가 '사용 안 함 상위 메뉴 때문에 표시하지 않는 메뉴'로 알린다.
 *  · 이미 초안에 있는 메뉴 표시는 세지 않는다.
 *
 * 기능권한은 현재 기능 목록(카탈로그)에 있는 코드만 더한다 — 목록에 없는 코드는 저장 본문(selectedGrants)에서 빠지므로 더한
 * 것처럼 보이게 하지 않는다(화면별 권한 표와 같은 원칙).
 */

type Navigation = AuthorizationCatalog['navigation'][number];

export interface BundleMenu {
  code: string;
  name: string;
}

export interface BundleBlockedMenu extends BundleMenu {
  /** 이 메뉴를 가리는 사용 안 함 상위 메뉴(가장 가까운 것). */
  unusedAncestor: BundleMenu;
}

/**
 * 이름이 없는 화면의 표시. 화면 목록에 이름이 없는(또는 화면 목록에 없는) 화면을 경로 그대로 이름처럼 보이지 않고, 이름을
 * 모른다는 사실과 주소를 함께 말한다(화면 관리·화면별 권한 표의 '이름 미확인'과 같은 말).
 */
export function unnamedScreenLabel(route: string): string {
  return `이름 미확인 화면(주소 ${route})`;
}

export interface BundleScreen {
  route: string;
  /** 화면 이름(화면 목록의 이름, 없으면 unnamedScreenLabel — 경로를 이름처럼 보이지 않는다). */
  label: string;
  /** 이 화면을 여는 사용 중 메뉴 가운데 묶음이 메뉴 표시를 보장하는 메뉴(카탈로그 순서). */
  menus: BundleMenu[];
  /**
   * 이 화면을 여는 사용 중 메뉴 가운데 사용 안 함 상위 메뉴에 가려 더하지 않는 메뉴(카탈로그 순서). menus 와 이것이 모두 비어야
   * '이 화면을 여는 사용 중 메뉴가 없다'가 사실이다 — 화면별 권한 표도 이런 화면을 '메뉴에 없는 화면'으로 보지 않는다.
   */
  blockedMenus: BundleBlockedMenu[];
  /** 경로 값을 받는 화면(목록에서 항목을 골라 여는 상세 등) — 메뉴에 둘 수 없다. */
  dynamic: boolean;
}

export interface BundlePreview {
  bundleId: string;
  /** 초안에 새로 더할 기능권한 코드(묶음 순서). */
  operationsToAdd: string[];
  /** 이미 초안에 있는 기능권한 코드. */
  operationsPresent: string[];
  /** 현재 기능 목록에 없어 더하지 않는 코드. */
  operationsUnknown: string[];
  /** 초안에 새로 더할 메뉴 표시(메뉴 번호, 카탈로그 순서) — 대상 메뉴와 그 상위 메뉴. */
  navigationToAdd: string[];
  /** 권한으로 열리는 화면 — 진입 권한을 묶음이 충족하는 화면(묶음 순서). */
  screens: BundleScreen[];
  /** 누구나 들어가는 관련 화면 — 로그인 사용자 누구나 들어가고 묶음의 권한을 쓰기로 쓰는 화면(묶음 순서). screens 와 겹치지 않는다. */
  relatedScreens: BundleScreen[];
  /** 사용 안 함 상위 메뉴 때문에 메뉴 표시를 더하지 않는 메뉴. */
  blockedMenus: BundleBlockedMenu[];
  /** 메뉴 계층을 확인하지 못했으면 그 이유 — 이때 메뉴 표시는 더하지 않는다. */
  navigationError: string | null;
  /**
   * 묶음이 더해 저장본과 달라지는 보호 권한 — 새로 더하는 것 가운데 저장된 기준선에 없는 것. 서버는 저장본과 원하는 권한을
   * 비교해 보호 권한이 바뀌는 저장에만 권한 배정 권한을 요구한다(초안에서 뺐다가 묶음이 되돌리는 보호 권한은 바뀌지 않는다).
   */
  protectedToAdd: string[];
}

const navigationKey = (code: string): string => `NAVIGATION:${code}`;

/** 상위 메뉴들(가까운 것부터). */
function ancestorsOf(node: NavigationPermissionNode, nodes: ReadonlyMap<string, NavigationPermissionNode>): NavigationPermissionNode[] {
  const result: NavigationPermissionNode[] = [];
  let current = node.parentCode === null ? undefined : nodes.get(node.parentCode);
  while (current) {
    result.push(current);
    current = current.parentCode === null ? undefined : nodes.get(current.parentCode);
  }
  return result;
}

/**
 * 묶음 하나를 지금 초안에 더하면 무엇이 늘어나는지 계산한다.
 * @param operationCodes 현재 기능 목록의 코드. 주면 목록에 없는 코드는 더하지 않는다(operationsUnknown).
 * @param saved 저장된 기준선의 선택 — 보호 권한 경고(protectedToAdd)를 저장본과 비교한다. 없으면 지금 초안을 저장본으로 본다.
 */
export function previewBundle(
  bundle: PermissionBundle,
  selection: ReadonlySet<string>,
  navigation: readonly Navigation[],
  operationCodes?: Iterable<string>,
  saved: ReadonlySet<string> = selection,
): BundlePreview {
  const catalogCodes = operationCodes ? new Set(operationCodes) : null;
  const operationsToAdd: string[] = [];
  const operationsPresent: string[] = [];
  const operationsUnknown: string[] = [];
  for (const code of bundle.permissions) {
    if (catalogCodes && !catalogCodes.has(code)) operationsUnknown.push(code);
    else if (selection.has(operationKey(code))) operationsPresent.push(code);
    else operationsToAdd.push(code);
  }

  const bundleScreens = new Set([...bundle.screens, ...bundle.relatedScreens]);
  const menusByScreen = new Map<string, BundleMenu[]>();
  const blockedByScreen = new Map<string, BundleBlockedMenu[]>();
  const blockedMenus: BundleBlockedMenu[] = [];
  const addKeys = new Set<string>();
  const tree = buildNavigationPermissionTree(navigation);
  if (!tree.error) {
    for (const item of navigation) {
      if (item.useYn !== 'Y' || !item.route) continue;
      const screen = resolveMenuScreen(item.route)?.screen.route;
      if (!screen || !bundleScreens.has(screen)) continue;
      const node = tree.nodes.get(item.code)!;
      const ancestors = ancestorsOf(node, tree.nodes);
      const unused = ancestors.find((ancestor) => ancestor.useYn !== 'Y');
      if (unused) {
        const blocked = { code: item.code, name: item.name, unusedAncestor: { code: unused.code, name: unused.name } };
        blockedMenus.push(blocked);
        blockedByScreen.set(screen, [...(blockedByScreen.get(screen) ?? []), blocked]);
        continue;
      }
      for (const entry of [node, ...ancestors]) {
        if (!selection.has(navigationKey(entry.code))) addKeys.add(entry.code);
      }
      const menus = menusByScreen.get(screen) ?? [];
      menus.push({ code: item.code, name: item.name });
      menusByScreen.set(screen, menus);
    }
  }
  const registered = new Map(SCREEN_REGISTRY.map((screen) => [screen.route, screen]));
  const toScreen = (route: string): BundleScreen => ({
    route, label: registered.get(route)?.label ?? unnamedScreenLabel(route), menus: menusByScreen.get(route) ?? [], blockedMenus: blockedByScreen.get(route) ?? [],
    dynamic: registered.get(route)?.dynamic ?? false,
  });
  return {
    bundleId: bundle.id,
    operationsToAdd,
    operationsPresent,
    operationsUnknown,
    navigationToAdd: navigation.map((item) => item.code).filter((code) => addKeys.has(code)),
    screens: bundle.screens.map(toScreen),
    relatedScreens: bundle.relatedScreens.map(toScreen),
    blockedMenus,
    navigationError: tree.error,
    protectedToAdd: operationsToAdd.filter((code) => isProtectedPermission(code) && !saved.has(operationKey(code))),
  };
}

/** 미리보기가 초안에 더하는 키(`OPERATION:<code>`·`NAVIGATION:<menu>`). */
export function bundleDraftKeys(preview: BundlePreview): string[] {
  return [...preview.operationsToAdd.map(operationKey), ...preview.navigationToAdd.map(navigationKey)];
}

/**
 * 묶음을 더한 새 초안. 지금 초안에서 다시 계산하므로 같은 묶음을 두 번 더해도 초안이 변하지 않는다(멱등). 빼는 키는 없다.
 */
export function withBundle(
  selection: ReadonlySet<string>,
  bundle: PermissionBundle,
  navigation: readonly Navigation[],
  operationCodes?: Iterable<string>,
): Set<string> {
  const next = new Set(selection);
  for (const key of bundleDraftKeys(previewBundle(bundle, selection, navigation, operationCodes))) next.add(key);
  return next;
}
