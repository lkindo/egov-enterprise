import { describe, expect, it } from 'vitest';
import { PAGE_PERMISSIONS } from '@/types/generated-permissions';
import { SCREEN_ALIASES, SCREEN_REGISTRY, type ScreenRegistryEntry } from '@/types/generated-screen-registry';
import type { MenuStructureItem } from '@/services/foundation/system/MenuAdminService';
import {
  UNKNOWN_SCREEN_LABEL,
  aliasKindLabel,
  aliasTargetLabel,
  canAddScreenToMenu,
  createScreenMenuLinkLookup,
  filterAliases,
  filterScreens,
  isScreenWithoutMenu,
  listedAliases,
  listedScreens,
  noMenuOptionHint,
  opensWithLoginOnly,
  screenBadges,
  screenDisplayName,
  screenEntrySummary,
  screenKindFilterUnavailableReason,
  screenListFallbackMessage,
  screenMenuLinkSummary,
  screenPermissionName,
  type ScreenMenuLinkCell,
} from '../screenList';

/**
 * 화면 관리의 화면 목록 순수 계산(2026-10-02 D3). 생성된 화면 목록(SCREEN_REGISTRY)이 원천이고, 이 계산은 그것을
 * 거르고 메뉴 구조와 잇는다. 인가가 아니다 — 진입 권한 문구는 라우트 게이트(canEnterRegisteredPage)와 같은 뜻으로만 말한다.
 */
function screen(route: string): ScreenRegistryEntry {
  const found = SCREEN_REGISTRY.find((entry) => entry.route === route);
  if (!found) throw new Error(`화면 목록에 ${route} 가 없다`);
  return found;
}

function menu(menuNo: number, menuNm: string, modernRoute: string | null, useYn: 'Y' | 'N' = 'Y'): MenuStructureItem {
  return { menuNo, menuNm, upMenuSn: null, menuOrdr: menuNo, modernRoute, menuExpln: null, useYn, prgrmFileNm: null };
}

describe('listedScreens', () => {
  it('라우트 게이트가 아는 화면만 남긴다 — 등록되지 않은 경로는 빠진다', () => {
    const unregistered: ScreenRegistryEntry = {
      ...screen('/admin/system/programs'),
      route: '/admin/system/not-registered-screen',
    };
    expect(Object.hasOwn(PAGE_PERMISSIONS, unregistered.route)).toBe(false);
    expect(listedScreens([screen('/admin/system/programs'), unregistered]).map((entry) => entry.route))
      .toEqual(['/admin/system/programs']);
  });

  it('생성된 화면 목록의 모든 화면이 진입 권한 표에 있다(재사용 투영본에서 빠진 화면은 둘 다에서 빠진다)', () => {
    expect(listedScreens().length).toBe(SCREEN_REGISTRY.length);
    expect(listedScreens().length).toBeGreaterThan(50);
  });
});

describe('표시 이름', () => {
  it('화면 이름이 없으면 지어내지 않고 이름 미확인이다', () => {
    expect(screenDisplayName({ ...screen('/admin/system/programs'), label: null })).toBe(UNKNOWN_SCREEN_LABEL);
    expect(screenDisplayName(screen('/admin/system/programs'))).toBe('화면 관리');
  });

  it('권한 이름은 화면 목록에 적힌 행위로 업무와 행위를 갈라 짓는다', () => {
    expect(screenPermissionName(screen('/admin/system/programs'), 'PROGRAM_READ')).toBe('프로그램 · 조회');
    // 행위가 밑줄을 품어도(ADMIN_READ) 앞에서 자르지 않는다.
    expect(screenPermissionName(screen('/admin'), 'DASHBOARD_ADMIN_READ')).toBe('대시보드 · 관리 조회');
    // 업무 영역이 밑줄을 품어도(SURVEY_RSP) 행위로 정확히 가른다.
    expect(screenPermissionName(screen('/admin/survey/hub'), 'SURVEY_RSP_READ')).toBe('설문 응답 · 조회');
    // 화면 목록에 그 권한의 행위가 없으면 코드를 그대로 보인다(이름을 지어내지 않는다).
    expect(screenPermissionName({ ...screen('/admin/system/programs'), permissions: [] }, 'PROGRAM_READ')).toBe('PROGRAM_READ');
  });
});

