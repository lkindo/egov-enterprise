import { describe, expect, it } from 'vitest';
import type { MenuInfo } from '@/types/foundation/menu';
import { pageInProjection } from '@/test-utils/projection';
import { resolveMenuInternalRoute } from '../internal-route';
import { openableMenus } from '../openable-menus';
import {
  MENU_HIDDEN_REASON_LABELS, grantSets, menuPreviewKey, menuPreviewMenusFromCatalog, previewMenuVisibility,
  type MenuHiddenReason, type MenuPreviewMenu, type MenuPreviewNode,
} from '../menu-visibility-preview';

/**
 * [2026-10-02 F0] 메뉴 미리보기는 사이드바와 같은 규칙이어야 한다 — 서버 메뉴 트리(MenuService#buildMenuTree: 메뉴 표시 ∧
 * 사용 ∧ 상위가 남음) 뒤에 화면 걸러내기(openableMenus: 라우트 게이트와 같은 진입 판정)를 거친다.
 */
function menu(menuNo: number | string, menuNm: string, upMenuSn: number | string | null, modernRoute: string | null = null, extra: Partial<MenuPreviewMenu> = {}): MenuPreviewMenu {
  return { menuNo, menuNm, upMenuSn, menuOrdr: typeof menuNo === 'number' ? menuNo : 100, modernRoute, useYn: 'Y', ...extra };
}

const names = (nodes: readonly MenuPreviewNode[]): unknown[] =>
  nodes.map((node) => (node.children.length ? [node.menuNm, names(node.children)] : node.menuNm));

function reasons(preview: ReturnType<typeof previewMenuVisibility>): Record<string, MenuHiddenReason | null> {
  return Object.fromEntries([...preview.byMenu].map(([key, value]) => [key, value.reason]));
}

