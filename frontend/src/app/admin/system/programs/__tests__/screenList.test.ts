import { describe, expect, it } from 'vitest';
import { PAGE_PERMISSIONS } from '@/types/generated-permissions';
import { SCREEN_ALIASES, SCREEN_REGISTRY, type ScreenRegistryEntry } from '@/types/generated-screen-registry';
import type { MenuStructureItem } from '@/services/foundation/system/MenuAdminService';
import { pageInProjection } from '@/test-utils/projection';
import {
  SCREEN_VIEW_OPTIONS,
  UNKNOWN_SCREEN_LABEL,
  aliasKindLabel,
  aliasTargetLabel,
  canAddScreenToMenu,
  createScreenMenuLinkLookup,
  defaultScreenView,
  filterAliases,
  filterScreens,
  isScreenWithMenu,
  isScreenWithoutMenu,
  listedAliases,
  listedScreens,
  menuViewHint,
  opensWithLoginOnly,
  screenBadges,
  screenDisplayName,
  screenEntryMarker,
  screenEntrySummary,
  screenKindFilterUnavailableReason,
  screenListFallbackMessage,
  screenMenuLinkNeedsDetails,
  screenMenuLinkSummary,
  screenPermissionName,
  screenSearchField,
  screenViewCounts,
  viewNeedsMenuStructure,
  viewOffersMenuAdd,
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
  return { menuNo, menuNm, upMenuSn: null, menuOrdr: menuNo, modernRoute, menuExpln: null, useYn };
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
    // 빈 목록을 막는 하한이다 — 원본 92·collaboration 52·core 37개(2026-10-10 실측). 가장 작은 생성물에서도 성립해야 한다.
    expect(listedScreens().length).toBeGreaterThan(30);
  });
});

describe('표시 이름', () => {
  it('화면 이름이 없으면 지어내지 않고 이름 미확인이다', () => {
    expect(screenDisplayName({ ...screen('/admin/system/programs'), label: null })).toBe(UNKNOWN_SCREEN_LABEL);
    expect(screenDisplayName(screen('/admin/system/programs'))).toBe('화면 관리');
  });

  it('권한 이름은 화면 목록에 적힌 행위로 업무와 행위를 갈라 짓는다', () => {
    // [2026-10-04 프로그램 목록 퇴역] 화면 관리의 진입 권한이 PROGRAM_READ 에서 MENU_READ 로 바뀌었다.
    expect(screenPermissionName(screen('/admin/system/programs'), 'MENU_READ')).toBe('메뉴 · 조회');
    // 행위가 밑줄을 품어도(ADMIN_READ) 앞에서 자르지 않는다.
    expect(screenPermissionName(screen('/admin'), 'DASHBOARD_ADMIN_READ')).toBe('대시보드 · 관리 조회');
    // 업무 영역이 밑줄을 품어도(SURVEY_RSP) 행위로 정확히 가른다.
    // 기능 예시(별칭·모두 충족 판정)는 그 화면이 투영으로 빠진 생성물에서 뺀다 — page 파일이 원장에 있고 실제로 없을 때다(원본에서는 그대로다).
    if (pageInProjection('/admin/survey/hub')) expect(screenPermissionName(screen('/admin/survey/hub'), 'SURVEY_RSP_READ')).toBe('설문 응답 · 조회');
    // 화면 목록에 그 권한의 행위가 없으면 코드를 그대로 보인다(이름을 지어내지 않는다).
    expect(screenPermissionName({ ...screen('/admin/system/programs'), permissions: [] }, 'MENU_READ')).toBe('MENU_READ');
  });
});

