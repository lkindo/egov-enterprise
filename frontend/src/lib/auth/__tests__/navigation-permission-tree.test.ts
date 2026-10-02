import { describe, expect, it } from 'vitest';
import { buildNavigationPermissionTree, menusMissingEntryPermission, navigationSelectionGaps, selectedMenusWithoutEntryPermission, toggleNavigationPermission } from '../navigation-permission-tree';

const navigation = [
  { code: 'child-b', name: '두 번째 자식', parentCode: 'root', route: null, useYn: 'Y' as const },
  { code: 'other', name: '다른 메뉴', parentCode: null, route: null, useYn: 'Y' as const },
  { code: 'root', name: '상위 메뉴', parentCode: null, route: null, useYn: 'Y' as const },
  { code: 'child-a', name: '첫 번째 자식', parentCode: 'root', route: null, useYn: 'Y' as const },
  { code: 'leaf', name: '하위 메뉴', parentCode: 'child-a', route: null, useYn: 'Y' as const },
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
    const tree = buildNavigationPermissionTree(items.map((item) => ({ ...item, route: null, useYn: 'Y' as const })));
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
      { code: 'area', name: '관리', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'users', name: '사용자 관리', parentCode: 'area', route: '/admin/user/manage', useYn: 'Y' as const },
      { code: 'menus', name: '메뉴 관리', parentCode: 'area', route: '/admin/system/menus', useYn: 'Y' as const },
      { code: 'notes', name: '쪽지', parentCode: null, route: '/note', useYn: 'Y' as const },
    ];
    const allMenus = menus.map((menu) => `NAVIGATION:${menu.code}`);

    // 사용자 조회 권한만 있으면 메뉴 관리 화면에는 들어갈 수 없다. 분류와 /admin 밖 화면은 대상이 아니다.
    expect(selectedMenusWithoutEntryPermission(menus, new Set([...allMenus, 'OPERATION:USER_READ']))).toEqual(['메뉴 관리']);
    expect(selectedMenusWithoutEntryPermission(menus, new Set([...allMenus, 'OPERATION:USER_READ', 'OPERATION:MENU_READ']))).toEqual([]);
    // 선택하지 않은 메뉴는 알리지 않는다.
    expect(selectedMenusWithoutEntryPermission(menus, new Set(['NAVIGATION:notes']))).toEqual([]);
  });

  /*
   * [2026-10-02 관리 콘솔 UX 1단계] 경고만으로는 고칠 수 없었다 — 메뉴마다 필요한 권한과 판정 방식(ANY/ALL)을
   * 라우트 게이트와 같은 등록 원장에서 읽어, 편집기가 '진입 권한 추가'를 초안에 더할 수 있게 한다.
   */
  it('진입 권한이 없는 메뉴마다 필요한 권한과 판정 방식을 라우트 게이트 원장에서 돌려준다', () => {
    const menus = [
      { code: 'menus', name: '메뉴 관리', parentCode: null, route: '/admin/system/menus?tab=TREE', useYn: 'Y' as const },
      { code: 'authority', name: '권한 그룹 관리', parentCode: null, route: '/admin/security/authority', useYn: 'Y' as const },
      { code: 'polls', name: '투표 관리', parentCode: null, route: '/admin/survey/polls', useYn: 'Y' as const },
      { code: 'ghost', name: '없는 화면', parentCode: null, route: '/admin/unregistered-only-in-test/page', useYn: 'Y' as const },
      { code: 'area', name: '분류', parentCode: null, route: null, useYn: 'Y' as const },
      { code: 'notes', name: '쪽지', parentCode: null, route: '/note', useYn: 'Y' as const },
    ];
    const selection = new Set([...menus.map((menu) => `NAVIGATION:${menu.code}`), 'OPERATION:POLL_READ']);
    expect(menusMissingEntryPermission(menus, selection)).toEqual([
      { code: 'menus', name: '메뉴 관리', route: '/admin/system/menus', required: ['MENU_READ'], mode: 'ANY', fixable: true },
      { code: 'authority', name: '권한 그룹 관리', route: '/admin/security/authority', required: ['AUTHRT_READ', 'AUTHRT_AUDIT'], mode: 'ANY', fixable: true },
      // ALL 은 하나만 있어서는 열리지 않는다.
      { code: 'polls', name: '투표 관리', route: '/admin/survey/polls', required: ['POLL_READ', 'POLL_READ_ALL'], mode: 'ALL', fixable: true },
      // 등록되지 않은 /admin 경로는 어떤 기능권한으로도 열리지 않는다 — 고칠 수 있다고 말하지 않는다.
      { code: 'ghost', name: '없는 화면', route: '/admin/unregistered-only-in-test/page', required: [], mode: 'ANY', fixable: false },
    ]);
    // 경고 이름 목록과 같은 판정이다.
    expect(selectedMenusWithoutEntryPermission(menus, selection)).toEqual(['메뉴 관리', '권한 그룹 관리', '투표 관리', '없는 화면']);
  });

  it('필요한 권한을 모두 더하면 그 메뉴는 목록에서 빠진다', () => {
    const menus = [
      { code: 'polls', name: '투표 관리', parentCode: null, route: '/admin/survey/polls', useYn: 'Y' as const },
      { code: 'authority', name: '권한 그룹 관리', parentCode: null, route: '/admin/security/authority', useYn: 'Y' as const },
    ];
    const navigation = menus.map((menu) => `NAVIGATION:${menu.code}`);
    expect(menusMissingEntryPermission(menus, new Set([...navigation, 'OPERATION:POLL_READ', 'OPERATION:POLL_READ_ALL', 'OPERATION:AUTHRT_AUDIT']))).toEqual([]);
    expect(menusMissingEntryPermission(menus, new Set([...navigation, 'OPERATION:POLL_READ_ALL', 'OPERATION:AUTHRT_READ'])).map((menu) => menu.code)).toEqual(['polls']);
  });
});