describe('previewMenuVisibility — 숨는 이유', () => {
  const menus = [
    menu(1, '관리', null),
    menu(2, '사용자 관리', 1, '/admin/user/manage'),
    menu(3, '메뉴 관리', 1, '/admin/system/menus'),
    menu(4, '쪽지', 1, '/note'),
    menu(5, '없는 화면', 1, '/admin/no-such-screen'),
    menu(6, '쉬는 메뉴', 1, '/note', { useYn: 'N' }),
    menu(7, '업무', null),
    menu(8, '결재함', 7, '/approvals'),
  ];

  it('메뉴 표시·사용 여부·상위·진입 권한·등록 여부를 사이드바 순서대로 판정한다', () => {
    const preview = previewMenuVisibility({ menus, navigation: [1, 2, 3, 4, 5, 6, 8], operations: ['USER_READ'] });

    expect(names(preview.tree)).toEqual([['관리', ['사용자 관리', '쪽지']]]);
    expect(reasons(preview)).toEqual({
      1: null, 2: null, 4: null,
      3: 'no-entry-permission',
      5: 'unregistered-route',
      6: 'unused',
      7: 'no-navigation',
      8: 'parent-hidden',
    });
  });

  it('상위의 메뉴 표시를 회수하면 하위는 모두 상위 메뉴 숨김이다 — 상위 표시는 묵시로 생기지 않는다', () => {
    const preview = previewMenuVisibility({ menus, navigation: [2, 3, 4], operations: ['USER_READ', 'MENU_READ'] });

    expect(preview.tree).toEqual([]);
    expect(preview.byMenu.get('2')).toMatchObject({ visible: false, reason: 'parent-hidden', canEnter: true });
    expect(preview.byMenu.get('1')).toMatchObject({ visible: false, reason: 'no-navigation', route: null, canEnter: null });
  });

  it('여러 이유가 겹치면 그 메뉴 자신의 사실을 먼저 말한다: 사용 안 함 → 메뉴 표시 없음 → 상위 메뉴 숨김', () => {
    const preview = previewMenuVisibility({
      menus: [menu(1, '분류', null), menu(2, '꺼진 화면', 1, '/note', { useYn: 'N' }), menu(3, '배정 없는 화면', 1, '/note')],
      navigation: [],
      operations: [],
    });

    expect(preview.byMenu.get('2')?.reason).toBe('unused');
    expect(preview.byMenu.get('3')?.reason).toBe('no-navigation');
  });

  it('상위 번호가 없는 메뉴(고아)와 순환은 최상위에 닿지 못해 숨는다 — 무한히 돌지 않는다', () => {
    const preview = previewMenuVisibility({
      menus: [menu(1, '고아', 999, '/note'), menu(2, '가', 3, '/note'), menu(3, '나', 2, '/note'), menu(4, '자기 자신', 4, '/note')],
      navigation: [1, 2, 3, 4],
      operations: [],
    });

    expect(preview.tree).toEqual([]);
    expect(Object.values(reasons(preview))).toEqual(['parent-hidden', 'parent-hidden', 'parent-hidden', 'parent-hidden']);
  });

  it('열 수 있는 하위가 하나도 남지 않은 분류는 숨고, 열 수 있는 하위가 있으면 자기 경로를 떼고 분류로 남는다', () => {
    const tree = [
      menu(1, '보안', null),
      menu(2, '권한 그룹', 1, '/admin/security/authority'),
      menu(3, '사용자 관리', null, '/admin/user/manage'),
      menu(4, '쪽지', 3, '/note'),
    ];
    const preview = previewMenuVisibility({ menus: tree, navigation: [1, 2, 3, 4], operations: [] });

    expect(names(preview.tree)).toEqual([['사용자 관리', ['쪽지']]]);
    expect(preview.byMenu.get('1')?.reason).toBe('no-openable-children');
    expect(preview.byMenu.get('2')?.reason).toBe('no-entry-permission');
    // 보이지만 자기 경로는 열 수 없다 — 사이드바는 경로 없는 분류로 그린다.
    expect(preview.byMenu.get('3')).toMatchObject({ visible: true, reason: null, route: '/admin/user/manage', canEnter: false });
    expect(preview.tree[0].route).toBeNull();
  });

  // 지금 사이드바의 사실이다 — 서버 calculateUrl 이 라우트 없는 메뉴에 chkURL '#' 를 싣고, openableMenus 의 '빈 분류' 규칙은
  // chkURL 이 비었을 때만 걸린다. openableMenus 가 '#' 를 주소 없음으로 보도록 바뀌면 이 단언도 같은 변경에서 바꾼다
  // (아래 대조 테스트는 두 쪽이 같은 함수를 쓰므로 그대로 통과한다).
  it('경로도 하위도 없는 메뉴는 보인다 — 서버가 chkURL 을 싣고 사이드바가 누를 수 없는 흐린 항목으로 그린다', () => {
    const preview = previewMenuVisibility({
      menus: [
        menu(1, '빈 섹션', null),
        menu(2, '하위가 서버 단계에서 숨은 섹션', null), menu(3, '표시 없는 화면', 2, '/note'), menu(4, '꺼진 화면', 2, '/note', { useYn: 'N' }),
        menu(5, '하위가 화면 단계에서 숨은 섹션', null), menu(6, '권한 없는 화면', 5, '/admin/system/menus'),
      ],
      navigation: [1, 2, 4, 5, 6],
      operations: [],
    });

    expect(names(preview.tree)).toEqual(['빈 섹션', '하위가 서버 단계에서 숨은 섹션']);
    expect(preview.byMenu.get('1')).toMatchObject({ visible: true, route: null, canEnter: null });
    // 하위가 1단계(메뉴 표시 없음·사용 안 함)에서 모두 빠진 분류는 서버 트리에서 '하위 없는 메뉴' 가 되어 보인다.
    expect(preview.byMenu.get('2')).toMatchObject({ visible: true, reason: null });
    expect(preview.byMenu.get('3')?.reason).toBe('no-navigation');
    expect(preview.byMenu.get('4')?.reason).toBe('unused');
    // 하위가 2단계(진입 권한)에서 모두 빠진 분류만 '열 수 있는 하위 메뉴 없음' 으로 숨는다.
    expect(preview.byMenu.get('5')).toMatchObject({ visible: false, reason: 'no-openable-children' });
    expect(preview.byMenu.get('6')?.reason).toBe('no-entry-permission');
  });

  it('메뉴 표시는 없지만 진입 권한이 있는 화면은 canEnter 로 드러난다 — 메뉴 없이 주소로만 열린다', () => {
    const preview = previewMenuVisibility({ menus: [menu(1, '관리', null), menu(2, '사용자 관리', 1, '/admin/user/manage')], navigation: [1], operations: ['USER_READ'] });

    expect(preview.byMenu.get('2')).toMatchObject({ visible: false, reason: 'no-navigation', canEnter: true });
  });

  // 예시 화면이 투영으로 빠진 생성물에서는 그 예시만 뺀다 — 라우트의 page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).
  if (pageInProjection('/admin/survey/polls')) it('ALL 모드 경로는 모든 권한이 있어야 열린다(라우트 게이트와 같다)', () => {
    const menus = [menu(1, '여론조사', null, '/admin/survey/polls')];
    expect(previewMenuVisibility({ menus, navigation: [1], operations: ['POLL_READ'] }).byMenu.get('1')?.reason).toBe('no-entry-permission');
    expect(previewMenuVisibility({ menus, navigation: [1], operations: ['POLL_READ', 'POLL_READ_ALL'] }).byMenu.get('1')?.visible).toBe(true);
  });
});