describe('screenEntrySummary', () => {
  it('권한이 하나면 이름이 곧 조건이다', () => {
    expect(screenEntrySummary(screen('/admin/system/programs'))).toStrictEqual({
      permissions: [{ code: 'MENU_READ', name: '메뉴 · 조회' }],
      rule: null,
    });
  });

  it('여럿이면 ANY 는 하나라도, ALL 은 모두 있어야 열린다', () => {
    const any = screenEntrySummary(screen('/admin/security/authority'));
    expect(any.permissions.map((permission) => permission.code)).toEqual(['AUTHRT_READ', 'AUTHRT_AUDIT']);
    expect(any.rule).toBe('하나라도 있으면 열림');
    if (pageInProjection('/admin/survey/polls')) expect(screenEntrySummary(screen('/admin/survey/polls')).rule).toBe('모두 있어야 열림');
  });

  it('진입 권한이 없으면 로그인만 하면 열리고, 공개 화면은 로그인하지 않아도 열린다', () => {
    // 예시는 모든 생성물에 남는 통합 검색이다(로그인만 하면 열리는 정적 화면).
    expect(screenEntrySummary(screen('/search'))).toStrictEqual({ permissions: [], rule: '로그인만 하면 열림' });
    expect(opensWithLoginOnly(screen('/search'))).toBe(true);
    expect(screenEntrySummary(screen('/login')).rule).toBe('로그인하지 않아도 열림');
    expect(opensWithLoginOnly(screen('/login'))).toBe(false);
    expect(opensWithLoginOnly(screen('/admin/system/programs'))).toBe(false);
  });

  /*
   * [2026-10-05 한 줄 행] 권한이 둘 이상이면 칩 앞에 '모두'(ALL)·'하나'(ANY) 표지를 두고 그 뜻(열리는 조건)을 함께 싣는다.
   * (종전의 칩 전체 표기 함수 screenPermissionFullLabel 은 칩의 hover title 을 걷으며 소비처가 없어져 걷었다 — 2026-10-05 반박 리뷰.)
   */
  it('권한이 둘 이상이면 모두·하나 표지와 그 뜻을 싣고, 하나 이하면 표지가 없다', () => {
    expect(screenEntryMarker(screen('/admin/security/authority'))).toStrictEqual({ label: '하나', rule: '하나라도 있으면 열림' });
    if (pageInProjection('/admin/survey/polls')) expect(screenEntryMarker(screen('/admin/survey/polls'))).toStrictEqual({ label: '모두', rule: '모두 있어야 열림' });
    expect(screenEntryMarker(screen('/admin/system/programs'))).toBeNull();
    expect(screenEntryMarker(screen('/search'))).toBeNull();
  });

  /*
   * [2026-10-05 반박 리뷰] 화면 목록의 진입 권한 칸은 권한이 하나면 이름 칩만 보이고 코드는 보조기술용 글자로만 둔다(코드를
   * 생략하는 내부 표기로 판정 — 헌법 제16조 4항). 그 판정의 전제는 이름만으로 권한을 가리킬 수 있다는 것이다. 다른 권한이 같은
   * 이름을 갖게 되면 이 테스트가 실패한다 — 그때는 코드를 화면에 보일지 다시 판정한다.
   */
  it('화면 목록의 진입 권한 이름은 코드와 일대일이다(이름만으로 권한을 가리킬 수 있다)', () => {
    const codesByName = new Map<string, Set<string>>();
    for (const entry of listedScreens()) {
      for (const permission of screenEntrySummary(entry).permissions) {
        const codes = codesByName.get(permission.name) ?? new Set<string>();
        codes.add(permission.code);
        codesByName.set(permission.name, codes);
      }
    }
    expect(codesByName.size).toBeGreaterThan(0);
    expect([...codesByName].filter(([, codes]) => codes.size > 1).map(([name, codes]) => `${name}: ${[...codes].join(', ')}`)).toEqual([]);
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
      menu(50, '옛 통합 검색', '/search?tab=MENU', 'N'),
      menu(60, '게시판(레거시 경로)', '/admin/community/boards/selectBoardList?bbsId=BBSMSTR_000000000001'),
      menu(70, '게시글 하나', '/admin/community/boards/12'),
      menu(1, '관리 센터', null),
      menu(2, '빈 경로', ''),
    ],
  });

  /*
   * [2026-10-05 한 줄 행] 칸에는 첫 메뉴 이름과 나머지 수('외 N개')만 보이므로 사용 중인 메뉴를 먼저 둔다 — 이름 순으로는
   * 사용 안 함 메뉴('옛 …')가 앞서 사이드바에 없는 메뉴가 그 화면의 대표처럼 보였다. 같은 사용 여부 안에서는 이름 순이다.
   */
  it('화면을 여는 메뉴를 사용 중인 메뉴 먼저 이름 순으로 세고, 사용 안 함과 별칭 경유를 표시한다', () => {
    const cell = lookup('/admin/system/programs');
    expect(cell).toStrictEqual({
      kind: 'linked',
      menus: [
        { menuNo: 30, menuNm: '화면 관리', inUse: true, viaAlias: null },
        { menuNo: 12, menuNm: '옛 화면 관리', inUse: false, viaAlias: null },
      ],
      withoutMenu: false,
    });
    expect(screenMenuLinkSummary(cell)).toBe('화면 관리 외 1개');
    expect(screenMenuLinkNeedsDetails(cell)).toBe(true);
    expect(isScreenWithMenu(cell)).toBe(true);
    // 별칭 예시(주소록)는 주소록이 투영으로 빠진 생성물에서 뺀다(원장 확인).
    if (!pageInProjection('/admin/collaboration/address-book/select-address-book-list')) return;
    const addressBook = lookup('/admin/collaboration/address-book/select-address-book-list');
    expect(addressBook).toStrictEqual({
      kind: 'linked',
      menus: [{ menuNo: 40, menuNm: '주소록', inUse: true, viaAlias: '/admin/collaboration/address-book' }],
      withoutMenu: false,
    });
    // 별칭을 거쳐 여는 메뉴 하나 — 요약은 이름 하나지만 '경유' 를 펼쳐 볼 수 있어야 한다(생략한 사실을 title 에만 두지 않는다).
    expect(screenMenuLinkSummary(addressBook)).toBe('주소록');
    expect(screenMenuLinkNeedsDetails(addressBook)).toBe(true);
  });

  it('사용 중인 메뉴 하나가 직접 여는 화면은 이름이 곧 전부라 펼치지 않는다', () => {
    const single: ScreenMenuLinkCell = {
      kind: 'linked', menus: [{ menuNo: 1, menuNm: '메뉴 관리', inUse: true, viaAlias: null }], withoutMenu: false,
    };
    expect(screenMenuLinkSummary(single)).toBe('메뉴 관리');
    expect(screenMenuLinkNeedsDetails(single)).toBe(false);
    expect(screenMenuLinkNeedsDetails({ kind: 'none', withoutMenu: true })).toBe(false);
    expect(screenMenuLinkNeedsDetails({ kind: 'failed' })).toBe(false);
    // 여럿이 모두 사용 안 함이면 그렇다고 말한다.
    expect(screenMenuLinkSummary({
      kind: 'linked',
      menus: [
        { menuNo: 2, menuNm: '가 메뉴', inUse: false, viaAlias: null },
        { menuNo: 3, menuNm: '나 메뉴', inUse: false, viaAlias: null },
      ],
      withoutMenu: true,
    })).toBe('가 메뉴 외 1개 (모두 사용 안 함)');
  });

  if (pageInProjection('/admin/community/boards/select-board-list')) it('레거시 게시판 경로 메뉴는 앱 설정이 넘기는 게시판 목록에 세고, 동적 별칭으로만 맞는 메뉴는 어디에도 세지 않는다', () => {
    expect(lookup('/admin/community/boards/select-board-list')).toStrictEqual({
      kind: 'linked',
      menus: [{ menuNo: 60, menuNm: '게시판(레거시 경로)', inUse: true, viaAlias: '/admin/community/boards/selectBoardList' }],
      withoutMenu: false,
    });
    // 게시글 작성 화면으로 넘기는 동적 별칭(/admin/community/boards/[id])을 따라가지 않는다.
    expect(lookup('/admin/community/boards/insert-board-article')).toStrictEqual({ kind: 'none', withoutMenu: true });
  });

  it('사용 안 함 메뉴만 가리키는 화면은 연결로 보이되 메뉴에 없는 화면이다', () => {
    const cell = lookup('/search');
    expect(cell).toStrictEqual({
      kind: 'linked',
      menus: [{ menuNo: 50, menuNm: '옛 통합 검색', inUse: false, viaAlias: null }],
      withoutMenu: true,
    });
    expect(screenMenuLinkSummary(cell)).toBe('옛 통합 검색 (사용 안 함)');
    expect(screenMenuLinkNeedsDetails(cell)).toBe(true);
    expect(isScreenWithoutMenu(cell)).toBe(true);
    // 사용 중인 메뉴가 열지 않으므로 메뉴에 연결된 화면이 아니다 — 둘 중 정확히 하나다.
    expect(isScreenWithMenu(cell)).toBe(false);
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
    expect(screenBadges(screen('/search'), linked)).toEqual(['제한 없음']);
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
 * 세면 권한 작업대의 화면별 권한 표가 그 둘을 화면 관리의 등록·수정 칸에 보인다(2026-10-02 검토 P1).
 * 판정이 화면 파일의 canPermission 리터럴로 돌아오면 생성 목록이 이 줄에 다시 센다.
 * [2026-10-04 프로그램 목록 퇴역] 이전 프로그램의 쓰기 권한(PROGRAM_CREATE·UPDATE·DELETE)을 걷어 이 화면은 조회 전용이다 —
 * 진입 권한(MENU_READ) 하나만 남는다.
 */
describe('화면 관리 줄의 권한', () => {
  it('메뉴 관리의 등록·수정 권한을 화면 관리의 권한으로 세지 않는다', () => {
    const codes = screen('/admin/system/programs').permissions.map((permission) => permission.code);
    expect(codes).toEqual(['MENU_READ']);
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
    screen('/search'),
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
      .toEqual(['/admin/system/menus', '/search', '/login']);
    expect(filterScreens(screens, { keyword: '', kind: 'login-only' }, linkOf).map((entry) => entry.route))
      .toEqual(['/search', '/smart-toolkit/dept-job/[id]']);
    expect(filterScreens(screens, { keyword: '', kind: 'dynamic' }, linkOf).map((entry) => entry.route))
      .toEqual(['/smart-toolkit/dept-job/[id]']);
    // 사용 안 함 메뉴만 가리키는 화면은 사용 중인 메뉴로 열리지 않는다 — 메뉴에 없는 화면이다.
    const unusedOnly = createScreenMenuLinkLookup({ status: 'loaded', menus: [menu(30, '옛 화면 관리', '/admin/system/programs', 'N')] });
    expect(filterScreens(screens, { keyword: '', kind: 'no-menu' }, unusedOnly).map((entry) => entry.route))
      .toEqual(['/admin/system/programs', '/admin/system/menus', '/search', '/login']);
  });

  /*
   * [2026-10-05 시안 복원] '메뉴에 연결된 화면' — 사용 중인 메뉴가 여는 화면. 동적 경로가 아닌 화면은 '메뉴에 연결된 화면' 과
   * '메뉴에 없는 화면' 둘 중 정확히 하나다(사용 안 함 메뉴만 가리키면 메뉴에 없는 화면). 동적 경로 화면은 어느 쪽에도 없다.
   */
  it('메뉴에 연결된 화면은 사용 중인 메뉴가 여는 화면이고, 동적 경로가 아닌 화면을 메뉴에 없는 화면과 정확히 나눈다', () => {
    expect(filterScreens(screens, { keyword: '', kind: 'linked' }, linkOf).map((entry) => entry.route))
      .toEqual(['/admin/system/programs']);
    const unusedOnly = createScreenMenuLinkLookup({ status: 'loaded', menus: [menu(30, '옛 화면 관리', '/admin/system/programs', 'N')] });
    expect(filterScreens(screens, { keyword: '', kind: 'linked' }, unusedOnly)).toEqual([]);

    // 실제 화면 목록 전체로도 나뉜다 — 화면 절반쯤을 사용 중인 메뉴에 걸고 나머지는 사용 안 함 메뉴에 건다.
    const all = listedScreens();
    const lookup = createScreenMenuLinkLookup({
      status: 'loaded',
      menus: all.filter((entry) => !entry.dynamic).map((entry, index) => menu(index + 1, `메뉴 ${index + 1}`, entry.route, index % 2 === 0 ? 'Y' : 'N')),
    });
    const linked = filterScreens(all, { keyword: '', kind: 'linked' }, lookup).map((entry) => entry.route);
    const withoutMenu = filterScreens(all, { keyword: '', kind: 'no-menu' }, lookup).map((entry) => entry.route);
    const staticRoutes = all.filter((entry) => !entry.dynamic).map((entry) => entry.route);
    expect(linked.length).toBeGreaterThan(0);
    expect(withoutMenu.length).toBeGreaterThan(0);
    expect(linked.filter((route) => withoutMenu.includes(route))).toEqual([]);
    expect([...linked, ...withoutMenu].sort()).toEqual([...staticRoutes].sort());
  });

  it('메뉴 구조를 모르면 메뉴에 연결된 화면·메뉴에 없는 화면으로 거르지 않고 그 이유를 말한다 — 전체를 메뉴 없음으로도, 0건으로도 말하지 않는다', () => {
    for (const source of [{ status: 'checking' }, { status: 'forbidden' }, { status: 'failed' }] as const) {
      const lookup = createScreenMenuLinkLookup(source);
      expect(filterScreens(screens, { keyword: '', kind: 'no-menu' }, lookup)).toEqual([]);
      expect(filterScreens(screens, { keyword: '', kind: 'linked' }, lookup)).toEqual([]);
      expect(screenKindFilterUnavailableReason('no-menu', source)).toMatch(/메뉴에 없는 화면/);
      expect(screenKindFilterUnavailableReason('linked', source)).toMatch(/메뉴에 연결된 화면/);
      // 다른 구분(과 넘어가는 경로)은 메뉴 구조와 무관하게 거른다.
      expect(screenKindFilterUnavailableReason('dynamic', source)).toBeNull();
      expect(screenKindFilterUnavailableReason('aliases', source)).toBeNull();
      expect(filterScreens(screens, { keyword: '', kind: 'dynamic' }, lookup)).toHaveLength(1);
    }
    expect(screenKindFilterUnavailableReason('no-menu', { status: 'forbidden' })).toBe('메뉴 조회 권한이 없어 메뉴에 없는 화면을 거를 수 없습니다.');
    expect(screenKindFilterUnavailableReason('linked', { status: 'checking' })).toBe('메뉴 구조를 불러오는 중이라 메뉴에 연결된 화면을 아직 거를 수 없습니다.');
    expect(screenKindFilterUnavailableReason('no-menu', loaded)).toBeNull();
    expect(screenKindFilterUnavailableReason('linked', loaded)).toBeNull();
    expect(SCREEN_VIEW_OPTIONS.filter((option) => viewNeedsMenuStructure(option.value)).map((option) => option.value))
      .toEqual(['linked', 'no-menu']);
  });

  it('메뉴 구조가 필요한 단추의 건수를 셀 수 없는 동안은 불러오는 중에도 그 이유를 말한다(G10)', () => {
    expect(menuViewHint({ status: 'checking' })).toBe('메뉴 구조를 불러오는 중이라 메뉴에 연결된 화면과 메뉴에 없는 화면을 아직 셀 수 없습니다.');
    expect(menuViewHint({ status: 'forbidden' })).toBe('메뉴 조회 권한이 없어 메뉴에 연결된 화면과 메뉴에 없는 화면을 셀 수 없습니다.');
    expect(menuViewHint({ status: 'failed' })).toBe('메뉴 구조를 불러오지 못해 메뉴에 연결된 화면과 메뉴에 없는 화면을 셀 수 없습니다.');
    expect(menuViewHint(loaded)).toBeNull();
  });

  it('구분을 골랐으면 그 구분에 해당하는 화면이 없다고 말한다(G15)', () => {
    expect(screenListFallbackMessage('all')).toBe('표시할 화면이 없습니다.');
    expect(screenListFallbackMessage('dynamic')).toBe('선택한 구분에 해당하는 화면이 없습니다.');
    expect(screenListFallbackMessage('linked')).toBe('선택한 구분에 해당하는 화면이 없습니다.');
    expect(screenListFallbackMessage('aliases')).toBe('다른 화면으로 넘어가는 경로가 없습니다.');
  });
});

/*
 * [2026-10-05 시안 복원] 보기 단추의 건수와 처음 보기. 건수는 지금 검색어를 적용한 뒤의 수라 고른 보기의 '총 N건' 과 같다.
 * 메뉴 구조를 모르면 메뉴 관련 단추의 건수는 null(화면은 '—')이다 — 0건으로 말하지 않는다.
 */
describe('보기 단추', () => {
  const screens = [
    screen('/admin/system/programs'),
    screen('/admin/system/menus'),
    screen('/search'),
    screen('/smart-toolkit/dept-job/[id]'),
    screen('/login'),
  ];
  const aliases = [
    { route: '/admin/survey', target: '/admin/survey/hub', kind: 'page-redirect' as const },
    { route: '/admin/system/ism', target: '/approvals', kind: 'page-redirect' as const },
  ];
  const loaded = { status: 'loaded' as const, menus: [menu(30, '화면 관리', '/admin/system/programs')] };

  it('보기마다 검색어를 적용한 건수를 세고, 고른 보기로 거른 수와 같다', () => {
    const linkOf = createScreenMenuLinkLookup(loaded);
    const counts = screenViewCounts(screens, aliases, '', linkOf, loaded);
    expect(counts).toStrictEqual({ all: 5, linked: 1, 'no-menu': 3, 'login-only': 2, dynamic: 1, aliases: 2 });
    for (const kind of ['all', 'linked', 'no-menu', 'login-only', 'dynamic'] as const) {
      expect(counts[kind]).toBe(filterScreens(screens, { keyword: '', kind }, linkOf).length);
    }
    expect(screenViewCounts(screens, aliases, '/admin/system', linkOf, loaded))
      .toStrictEqual({ all: 2, linked: 1, 'no-menu': 1, 'login-only': 0, dynamic: 0, aliases: 1 });
  });

  it('메뉴 구조를 모르면 메뉴 관련 보기의 건수를 세지 않는다 — 다른 보기는 그대로 센다', () => {
    for (const source of [{ status: 'checking' }, { status: 'forbidden' }, { status: 'failed' }] as const) {
      expect(screenViewCounts(screens, aliases, '', createScreenMenuLinkLookup(source), source))
        .toStrictEqual({ all: 5, linked: null, 'no-menu': null, 'login-only': 2, dynamic: 1, aliases: 2 });
    }
  });

  it('처음 보기는 메뉴 구조를 불러오면 메뉴에 없는 화면, 권한이 없거나 불러오지 못하면 전체, 불러오는 중이면 아직 정하지 않는다', () => {
    expect(defaultScreenView(loaded)).toBe('no-menu');
    expect(defaultScreenView({ status: 'forbidden' })).toBe('all');
    expect(defaultScreenView({ status: 'failed' })).toBe('all');
    expect(defaultScreenView({ status: 'checking' })).toBeNull();
  });

  it('단추는 전체·메뉴에 연결된 화면·메뉴에 없는 화면·로그인만 하면 열리는 화면·동적 경로·넘어가는 경로 순서다', () => {
    expect(SCREEN_VIEW_OPTIONS.map((option) => option.label)).toEqual([
      '전체', '메뉴에 연결된 화면', '메뉴에 없는 화면', '로그인만 하면 열리는 화면', '동적 경로', '넘어가는 경로',
    ]);
  });

  /*
   * [2026-10-05 반박 리뷰] '메뉴에 추가' 는 메뉴에 없는 화면이 행으로 나올 수 있는 보기에만 놓인다. 화면은 이 판정 하나로
   * '관리' 열과 실패 안내의 '메뉴에 추가' 문장을 정한다 — 단추가 원래 없는 보기에서 그 단추가 사라졌다고 말하지 않는다.
   */
  it('메뉴에 추가가 놓일 수 있는 보기는 전체·메뉴에 없는 화면·로그인만 하면 열리는 화면이다', () => {
    expect(SCREEN_VIEW_OPTIONS.filter((option) => viewOffersMenuAdd(option.value)).map((option) => option.value))
      .toEqual(['all', 'no-menu', 'login-only']);
    expect(viewOffersMenuAdd(null)).toBe(false);
  });

  it('검색어 칸은 지금 보기에서 실제로 거르는 칸을 말한다(넘어가는 경로는 이름이 없고 넘어가는 곳을 찾는다)', () => {
    for (const option of SCREEN_VIEW_OPTIONS.filter((candidate) => candidate.value !== 'aliases')) {
      expect(screenSearchField(option.value)).toEqual({ label: '화면 이름 · 경로', placeholder: '화면 이름 또는 경로로 검색' });
    }
    expect(screenSearchField(null).label).toBe('화면 이름 · 경로');
    expect(screenSearchField('aliases')).toEqual({ label: '경로 · 넘어가는 곳', placeholder: '경로 또는 넘어가는 곳으로 검색' });
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
    if (pageInProjection('/admin/community/[id]')) {
      expect(SCREEN_ALIASES.find((alias) => alias.route === '/admin/community/[id]')?.target).toBe('/cop/cmy/selectCommunityDetail/${id}');
    }
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
