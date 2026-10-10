import { describe, expect, it } from 'vitest';
import { SCREEN_ALIASES, SCREEN_REGISTRY, type ScreenRegistryEntry } from '@/types/generated-screen-registry';
import { canAddScreensToMenus, resolveMenuScreen, screensWithoutMenu } from '../menu-screen-resolution';
import { pageInProjection } from '@/test-utils/projection';

// 기능 예시(별칭·모두 충족 판정)는 그 화면이 투영으로 빠진 생성물에서 뺀다 — page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).
//   앱 설정 리다이렉트는 화면 파일이 없으므로 목적지 화면으로 판정한다(목적지가 빠지면 투영이 그 리다이렉트를 걷는다).

/**
 * 메뉴 → 화면 공용 판정(관리 콘솔 2단계 D3·D4). 화면 관리와 권한 작업대가 같은 판정을 쓴다 — 메뉴가 런타임에 실제로
 * 여는 화면이고, 별칭은 한 번 따라가며, 동적 세그먼트로만 맞은 별칭은 따라가지 않는다. '메뉴에 없는 화면' 은 동적이 아닌
 * 화면 가운데 사용 중인 메뉴로 열리지 않는 화면이다.
 */
function screen(route: string): ScreenRegistryEntry {
  const found = SCREEN_REGISTRY.find((entry) => entry.route === route);
  if (!found) throw new Error(`화면 목록에 ${route} 가 없다`);
  return found;
}

function alias(route: string) {
  const found = SCREEN_ALIASES.find((entry) => entry.route === route);
  if (!found) throw new Error(`별칭 목록에 ${route} 가 없다`);
  return found;
}

describe('resolveMenuScreen', () => {
  it('메뉴 경로의 쿼리·해시·끝 슬래시를 떼고 여는 화면을 찾는다', () => {
    expect(resolveMenuScreen('/admin/system/programs')).toStrictEqual({ screen: screen('/admin/system/programs'), viaAlias: null });
    expect(resolveMenuScreen('/admin/system/menus?tab=TREE#top')?.screen.route).toBe('/admin/system/menus');
    expect(resolveMenuScreen('/admin/system/programs/')?.screen.route).toBe('/admin/system/programs');
  });

  it('정적 경로가 동적 형제를 이기고, 동적 경로는 그 화면으로 잇는다', () => {
    expect(resolveMenuScreen('/smart-toolkit/dept-job/create')?.screen.route).toBe('/smart-toolkit/dept-job/create');
    expect(resolveMenuScreen('/smart-toolkit/dept-job/42')?.screen.route).toBe('/smart-toolkit/dept-job/[id]');
  });

  it('별칭을 가리키는 메뉴는 그 목적지 화면으로 한 번 따라간다', () => {
    if (pageInProjection('/admin/collaboration/address-book/select-address-book-list')) {
      expect(alias('/admin/collaboration/address-book').target).toBe('/admin/collaboration/address-book/select-address-book-list');
      expect(resolveMenuScreen('/admin/collaboration/address-book')).toStrictEqual({
        screen: screen('/admin/collaboration/address-book/select-address-book-list'),
        viaAlias: '/admin/collaboration/address-book',
      });
    }
    // 앱 설정이 넘기는 별칭도 같다(목적지의 쿼리는 화면 판정에 쓰지 않는다).
    if (pageInProjection('/admin/survey/hub')) {
      expect(resolveMenuScreen('/admin/survey/manage/')).toStrictEqual({ screen: screen('/admin/survey/hub'), viaAlias: '/admin/survey/manage' });
    }
  });

  /*
   * 레거시 게시판 경로는 화면 파일 없이 앱 설정(next.config)만 넘긴다. 생성 목록이 그 리다이렉트를 별칭으로 싣지 않으면
   * 같은 세그먼트 수의 동적 별칭 /admin/community/boards/[id](게시글 작성으로 넘김)가 맞아, 이 메뉴가 게시글 작성 화면의
   * 연결 메뉴로 잘못 세진다(2026-10-02 검토 P1). 앱 설정이 실제로 넘기는 게시판 목록으로 센다.
   */
  if (pageInProjection('/admin/community/boards/select-board-list')) it('화면 파일이 없는 앱 설정 리다이렉트는 앱 설정이 넘기는 화면으로 센다', () => {
    expect(alias('/admin/community/boards/selectBoardList')).toStrictEqual({
      route: '/admin/community/boards/selectBoardList',
      target: '/admin/community/boards/select-board-list',
      kind: 'config-redirect',
    });
    expect(resolveMenuScreen('/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000001')).toStrictEqual({
      screen: screen('/admin/community/boards/select-board-list'),
      viaAlias: '/admin/community/boards/selectBoardList',
    });
    expect(resolveMenuScreen('/admin/community/boards/insertBoardArticle')?.screen.route).toBe('/admin/community/boards/insert-board-article');
  });

  it('동적 세그먼트로만 맞은 별칭은 따라가지 않는다 — 넘어가는 곳을 단정할 수 없다', () => {
    if (pageInProjection('/admin/community/boards/[id]')) expect(alias('/admin/community/boards/[id]').target).toBe('/admin/community/boards/insert-board-article');
    expect(resolveMenuScreen('/admin/community/boards/12')).toBeNull();
    if (pageInProjection('/admin/community/[id]')) expect(alias('/admin/community/[id]').target).toBe('/cop/cmy/selectCommunityDetail/${id}');
    expect(resolveMenuScreen('/admin/community/7')).toBeNull();
    expect(resolveMenuScreen('/admin/collaboration/scraps/selectScrapDetail/3')).toBeNull();
    // 동적 세그먼트 없이 정확히 맞는 별칭은 따라간다.
    if (pageInProjection('/admin/collaboration/scraps/selectScrapList')) {
      expect(resolveMenuScreen('/admin/collaboration/scraps/insertScrap')?.screen.route).toBe('/admin/collaboration/scraps/selectScrapList');
    }
  });

  if (pageInProjection('/admin/survey/manage/create')) it('별칭은 한 번만 따라간다 — 목적지가 또 별칭이면 판정하지 않는다', () => {
    expect(alias('/admin/survey/manage/create').target).toBe('/admin/survey/manage');
    expect(alias('/admin/survey/manage').kind).toBe('config-redirect');
    expect(resolveMenuScreen('/admin/survey/manage/create')).toBeNull();
  });

  it('라우트가 없거나 사이드바가 열지 않는 경로는 어떤 화면도 열지 않는다', () => {
    for (const route of [null, undefined, '', '   ', ' /admin/system/programs', 'dir', '#', '?tab=A',
      'https://evil.example/admin/system/programs', '//evil.example/admin/system/programs', '/admin//system/programs',
      'selectMenuList.do', '/admin/workspace/my-page']) {
      expect(resolveMenuScreen(route), JSON.stringify(route)).toBeNull();
    }
  });

  it('내부 경로 해석이 거부하는 경로는 동적 화면의 값 자리에 맞더라도 화면을 열지 않는다', () => {
    // 경로 판정(findScreen)만 보면 동적 세그먼트가 아무 값이나 받아 '..'·인코딩된 구분자도 상세 화면으로 풀린다.
    for (const route of ['/smart-toolkit/dept-job/..', '/smart-toolkit/dept-job/%2F', '/smart-toolkit/dept-job/%2e%2e']) {
      expect(resolveMenuScreen(route), route).toBeNull();
    }
    expect(resolveMenuScreen('/smart-toolkit/dept-job/7')?.screen.route).toBe('/smart-toolkit/dept-job/[id]');
  });
});