describe('previewMenuVisibility — 입력 모양', () => {
  it('권한 코드 문자열과 메뉴 번호는 같은 메뉴다 — 카탈로그·grant matrix 의 NAVIGATION 코드를 그대로 넘길 수 있다', () => {
    const preview = previewMenuVisibility({ menus: [menu(10, '쪽지', null, '/note')], navigation: ['10'], operations: [] });
    expect(preview.byMenu.get(menuPreviewKey(10))?.visible).toBe(true);
  });

  it('저장 전 초안의 새 메뉴 키(new-1)도 메뉴·상위·메뉴 표시에 쓸 수 있다', () => {
    const preview = previewMenuVisibility({
      menus: [menu('new-1', '새 섹션', null, null, { menuOrdr: 1 }), menu('new-2', '새 화면', 'new-1', '/note', { menuOrdr: 1 }), menu(5, '옮긴 화면', 'new-1', '/approvals', { menuOrdr: 2 })],
      navigation: ['new-1', 'new-2'],
      operations: [],
    });

    expect(names(preview.tree)).toEqual([['새 섹션', ['새 화면']]]);
    expect(preview.tree[0].children[0].menuNo).toBe('new-2');
    expect(preview.byMenu.get('5')?.reason).toBe('no-navigation');
  });

  it('라우트 없음은 null 과 빈 문자열이 같고, 최상위는 null·0 이 같다', () => {
    const preview = previewMenuVisibility({ menus: [menu(1, '가', 0, ''), menu(2, '나', null, null)], navigation: [1, 2], operations: [] });
    expect(preview.byMenu.get('1')).toEqual(preview.byMenu.get('2'));
    expect(names(preview.tree)).toEqual(['가', '나']);
  });

  it('형제는 menuOrdr, 같으면 메뉴 번호 순이다 — 입력 순서와 무관하다', () => {
    const preview = previewMenuVisibility({
      menus: [menu(3, '다', null, '/note', { menuOrdr: 1 }), menu(2, '나', null, '/note', { menuOrdr: 1 }), menu(1, '가', null, '/note', { menuOrdr: 9 })],
      navigation: [1, 2, 3],
      operations: [],
    });
    expect(names(preview.tree)).toEqual(['나', '다', '가']);
  });

  it('입력을 바꾸지 않고, 같은 키가 겹치면 처음 것만 쓴다', () => {
    const input = [menu(1, '처음', null, '/note'), menu(1, '나중', null, '/approvals')];
    const snapshot = JSON.stringify(input);
    const preview = previewMenuVisibility({ menus: input, navigation: [1], operations: [] });
    expect(names(preview.tree)).toEqual(['처음']);
    expect(preview.byMenu.size).toBe(1);
    expect(JSON.stringify(input)).toBe(snapshot);
  });

  it('grantSets 는 그룹들의 권한을 메뉴 표시·기능권한 집합으로 나눈다(사용자 미리보기의 합집합)', () => {
    const groups = [
      [{ type: 'NAVIGATION', code: '1' }, { type: 'OPERATION', code: 'USER_READ' }],
      [{ type: 'NAVIGATION', code: '2' }, { type: 'OPERATION', code: 'USER_READ' }, { type: 'LEGACY', code: 'X' }],
    ];
    const sets = grantSets(groups.flat());
    expect([...sets.navigation]).toEqual(['1', '2']);
    expect([...sets.operations]).toEqual(['USER_READ']);
  });

  it('권한 카탈로그 메뉴 목록을 그대로 입력으로 쓸 수 있다 — 카탈로그 순서가 형제 순서다', () => {
    const preview = previewMenuVisibility({
      menus: menuPreviewMenusFromCatalog([
        { code: '7', name: '업무', parentCode: null, route: null, useYn: 'Y' },
        { code: '9', name: '결재함', parentCode: '7', route: '/approvals', useYn: 'Y' },
        { code: '8', name: '쪽지', parentCode: '7', route: '/note', useYn: 'Y' },
        { code: '6', name: '쉬는 메뉴', parentCode: '7', route: '/note', useYn: 'N' },
      ]),
      navigation: ['7', '8', '9', '6'],
      operations: [],
    });
    expect(names(preview.tree)).toEqual([['업무', ['결재함', '쪽지']]]);
    expect(preview.byMenu.get('6')?.reason).toBe('unused');
  });

  it('숨는 이유마다 화면 문구가 있다', () => {
    const all: MenuHiddenReason[] = ['no-navigation', 'unused', 'parent-hidden', 'no-entry-permission', 'unregistered-route', 'no-openable-children'];
    expect(Object.keys(MENU_HIDDEN_REASON_LABELS).sort()).toEqual([...all].sort());
    for (const label of Object.values(MENU_HIDDEN_REASON_LABELS)) expect(label).not.toMatch(/노드|매트릭스|허브/);
  });
});

