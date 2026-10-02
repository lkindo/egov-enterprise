import { normalizeInternalRoute } from '@/lib/navigation/internal-route';
import { PAGE_PERMISSION_MODES, type PermissionCode } from '@/types/generated-permissions';
import type { AuthorizationCatalog } from './authorization-management-contract';
import { canOpenPage } from './page-access';
import { registeredPageEntry } from './page-authorization';

type Navigation = AuthorizationCatalog['navigation'][number];
export type NavigationPermissionNode = Navigation & { children: NavigationPermissionNode[] };
export interface NavigationPermissionTree {
  roots: NavigationPermissionNode[];
  nodes: ReadonlyMap<string, NavigationPermissionNode>;
  error: string | null;
}

/** Validate before linking: malformed catalogs must never recurse or silently lose grants. */
export function buildNavigationPermissionTree(navigation: readonly Navigation[]): NavigationPermissionTree {
  const nodes = new Map<string, NavigationPermissionNode>();
  const invalid = (error: string): NavigationPermissionTree => ({ roots: [], nodes, error });
  for (const item of navigation) {
    if (nodes.has(item.code)) return invalid('중복된 메뉴가 있어 메뉴 계층을 확인할 수 없습니다.');
    nodes.set(item.code, { ...item, children: [] });
  }
  for (const item of nodes.values()) {
    if (item.parentCode !== null && !nodes.has(item.parentCode)) {
      return invalid(`${item.name}의 상위 메뉴 정보가 없습니다.`);
    }
  }
  const verified = new Set<string>();
  for (const item of nodes.values()) {
    const ancestors = new Set<string>();
    let current: NavigationPermissionNode | undefined = item;
    while (current && !verified.has(current.code)) {
      if (ancestors.has(current.code)) return invalid('메뉴의 상하위 연결이 순환하고 있습니다.');
      ancestors.add(current.code);
      current = current.parentCode === null ? undefined : nodes.get(current.parentCode);
    }
    for (const code of ancestors) verified.add(code);
  }
  const roots: NavigationPermissionNode[] = [];
  for (const item of nodes.values()) {
    if (item.parentCode === null) roots.push(item);
    else nodes.get(item.parentCode)!.children.push(item);
  }
  return { roots, nodes, error: null };
}

/** Existing incomplete selections stay visible until the operator explicitly repairs them. */
export function navigationSelectionGaps(tree: NavigationPermissionTree, selection: ReadonlySet<string>): string[] {
  if (tree.error) return [];
  return [...tree.nodes.values()].filter((node) => selection.has(`NAVIGATION:${node.code}`)
    && node.parentCode !== null && !selection.has(`NAVIGATION:${node.parentCode}`)).map((node) => node.name);
}

/** Selecting adds ancestors only; clearing removes the entire descendant subtree. OP grants are untouched. */
export function toggleNavigationPermission(tree: NavigationPermissionTree, selection: ReadonlySet<string>, code: string, checked: boolean): Set<string> {
  const next = new Set(selection);
  const node = tree.nodes.get(code);
  if (tree.error || !node) return next;
  if (checked) {
    let current: NavigationPermissionNode | undefined = node;
    while (current) {
      next.add(`NAVIGATION:${current.code}`);
      current = current.parentCode === null ? undefined : tree.nodes.get(current.parentCode);
    }
  } else {
    const pending = [node];
    while (pending.length > 0) {
      const current = pending.pop()!;
      next.delete(`NAVIGATION:${current.code}`);
      pending.push(...current.children);
    }
  }
  return next;
}

/**
 * 선택한 메뉴 가운데, 선택한 기능권한만으로는 들어갈 수 없는 화면의 메뉴 이름(2026-10-01).
 *
 * 메뉴 표시(NAVIGATION)와 화면 진입(OPERATION)은 서로 다른 권한이 판정한다. 메뉴만 배정하고 그 화면의 조회 권한을
 * 주지 않으면, 사용자에게 그 메뉴는 보이지 않는다(메뉴는 라우트 게이트와 같은 판정으로 보인다). 종전 편집기는
 * 기능권한이 **하나도 없을 때만** 경고해, 메뉴별 어긋남은 설정하는 사람에게 드러나지 않았다.
 *
 * 판정은 라우트 게이트와 같은 함수다. 사용자의 실제 권한은 배정된 그룹의 합집합이므로 이것은 저장을 막는 오류가
 * 아니라 안내다 — 다른 그룹이 그 권한을 주면 메뉴는 보인다.
 */
export function selectedMenusWithoutEntryPermission(
  navigation: readonly Navigation[],
  selection: ReadonlySet<string>,
): string[] {
  return menusMissingEntryPermission(navigation, selection).map((menu) => menu.name);
}

/** 진입 권한이 없는 메뉴 하나와, 그 화면을 열려면 필요한 기능권한. */
export interface MenuMissingEntryPermission {
  code: string;
  name: string;
  /** 라우트 게이트가 보는 경로(쿼리·해시 제외). */
  route: string;
  /** 화면이 요구하는 기능권한. 등록되지 않은 화면이면 빈 배열이다. */
  required: PermissionCode[];
  /** ANY 는 하나만 있으면 되고, ALL 은 모두 있어야 한다(라우트 게이트와 같은 규칙). */
  mode: 'ANY' | 'ALL';
  /** 기능권한을 더해 고칠 수 있는가. 등록되지 않은 /admin 경로는 어떤 권한으로도 열리지 않는다. */
  fixable: boolean;
}

/**
 * {@link selectedMenusWithoutEntryPermission} 의 판정 그대로, 메뉴마다 무엇을 더하면 들어갈 수 있는지까지 돌려준다
 * (2026-10-02, 관리 콘솔 UX 1단계). 편집기는 이것으로 '진입 권한 추가'를 초안에 더한다 — 저장은 여전히
 * '권한 변경 저장' 하나이며, 이 함수는 아무것도 자동으로 추가하지 않는다.
 *
 * 필요한 권한과 판정 방식은 라우트 게이트가 쓰는 등록 원장(registeredPageEntry·PAGE_PERMISSION_MODES)에서 읽는다.
 * 동적 경로는 등록 항목의 키로 판정 방식을 찾아야 하므로 registeredPagePermissions 대신 항목 자체를 쓴다.
 */
export function menusMissingEntryPermission(
  navigation: readonly Navigation[],
  selection: ReadonlySet<string>,
): MenuMissingEntryPermission[] {
  const permissions = [...selection]
    .filter((key) => key.startsWith('OPERATION:'))
    .map((key) => key.slice('OPERATION:'.length));
  const subject = { permissions, authorizationVersion: 'draft' };
  const missing: MenuMissingEntryPermission[] = [];
  for (const menu of navigation) {
    if (!selection.has(`NAVIGATION:${menu.code}`)) continue;
    const route = normalizeInternalRoute(menu.route);
    if (route === null || canOpenPage(subject, route)) continue;
    const path = route.split(/[?#]/, 1)[0];
    const entry = registeredPageEntry(path);
    const required = entry ? [...entry[1]] : [];
    missing.push({
      code: menu.code,
      name: menu.name,
      route: path,
      required,
      mode: entry && PAGE_PERMISSION_MODES[entry[0]] === 'ALL' ? 'ALL' : 'ANY',
      fixable: required.length > 0,
    });
  }
  return missing;
}