describe('screenEntrySummary', () => {
  it('권한이 하나면 이름이 곧 조건이다', () => {
    expect(screenEntrySummary(screen('/admin/system/programs'))).toStrictEqual({
      permissions: [{ code: 'PROGRAM_READ', name: '프로그램 · 조회' }],
      rule: null,
    });
  });

  it('여럿이면 ANY 는 하나라도, ALL 은 모두 있어야 열린다', () => {
    const any = screenEntrySummary(screen('/admin/security/authority'));
    expect(any.permissions.map((permission) => permission.code)).toEqual(['AUTHRT_READ', 'AUTHRT_AUDIT']);
    expect(any.rule).toBe('하나라도 있으면 열림');
    expect(screenEntrySummary(screen('/admin/survey/polls')).rule).toBe('모두 있어야 열림');
  });

  it('진입 권한이 없으면 로그인만 하면 열리고, 공개 화면은 로그인하지 않아도 열린다', () => {
    expect(screenEntrySummary(screen('/admin/help'))).toStrictEqual({ permissions: [], rule: '로그인만 하면 열림' });
    expect(opensWithLoginOnly(screen('/admin/help'))).toBe(true);
    expect(screenEntrySummary(screen('/login')).rule).toBe('로그인하지 않아도 열림');
    expect(opensWithLoginOnly(screen('/login'))).toBe(false);
    expect(opensWithLoginOnly(screen('/admin/system/programs'))).toBe(false);
  });
});

describe('canAddScreenToMenu', () => {
  it('동적 경로가 아닌 화면만 메뉴에 추가할 수 있다', () => {
    expect(canAddScreenToMenu(screen('/admin/system/programs'))).toBe(true);
    expect(canAddScreenToMenu(screen('/smart-toolkit/dept-job/[id]'))).toBe(false);
  });
});

/*
 * 메뉴 경로 → 화면 판정(별칭 따라가기·동적 별칭 거부·'메뉴에 없는 화면')은 권한 작업대와 같은 공용 판정이다 — 그 규칙의
 * 단위 계약은 lib/navigation/__tests__/menu-screen-resolution.test.ts 가 소유한다. 여기서는 화면 관리가 그 판정으로 연결
 * 메뉴 칸과 '메뉴 없음' 을 만드는지 본다.
 */