/**
 * 대조 — 같은 입력이면 사이드바와 같은 결과다. 서버 MenuService#buildMenuTree 를 그대로 옮긴 참조 구현(2-pass, 정렬
 * up_menu_sn ASC NULLS LAST·menu_ordr ASC, chkURL 은 calculateUrl 처럼 라우트, 없으면 빈 값이 아닌 서버 분기 중 하나)에
 * openableMenus 를 붙인 결과와
 * 미리보기의 보이는 트리(이름·순서·경로)가 같고, 숨는 이유의 단계(서버 단계 / 화면 단계)가 참조 구현과 맞아야 한다.
 */
describe('previewMenuVisibility — 사이드바 규칙 대조', () => {
  const ROUTES = [null, '', '/note', '/approvals', '/admin/user/manage', '/admin/system/menus', '/admin/security/authority?tab=GROUPS',
    '/admin/no-such-screen', '/admin/survey/polls', 'legacy/menu.do', 'dir', 'https://example.invalid/x'];
  const PERMISSIONS = ['USER_READ', 'MENU_READ', 'AUTHRT_READ', 'POLL_READ', 'POLL_READ_ALL'];

  function random(seed: number) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6d2b79f5) >>> 0;
      let t = state;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  /**
   * 라우트 없는 메뉴에 서버 calculateUrl 이 실을 수 있는 빈 값이 아닌 chkURL — '#'(분류·dir), '/'(파일명으로 추정 못 함),
   * 프로그램 파일명에서 추론한 경로. 마지막 값은 2026-10-04 프로그램 목록 퇴역 전 서버가 싣던 프로그램 원장 URL 모양이다 —
   * 지금은 나오지 않지만 해석기가 받지 않음을 함께 확인한다. 미리보기는 늘 '#' 를 싣지만 결과가 같아야 한다.
   * 퇴역 뒤 서버 chkURL 은 빈 문자열이 되지 않으므로 '' 는 넣지 않는다.
   */
  const SERVER_FALLBACK_URLS = ['#', '/', '/admin/system/menus', '/admin/community', 'https://example.invalid/legacy'];

  /** MenuService#buildMenuTree 의 참조 구현(서버 단계). */
  function referenceServerTree(menus: readonly MenuPreviewMenu[], navigation: ReadonlySet<string>, fallbackUrl: (menuNo: number) => string = () => '#'): MenuInfo[] {
    const filtered = menus
      .filter((item) => navigation.has(String(item.menuNo)) && item.useYn === 'Y')
      .sort((left, right) => {
        const a = left.upMenuSn as number | null;
        const b = right.upMenuSn as number | null;
        if (a !== b) return a === null ? 1 : b === null ? -1 : a - b;
        return (left.menuOrdr - right.menuOrdr) || ((left.menuNo as number) - (right.menuNo as number));
      });
    const dtoMap = new Map<number, MenuInfo & { upper: number | null }>();
    for (const item of filtered) {
      dtoMap.set(item.menuNo as number, {
        menuNo: item.menuNo as number, menuNm: item.menuNm, upperMenuId: 0, upMenuSn: 0, menuOrdr: item.menuOrdr,
        modernRoute: item.modernRoute ?? undefined, chkURL: item.modernRoute ? item.modernRoute : fallbackUrl(item.menuNo as number), useYn: 'Y', children: [],
        upper: item.upMenuSn as number | null,
      });
    }
    const roots: MenuInfo[] = [];
    for (const dto of dtoMap.values()) {
      if (dto.upper === null || dto.upper === 0) roots.push(dto);
      else dtoMap.get(dto.upper)?.children?.push(dto);
    }
    return roots;
  }

  // 사이드바(NavItem)와 같은 해석기로 경로를 본다 — 분류로 남은 메뉴는 경로가 떼어져 null 이다.
  const flatten = (nodes: readonly MenuInfo[], depth = 0): string[] =>
    nodes.flatMap((node) => [`${depth}:${node.menuNo}:${node.menuNm}:${resolveMenuInternalRoute(node) ?? '-'}`, ...flatten(node.children ?? [], depth + 1)]);
  const flattenPreview = (nodes: readonly MenuPreviewNode[], depth = 0): string[] =>
    nodes.flatMap((node) => [`${depth}:${node.menuNo}:${node.menuNm}:${node.route ?? '-'}`, ...flattenPreview(node.children, depth + 1)]);
  const keysOf = (nodes: readonly MenuInfo[]): Set<string> => new Set(flatten(nodes).map((line) => line.split(':')[1]));

  it('무작위 메뉴 숲 400개에서 사이드바(참조 서버 트리 → openableMenus)와 보이는 트리·숨는 단계가 같다', () => {
    const next = random(20261002);
    for (let round = 0; round < 400; round += 1) {
      const count = 1 + Math.floor(next() * 14);
      const numbers = Array.from({ length: count }, (_, index) => index + 1).sort(() => next() - 0.5);
      const menus: MenuPreviewMenu[] = numbers.map((menuNo) => {
        const roll = next();
        const upMenuSn = roll < 0.4 ? null : roll < 0.95 ? numbers[Math.floor(next() * count)] : 999;
        return {
          menuNo, menuNm: `메뉴${menuNo}`, upMenuSn, menuOrdr: 1 + Math.floor(next() * 5),
          modernRoute: ROUTES[Math.floor(next() * ROUTES.length)], useYn: next() < 0.85 ? 'Y' : 'N',
        };
      });
      const navigation = new Set(numbers.filter(() => next() < 0.75).map(String));
      const operations = PERMISSIONS.filter(() => next() < 0.5);
      const fallback = new Map(numbers.map((menuNo) => [menuNo, SERVER_FALLBACK_URLS[Math.floor(next() * SERVER_FALLBACK_URLS.length)]]));
      const context = JSON.stringify({ round, menus, navigation: [...navigation], operations, fallback: [...fallback] });

      const serverTree = referenceServerTree(menus, navigation, (menuNo) => fallback.get(menuNo) ?? '#');
      const sidebar = openableMenus(serverTree, { permissions: operations, authorizationVersion: 'v1' });
      const preview = previewMenuVisibility({ menus, navigation, operations });

      // 보이는 트리: 같은 메뉴, 같은 깊이, 같은 형제 순서, 같은 경로(경로를 뗀 분류 포함).
      expect(flattenPreview(preview.tree), context).toEqual(flatten(sidebar));

      const inServer = keysOf(serverTree);
      const inSidebar = keysOf(sidebar);
      for (const [key, visibility] of preview.byMenu) {
        expect(visibility.visible, `${context} menu ${key}`).toBe(inSidebar.has(key));
        if (visibility.visible) continue;
        const serverStage = visibility.reason === 'unused' || visibility.reason === 'no-navigation' || visibility.reason === 'parent-hidden';
        // 서버 단계 이유 ⇔ 서버 트리에 없다. 화면 단계 이유 ⇒ 서버 트리에는 있었다.
        expect(serverStage, `${context} menu ${key} ${visibility.reason}`).toBe(!inServer.has(key));
      }
    }
  });
});
