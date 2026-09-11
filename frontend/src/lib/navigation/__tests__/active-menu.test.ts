import { describe, expect, it } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { findActiveMenu } from '../active-menu';

const menu = (menuNo: number, modernRoute?: string, children?: MenuInfo[]): MenuInfo => ({
  menuNo, menuNm: `메뉴 ${menuNo}`, upperMenuId: 0, upMenuSn: 0, menuOrdr: menuNo, modernRoute, children,
});
const match = (menus: MenuInfo[], path: string, query = '') => findActiveMenu(menus, path, new URLSearchParams(query));

describe('one canonical menu from the current tree and URL', () => {
  it('uses exact tab identity and ignores additional search, paging and query order', () => {
    const menus = [menu(1, '/hub'), menu(2, '/hub?tab=manage'), menu(3, '/hub?tab=stats')];
    expect(match(menus, '/hub', 'keyword=abc&page=2&tab=stats')?.menuNo).toBe(3);
    expect(match(menus, '/hub', 'page=2')?.menuNo).toBe(1);
    expect(match([menu(2, '/hub?tab=manage')], '/hub', 'tab=stats')).toBeNull();
  });

  it('prefers an exact board identifier over a generic detail route and conflicting tab', () => {
    const menus = [menu(1, '/boards?bbsId=BOARD_AB'), menu(2, '/boards?bbsId=BOARD_A&tab=FAQ'), menu(3, '/boards/detail')];
    expect(match(menus, '/boards/detail', 'bbsId=BOARD_A&tab=WIKI&pstSn=1')?.menuNo).toBe(2);
    expect(match(menus, '/boards/detail', 'bbsId=BOARD_UNKNOWN')?.menuNo).toBe(3);
  });

  it('chooses the most specific node and returns its complete ancestor path at any depth', () => {
    const leaf = menu(4, '/hub/deep');
    const menus = [menu(1, '/hub', [menu(2, undefined, [menu(3, undefined, [leaf])])])];
    expect(match(menus, '/hub/deep')?.menuNo).toBe(4);
    expect(match(menus, '/hub/deep')?.topMenuNo).toBe(1);
    expect(match(menus, '/hub/deep')?.ancestorMenuNos).toEqual([1, 2, 3]);
    expect(match(menus, '/hub/deep')?.path.map((item) => item.menuNo)).toEqual([1, 2, 3, 4]);
  });

  it('preserves the current list menu on detail pages without allowing partial segment matches', () => {
    expect(match([menu(1, '/hub')], '/hub/detail/2')?.menuNo).toBe(1);
    expect(match([menu(1, '/hub')], '/hub-archive')).toBeNull();
    expect(match([menu(1, '/')], '/other')).toBeNull();
  });

  it('uses the final redirected URL and picks one stable node for duplicate destinations', () => {
    const menus = [menu(1, '/admin/security/role'), menu(2, '/admin/security/authority'), menu(3, '/admin/security/authority')];
    expect(match(menus, '/admin/security/authority/')?.menuNo).toBe(2);
  });

  it('does not navigate unsafe metadata or select inactive branches and terminates on cycles', () => {
    const cyclic = menu(1);
    cyclic.children = [cyclic, menu(2, '//external.example/')];
    expect(match([cyclic], '/')).toBeNull();
    expect(match([{ ...menu(3, '/hub', [menu(4, '/hub/detail')]), useYn: 'N' }], '/hub/detail')).toBeNull();
    expect(match([], '/hub')).toBeNull();
  });
});