describe('createScreenMenuLinkLookup', () => {
  const lookup = createScreenMenuLinkLookup({
    status: 'loaded',
    menus: [
      menu(30, '화면 관리', '/admin/system/programs'),
      menu(12, '옛 화면 관리', '/admin/system/programs/', 'N'),
      menu(40, '주소록', '/admin/collaboration/address-book'),
      menu(50, '옛 도움말', '/admin/help?tab=FAQ', 'N'),
      menu(60, '게시판(레거시 경로)', '/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000001'),
      menu(70, '게시글 하나', '/admin/community/boards/12'),
      menu(1, '관리 센터', null),
      menu(2, '빈 경로', ''),
    ],
  });

  it('화면을 여는 메뉴를 이름 순으로 세고, 사용 안 함과 별칭 경유를 표시한다', () => {
    const cell = lookup('/admin/system/programs');
    expect(cell).toStrictEqual({
      kind: 'linked',
      menus: [
        { menuNo: 12, menuNm: '옛 화면 관리', inUse: false, viaAlias: null },
        { menuNo: 30, menuNm: '화면 관리', inUse: true, viaAlias: null },
      ],
      withoutMenu: false,
    });
    expect(screenMenuLinkSummary(cell)).toBe('연결 메뉴 2개');
    expect(lookup('/admin/collaboration/address-book/select-address-book-list')).toStrictEqual({
      kind: 'linked',
      menus: [{ menuNo: 40, menuNm: '주소록', inUse: true, viaAlias: '/admin/collaboration/address-book' }],
      withoutMenu: false,
    });
  });

  it('레거시 게시판 경로 메뉴는 앱 설정이 넘기는 게시판 목록에 세고, 동적 별칭으로만 맞는 메뉴는 어디에도 세지 않는다', () => {
    expect(lookup('/admin/community/boards/select-board-list')).toStrictEqual({
      kind: 'linked',
      menus: [{ menuNo: 60, menuNm: '게시판(레거시 경로)', inUse: true, viaAlias: '/admin/community/boards/selectBoardList' }],
      withoutMenu: false,
    });
    // 게시글 작성 화면으로 넘기는 동적 별칭(/admin/community/boards/[id])을 따라가지 않는다.
    expect(lookup('/admin/community/boards/insert-board-article')).toStrictEqual({ kind: 'none', withoutMenu: true });
  });

  it('사용 안 함 메뉴만 가리키는 화면은 연결로 보이되 메뉴에 없는 화면이다', () => {
    const cell = lookup('/admin/help');
    expect(cell).toStrictEqual({
      kind: 'linked',
      menus: [{ menuNo: 50, menuNm: '옛 도움말', inUse: false, viaAlias: null }],
      withoutMenu: true,
    });
    expect(screenMenuLinkSummary(cell)).toBe('연결 메뉴 1개(모두 사용 안 함)');
    expect(isScreenWithoutMenu(cell)).toBe(true);
  });

  it('여는 메뉴가 없으면 연결 없음이다(동적 경로 화면은 메뉴에 없는 화면이 아니다)', () => {
    const cell = lookup('/admin/system/menus');
    expect(cell).toStrictEqual({ kind: 'none', withoutMenu: true });
    expect(screenMenuLinkSummary(cell)).toBe('연결 없음');
    expect(lookup('/smart-toolkit/dept-job/[id]')).toStrictEqual({ kind: 'none', withoutMenu: false });
  });

  it('메뉴를 불러오는 중이거나 거부·실패하면 모든 화면이 그 상태다 — 연결 없음으로 말하지 않는다', () => {
    expect(createScreenMenuLinkLookup({ status: 'checking' })('/admin/system/programs')).toStrictEqual({ kind: 'checking' });
    expect(createScreenMenuLinkLookup({ status: 'forbidden' })('/admin/system/programs')).toStrictEqual({ kind: 'forbidden' });
    expect(createScreenMenuLinkLookup({ status: 'failed' })('/admin/system/programs')).toStrictEqual({ kind: 'failed' });
    expect(screenMenuLinkSummary({ kind: 'checking' })).toBe('연결 메뉴를 불러오는 중…');
    expect(screenMenuLinkSummary({ kind: 'forbidden' })).toBe('메뉴 조회 권한 없음');
    expect(screenMenuLinkSummary({ kind: 'failed' })).toBe('메뉴를 불러오지 못함');
  });
});

describe('screenBadges', () => {
  it('메뉴 없음은 메뉴 구조를 불러왔을 때만 붙인다', () => {
    expect(screenBadges(screen('/admin/system/programs'), { kind: 'none', withoutMenu: true })).toEqual(['메뉴 없음']);
    for (const cell of [{ kind: 'checking' }, { kind: 'forbidden' }, { kind: 'failed' }] as const) {
      expect(screenBadges(screen('/admin/system/programs'), cell)).toEqual([]);
      expect(isScreenWithoutMenu(cell)).toBe(false);
    }
  });

  it('진입 권한이 없으면 제한 없음, 공개 화면은 공개 화면, 동적 경로는 동적 경로다', () => {
    const linked: ScreenMenuLinkCell = {
      kind: 'linked', menus: [{ menuNo: 1, menuNm: '위키', inUse: true, viaAlias: null }], withoutMenu: false,
    };
    expect(screenBadges(screen('/admin/help'), linked)).toEqual(['제한 없음']);
    expect(screenBadges(screen('/login'), { kind: 'none', withoutMenu: true })).toEqual(['메뉴 없음', '공개 화면']);
  });

  it('메뉴 없음은 연결 칸에 실린 공용 판정을 따른다 — 사용 안 함 메뉴만 연결돼도 메뉴 없음, 동적 경로는 아니다', () => {
    const unusedOnly: ScreenMenuLinkCell = {
      kind: 'linked', menus: [{ menuNo: 1, menuNm: '옛 메뉴', inUse: false, viaAlias: null }], withoutMenu: true,
    };
    expect(screenBadges(screen('/admin/system/menus'), unusedOnly)).toEqual(['메뉴 없음']);
    expect(screenBadges(screen('/smart-toolkit/dept-job/[id]'), { kind: 'none', withoutMenu: false })).toEqual(['제한 없음', '동적 경로']);
    expect(isScreenWithoutMenu({ kind: 'none', withoutMenu: false })).toBe(false);
    expect(isScreenWithoutMenu({ kind: 'none', withoutMenu: true })).toBe(true);
  });
});

