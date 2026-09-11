import { describe, expect, it } from 'vitest';
import { buildNavigationPermissionTree, navigationSelectionGaps, toggleNavigationPermission } from '../navigation-permission-tree';

const navigation = [
  { code: 'child-b', name: '두 번째 자식', parentCode: 'root' },
  { code: 'other', name: '다른 메뉴', parentCode: null },
  { code: 'root', name: '상위 메뉴', parentCode: null },
  { code: 'child-a', name: '첫 번째 자식', parentCode: 'root' },
  { code: 'leaf', name: '하위 메뉴', parentCode: 'child-a' },
];

describe('navigation permission hierarchy', () => {
  it('links parents regardless of input position and preserves catalog sibling order', () => {
    const tree = buildNavigationPermissionTree(navigation);
    expect(tree.error).toBeNull();
    expect(tree.roots.map((node) => node.code)).toEqual(['other', 'root']);
    expect(tree.nodes.get('root')?.children.map((node) => node.code)).toEqual(['child-b', 'child-a']);
    expect(tree.nodes.get('child-a')?.children[0].code).toBe('leaf');
  });

  it('selects all ancestors while preserving operations and unrelated menus, without selecting siblings', () => {
    const tree = buildNavigationPermissionTree(navigation);
    const original = new Set(['OPERATION:BOARD_READ', 'NAVIGATION:other']);
    const next = toggleNavigationPermission(tree, original, 'leaf', true);
    expect([...next]).toEqual(['OPERATION:BOARD_READ', 'NAVIGATION:other', 'NAVIGATION:leaf', 'NAVIGATION:child-a', 'NAVIGATION:root']);
    expect([...original]).toEqual(['OPERATION:BOARD_READ', 'NAVIGATION:other']);
    expect(navigationSelectionGaps(tree, next)).toEqual([]);
  });

  it('selecting a parent does not grant children, and clearing a parent removes every descendant', () => {
    const tree = buildNavigationPermissionTree(navigation);
    expect([...toggleNavigationPermission(tree, new Set(), 'root', true)]).toEqual(['NAVIGATION:root']);
    const all = new Set(['OPERATION:BOARD_READ', ...navigation.map((item) => `NAVIGATION:${item.code}`)]);
    expect([...toggleNavigationPermission(tree, all, 'root', false)]).toEqual(['OPERATION:BOARD_READ', 'NAVIGATION:other']);
  });

  it('reports existing missing ancestors without silently changing them and allows either repair', () => {
    const tree = buildNavigationPermissionTree(navigation);
    const original = new Set(['NAVIGATION:leaf']);
    expect(navigationSelectionGaps(tree, original)).toEqual(['하위 메뉴']);
    expect([...original]).toEqual(['NAVIGATION:leaf']);
    expect(navigationSelectionGaps(tree, toggleNavigationPermission(tree, original, 'child-a', true))).toEqual([]);
    expect(navigationSelectionGaps(tree, toggleNavigationPermission(tree, original, 'leaf', false))).toEqual([]);
  });

  it.each([
    [{ code: 'a', name: '없는 상위', parentCode: 'missing' }],
    [{ code: 'a', name: '자기 참조', parentCode: 'a' }],
    [{ code: 'a', name: '순환 A', parentCode: 'b' }, { code: 'b', name: '순환 B', parentCode: 'a' }],
    [{ code: 'a', name: '중복 A', parentCode: null }, { code: 'a', name: '중복 B', parentCode: null }],
  ])('rejects malformed catalogs before rendering or changing a selection: %j', (...items) => {
    const tree = buildNavigationPermissionTree(items);
    expect(tree.error).not.toBeNull();
    expect(tree.roots).toEqual([]);
    expect([...toggleNavigationPermission(tree, new Set(['OPERATION:BOARD_READ']), 'a', true)]).toEqual(['OPERATION:BOARD_READ']);
  });
});
