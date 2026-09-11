import type { AuthorizationCatalog } from './authorization-management-contract';

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