/*
 * '메뉴에 추가' 의 메뉴 권한(MENU_CREATE·MENU_UPDATE)은 메뉴를 실제로 만드는 메뉴 관리 화면의 권한이다. 화면 관리 줄에
 * 세면 권한 작업대의 화면별 권한 표가 그 둘을 화면 관리의 등록·수정 칸에 프로그램 권한과 섞어 보인다(2026-10-02 검토 P1).
 * 판정이 화면 파일의 canPermission 리터럴로 돌아오면 생성 목록이 이 줄에 다시 센다.
 */
describe('화면 관리 줄의 권한', () => {
  it('메뉴 관리의 등록·수정 권한을 화면 관리의 권한으로 세지 않는다', () => {
    const codes = screen('/admin/system/programs').permissions.map((permission) => permission.code);
    expect(codes).toEqual(expect.arrayContaining(['PROGRAM_CREATE', 'PROGRAM_UPDATE', 'PROGRAM_DELETE']));
    expect(codes).not.toContain('MENU_CREATE');
    expect(codes).not.toContain('MENU_UPDATE');
    // 메뉴 관리 화면은 자기 권한으로 갖는다.
    expect(screen('/admin/system/menus').permissions.map((permission) => permission.code))
      .toEqual(expect.arrayContaining(['MENU_CREATE', 'MENU_UPDATE']));
  });
});

describe('filterScreens', () => {
  const screens = [
    screen('/admin/system/programs'),
    screen('/admin/system/menus'),
    screen('/admin/help'),
    screen('/smart-toolkit/dept-job/[id]'),
    screen('/login'),
  ];
  const loaded = { status: 'loaded' as const, menus: [menu(30, '화면 관리', '/admin/system/programs')] };
  const linkOf = createScreenMenuLinkLookup(loaded);

  it('검색어는 화면 이름·경로를 대소문자 없이 본다', () => {
    expect(filterScreens(screens, { keyword: '화면 관리', kind: 'all' }, linkOf).map((entry) => entry.route))
      .toEqual(['/admin/system/programs']);
    expect(filterScreens(screens, { keyword: '  /ADMIN/SYSTEM ', kind: 'all' }, linkOf).map((entry) => entry.route))
      .toEqual(['/admin/system/programs', '/admin/system/menus']);
  });

  it('구분은 메뉴에 없는 화면·로그인만 하면 열리는 화면·동적 경로로 거른다', () => {
    // 메뉴에 없는 화면에 동적 경로 화면은 들지 않는다(메뉴에 둘 수 없다).
    expect(filterScreens(screens, { keyword: '', kind: 'no-menu' }, linkOf).map((entry) => entry.route))
      .toEqual(['/admin/system/menus', '/admin/help', '/login']);
    expect(filterScreens(screens, { keyword: '', kind: 'login-only' }, linkOf).map((entry) => entry.route))
      .toEqual(['/admin/help', '/smart-toolkit/dept-job/[id]']);
    expect(filterScreens(screens, { keyword: '', kind: 'dynamic' }, linkOf).map((entry) => entry.route))
      .toEqual(['/smart-toolkit/dept-job/[id]']);
    // 사용 안 함 메뉴만 가리키는 화면은 사용 중인 메뉴로 열리지 않는다 — 메뉴에 없는 화면이다.
    const unusedOnly = createScreenMenuLinkLookup({ status: 'loaded', menus: [menu(30, '옛 화면 관리', '/admin/system/programs', 'N')] });
    expect(filterScreens(screens, { keyword: '', kind: 'no-menu' }, unusedOnly).map((entry) => entry.route))
      .toEqual(['/admin/system/programs', '/admin/system/menus', '/admin/help', '/login']);
  });

  it('메뉴 구조를 모르면 메뉴에 없는 화면으로 거르지 않고 그 이유를 말한다 — 전체를 메뉴 없음으로도, 0건으로도 말하지 않는다', () => {
    for (const source of [{ status: 'checking' }, { status: 'forbidden' }, { status: 'failed' }] as const) {
      const lookup = createScreenMenuLinkLookup(source);
      expect(filterScreens(screens, { keyword: '', kind: 'no-menu' }, lookup)).toEqual([]);
      expect(screenKindFilterUnavailableReason('no-menu', source)).toMatch(/메뉴에 없는 화면/);
      // 다른 구분은 메뉴 구조와 무관하게 거른다.
      expect(screenKindFilterUnavailableReason('dynamic', source)).toBeNull();
      expect(filterScreens(screens, { keyword: '', kind: 'dynamic' }, lookup)).toHaveLength(1);
    }
    expect(screenKindFilterUnavailableReason('no-menu', { status: 'forbidden' })).toBe('메뉴 조회 권한이 없어 메뉴에 없는 화면을 거를 수 없습니다.');
    expect(screenKindFilterUnavailableReason('no-menu', loaded)).toBeNull();
  });

  it('메뉴에 없는 화면 선택지를 고를 수 없는 동안은 불러오는 중에도 그 이유를 말한다(G10)', () => {
    expect(noMenuOptionHint({ status: 'checking' })).toBe('메뉴 구조를 불러오는 중이라 아직 메뉴에 없는 화면으로 거를 수 없습니다.');
    expect(noMenuOptionHint({ status: 'forbidden' })).toBe('메뉴 조회 권한이 없어 메뉴에 없는 화면으로 거를 수 없습니다.');
    expect(noMenuOptionHint({ status: 'failed' })).toBe('메뉴 구조를 불러오지 못해 메뉴에 없는 화면으로 거를 수 없습니다.');
    expect(noMenuOptionHint(loaded)).toBeNull();
  });

  it('구분을 골랐으면 그 구분에 해당하는 화면이 없다고 말한다(G15)', () => {
    expect(screenListFallbackMessage('all')).toBe('표시할 화면이 없습니다.');
    expect(screenListFallbackMessage('dynamic')).toBe('선택한 구분에 해당하는 화면이 없습니다.');
  });
});