describe('screensWithoutMenu', () => {
  const staticScreens = SCREEN_REGISTRY.filter((entry) => !entry.dynamic).map((entry) => entry.route);

  it('메뉴가 없으면 동적 경로가 아닌 모든 화면이다(화면 목록 순서)', () => {
    expect(screensWithoutMenu([]).map((entry) => entry.route)).toEqual(staticScreens);
    expect(staticScreens.length).toBeLessThan(SCREEN_REGISTRY.length);
  });

  it('사용 중인 메뉴가 여는 화면만 뺀다 — 사용 안 함 메뉴만 가리키는 화면은 메뉴에 없다', () => {
    const without = (menus: Parameters<typeof screensWithoutMenu>[0]) => screensWithoutMenu(menus).map((entry) => entry.route);
    expect(without([{ route: '/admin/system/programs?tab=x', useYn: 'Y' }])).not.toContain('/admin/system/programs');
    expect(without([{ route: '/admin/system/programs', useYn: 'N' }])).toContain('/admin/system/programs');
    // 사용 여부를 모르면 사용 중으로 단정하지 않는다.
    expect(without([{ route: '/admin/system/programs', useYn: null }])).toContain('/admin/system/programs');
    expect(without([{ route: '/admin/system/programs', useYn: 'N' }, { route: '/admin/system/programs/', useYn: 'Y' }]))
      .not.toContain('/admin/system/programs');
  });

  it('메뉴 경로 판정은 resolveMenuScreen 과 같다 — 별칭은 따라가고 동적 별칭은 따라가지 않는다', () => {
    const without = (route: string) => screensWithoutMenu([{ route, useYn: 'Y' }]).map((entry) => entry.route);
    expect(without('/admin/collaboration/address-book')).not.toContain('/admin/collaboration/address-book/select-address-book-list');
    expect(without('/admin/community/boards/selectBoardList')).not.toContain('/admin/community/boards/select-board-list');
    // 동적 별칭으로만 맞은 경로는 어떤 화면도 열지 않는다 — 게시글 작성 화면을 메뉴에 있다고 세지 않는다.
    expect(without('/admin/community/boards/12')).toEqual(staticScreens);
    expect(without('')).toEqual(staticScreens);
  });

  it('동적 경로 화면은 메뉴에 둘 수 없어 세지 않는다', () => {
    const dynamic = SCREEN_REGISTRY.filter((entry) => entry.dynamic);
    expect(dynamic.length).toBeGreaterThan(0);
    expect(screensWithoutMenu([]).some((entry) => entry.dynamic)).toBe(false);
  });

  it('모집단을 주면 그 화면들 가운데서 판정한다', () => {
    const population = [screen('/admin/system/programs'), screen('/admin/system/menus'), screen('/smart-toolkit/dept-job/[id]')];
    expect(screensWithoutMenu([{ route: '/admin/system/menus', useYn: 'Y' }], population).map((entry) => entry.route))
      .toEqual(['/admin/system/programs']);
  });
});

describe('canAddScreensToMenus', () => {
  const subject = (permissions: string[]) => ({ permissions, authorizationVersion: 'v1' });

  it('새 메뉴 등록과 구조 저장 권한이 모두 있어야 한다', () => {
    expect(canAddScreensToMenus(subject(['MENU_CREATE', 'MENU_UPDATE']))).toBe(true);
    expect(canAddScreensToMenus(subject(['MENU_CREATE']))).toBe(false);
    expect(canAddScreensToMenus(subject(['MENU_UPDATE']))).toBe(false);
    expect(canAddScreensToMenus({ permissions: ['MENU_CREATE', 'MENU_UPDATE'] })).toBe(false);
    expect(canAddScreensToMenus(null)).toBe(false);
  });
});
