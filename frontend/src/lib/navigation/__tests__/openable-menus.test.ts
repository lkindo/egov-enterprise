import { describe, expect, it } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { openableMenus } from '../openable-menus';

/**
 * [2026-10-01] 메뉴는 라우트 게이트와 같은 판정으로 보인다.
 *
 * 서버의 메뉴 트리는 메뉴 배정(NAVIGATION)만 보고, `/admin` 진입은 기능 권한(OPERATION)으로 막는다. 둘이 어긋나면
 * 사용자는 메뉴를 보지만 누를 때마다 사유 없이 홈으로 되돌려진다.
 */
let nextNo = 1;
function menu(menuNm: string, modernRoute?: string, children?: MenuInfo[]): MenuInfo {
  const menuNo = nextNo++;
  return { menuNo, menuNm, upperMenuId: 0, upMenuSn: 0, menuOrdr: menuNo, modernRoute, children };
}

const reader = (...permissions: string[]) => ({ permissions, authorizationVersion: 'v1' });
const names = (menus: readonly MenuInfo[]): unknown[] =>
  menus.map((item) => (item.children?.length ? [item.menuNm, names(item.children)] : item.menuNm));

describe('openableMenus', () => {
  it('기능 권한이 없어 들어갈 수 없는 관리 메뉴는 보이지 않는다', () => {
    const tree = [
      menu('관리', undefined, [
        menu('사용자 관리', '/admin/user/manage', []),
        menu('메뉴 관리', '/admin/system/menus', []),
      ]),
    ];

    expect(names(openableMenus(tree, reader('USER_READ')))).toEqual([['관리', ['사용자 관리']]]);
    expect(names(openableMenus(tree, reader('USER_READ', 'MENU_READ')))).toEqual([['관리', ['사용자 관리', '메뉴 관리']]]);
  });

  it('열 수 있는 하위가 하나도 남지 않은 분류는 함께 뺀다 — 눌러도 갈 곳 없는 항목을 남기지 않는다', () => {
    const tree = [
      menu('업무', undefined, [menu('쪽지', '/note', [])]),
      menu('관리', undefined, [menu('사용자 관리', '/admin/user/manage', [])]),
    ];

    expect(names(openableMenus(tree, reader()))).toEqual([['업무', ['쪽지']]]);
  });

  it('/admin 밖의 메뉴는 페이지 게이트가 없으므로 그대로 둔다', () => {
    const tree = [menu('쪽지', '/note', []), menu('결재함', '/approvals', [])];
    expect(names(openableMenus(tree, reader()))).toEqual(['쪽지', '결재함']);
  });

  it('자기 경로는 열 수 없고 하위만 열 수 있으면, 경로를 떼어 분류로만 남긴다', () => {
    const tree = [menu('사용자 관리', '/admin/user/manage', [menu('쪽지', '/note', [])])];
    const [kept] = openableMenus(tree, reader());

    expect(kept.menuNm).toBe('사용자 관리');
    expect(kept.modernRoute).toBeUndefined();
    expect(names(kept.children ?? [])).toEqual(['쪽지']);
    // 원본 트리는 바꾸지 않는다 — react-query 캐시의 데이터다.
    expect(tree[0].modernRoute).toBe('/admin/user/manage');
  });

  it('등록되지 않은 관리 경로는 누구에게도 열리지 않으므로 보이지 않는다', () => {
    const tree = [menu('없는 화면', '/admin/no-such-screen', [])];
    expect(openableMenus(tree, reader('USER_READ'))).toEqual([]);
  });

  it('하위를 아직 불러오지 않은 분류는 판정할 수 없으므로 그대로 둔다', () => {
    const tree = [menu('관리')];
    expect(names(openableMenus(tree, reader()))).toEqual(['관리']);
  });

  it('권한 상태를 아직 모르면 거르지 않는다 — 로딩 중에 메뉴가 사라졌다 나타나지 않는다', () => {
    const tree = [menu('관리', undefined, [menu('사용자 관리', '/admin/user/manage', [])])];

    expect(names(openableMenus(tree, null))).toEqual([['관리', ['사용자 관리']]]);
    expect(names(openableMenus(tree, { permissions: [] }))).toEqual([['관리', ['사용자 관리']]]);
  });

  it('쿼리가 붙은 메뉴 경로도 같은 라우트로 판정한다', () => {
    const tree = [menu('권한 그룹', '/admin/security/authority?tab=GROUPS', [])];

    expect(names(openableMenus(tree, reader('AUTHRT_READ')))).toEqual(['권한 그룹']);
    expect(openableMenus(tree, reader('USER_READ'))).toEqual([]);
  });
});