describe('별칭', () => {
  it('경로 순으로 보이고, 넘기는 곳을 말한다', () => {
    const aliases = listedAliases();
    expect(aliases.map((alias) => alias.route)).toEqual([...aliases.map((alias) => alias.route)].sort());
    expect(aliases.length).toBe(SCREEN_ALIASES.length);
    expect(aliasKindLabel({ route: '/a', target: '/b', kind: 'page-redirect' })).toBe('화면 파일이 넘김');
    expect(aliasKindLabel({ route: '/a', target: '/b', kind: 'config-redirect' })).toBe('앱 설정이 넘김');
  });

  it('목적지의 템플릿 자리표시자는 화면 경로 표기로 보이고, 모르는 목적지는 지어내지 않는다', () => {
    expect(SCREEN_ALIASES.find((alias) => alias.route === '/admin/community/[id]')?.target).toBe('/cop/cmy/selectCommunityDetail/${id}');
    expect(aliasTargetLabel('/cop/cmy/selectCommunityDetail/${id}')).toBe('/cop/cmy/selectCommunityDetail/[id]');
    expect(aliasTargetLabel('/a/${kind}/b/${id}')).toBe('/a/[kind]/b/[id]');
    expect(aliasTargetLabel('/admin/help?tab=COMMUNITY')).toBe('/admin/help?tab=COMMUNITY');
    expect(aliasTargetLabel(null)).toBe('목적지 미확인');
  });

  it('검색어로 경로·목적지를 거른다', () => {
    const aliases = [
      { route: '/admin/survey', target: '/admin/survey/hub', kind: 'page-redirect' as const },
      { route: '/admin/system/ism', target: '/approvals', kind: 'page-redirect' as const },
      { route: '/admin/x', target: null, kind: 'config-redirect' as const },
    ];
    expect(filterAliases(aliases, '')).toHaveLength(3);
    expect(filterAliases(aliases, 'APPROVALS').map((alias) => alias.route)).toEqual(['/admin/system/ism']);
    expect(filterAliases(aliases, 'survey').map((alias) => alias.route)).toEqual(['/admin/survey']);
  });
});
