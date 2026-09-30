import { describe, expect, it } from 'vitest';
import { buildNavigationPermissionTree, navigationSelectionGaps, selectedMenusWithoutEntryPermission, toggleNavigationPermission } from '../navigation-permission-tree';

const navigation = [
  { code: 'child-b', name: '두 번째 자식', parentCode: 'root', route: null },
  { code: 'other', name: '다른 메뉴', parentCode: null, route: null },
  { code: 'root', name: '상위 메뉴', parentCode: null, route: null },
  { code: 'child-a', name: '첫 번째 자식', parentCode: 'root', route: null },
  { code: 'leaf', name: '하위 메뉴', parentCode: 'child-a', route: null },
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
    const tree = buildNavigationPermissionTree(items.map((item) => ({ ...item, route: null })));
    expect(tree.error).not.toBeNull();
    expect(tree.roots).toEqual([]);
    expect([...toggleNavigationPermission(tree, new Set(['OPERATION:BOARD_READ']), 'a', true)]).toEqual(['OPERATION:BOARD_READ']);
  });

  /*
   * [2026-10-01] 메뉴 표시(NAVIGATION)와 화면 진입(OPERATION)은 서로 다른 권한이 판정한다. 메뉴만 배정하고 그 화면의
   * 조회 기능을 주지 않으면 사용자에게 그 메뉴는 보이지 않는다 — 편집기가 저장 전에 그 메뉴를 알린다.
   */
  it('선택한 메뉴 가운데 선택한 기능권한으로 들어갈 수 없는 화면의 메뉴를 알린다', () => {
    const menus = [
      { code: 'area', name: '관리', parentCode: null, route: null },
      { code: 'users', name: '사용자 관리', parentCode: 'area', route: '/admin/user/manage' },
      { code: 'menus', name: '메뉴 관리', parentCode: 'area', route: '/admin/system/menus' },
      { code: 'notes', name: '쪽지', parentCode: null, route: '/note' },
    ];
    const allMenus = menus.map((menu) => `NAVIGATION:${menu.code}`);

    // 사용자 조회 권한만 있으면 메뉴 관리 화면에는 들어갈 수 없다. 분류와 /admin 밖 화면은 대상이 아니다.
    expect(selectedMenusWithoutEntryPermission(menus, new Set([...allMenus, 'OPERATION:USER_READ']))).toEqual(['메뉴 관리']);
    expect(selectedMenusWithoutEntryPermission(menus, new Set([...allMenus, 'OPERATION:USER_READ', 'OPERATION:MENU_READ']))).toEqual([]);
    // 선택하지 않은 메뉴는 알리지 않는다.
    expect(selectedMenusWithoutEntryPermission(menus, new Set(['NAVIGATION:notes']))).toEqual([]);
  });
});
