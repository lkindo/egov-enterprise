import { describe, expect, it } from 'vitest';
import {
  boardEntryPaths,
  boardMenuRoute,
  findBoardMenuLinks,
  publicationReadiness,
  summarizeBoardMenuLinks,
  type BoardCommunityInput,
  type BoardGroupInput,
  type BoardMenuInput,
  type GroupSource,
  type MenuSource,
} from '../board-menu-links';

/**
 * 게시판 ↔ 메뉴 연결·노출·공개 준비 판정(ADR-0040 결정 8). 메뉴는 공유 스냅숏(config/project-composer-menus.json)의 허브 메뉴와
 * 같은 모양이다 — 위키·FAQ·Q&A 는 /admin/help/faq?tab=*, 커뮤니티는 /admin/help?tab=COMMUNITY 다.
 */
const WIKI = 'BBSMSTR_EEEEEEEEEEEE';
const NOTICE = 'BBSMSTR_AAAAAAAAAAAA';
const TASK = 'BBSMSTR_CCCCCCCCCCCC';
const NEW_BOARD = 'BBSMSTR_0123456789AB';

const menu = (menuNo: number, menuNm: string, upMenuSn: number | null, modernRoute: string | null, useYn = 'Y'): BoardMenuInput =>
  ({ menuNo, menuNm, upMenuSn, menuOrdr: menuNo, modernRoute, useYn });

const MENUS: BoardMenuInput[] = [
  menu(2000000, '소통·지식', null, null),
  menu(2040000, '엔터프라이즈 위키', 2000000, '/admin/help/faq?tab=WIKI'),
  menu(2060000, '자주 묻는 질문(FAQ)', 2000000, '/admin/help/faq?tab=FAQ'),
  menu(9030110, '커뮤니티', 2000000, '/admin/help?tab=COMMUNITY'),
  menu(3000000, '게시판', null, null),
  menu(3000100, '새 게시판', 3000000, boardMenuRoute(NEW_BOARD), 'N'),
];
const ready = (menus = MENUS): MenuSource => ({ status: 'ready', menus });

const nav = (...ids: number[]) => ids.map((id) => ({ type: 'NAVIGATION', code: String(id) }));
const group = (code: string, name: string, grants: BoardGroupInput['grants']): BoardGroupInput => ({ code, name, grants });
const ADMIN = group('ROLE_ADMIN', '관리자', nav(2000000, 2040000, 2060000, 9030110, 3000000, 3000100));
const USER = group('ROLE_USER', '사용자', nav(2000000, 2040000));
const groups = (...list: BoardGroupInput[]): GroupSource => ({ status: 'ready', groups: list });

describe('메뉴 연결', () => {
  it('허브 탭이 그리는 게시판을 연결로 찾고, 메뉴 이름과 게시판 이름이 다르면 알린다(위키 메뉴 → 일정 게시판)', () => {
    const links = findBoardMenuLinks(WIKI, ready(), groups(ADMIN, USER), '일정 게시판');
    expect(links).toEqual({
      status: 'ready',
      links: [expect.objectContaining({
        menuNo: 2040000,
        path: ['소통·지식', '엔터프라이즈 위키'],
        basis: { kind: 'hub-tab', tab: 'WIKI' },
        exposure: { kind: 'general', groups: ['관리자', '사용자'] },
        nameDiffers: true,
      })],
    });
  });

  it('커뮤니티 탭은 core 상수의 게시판(업무게시판)으로 대응하고, 소문자 탭도 같은 탭이다', () => {
    const lower = findBoardMenuLinks(TASK, ready([...MENUS.slice(0, 3), menu(9030110, '커뮤니티', 2000000, '/admin/help?tab=community')]),
      groups(ADMIN));
    expect(lower.status === 'ready' && lower.links.map((link) => link.basis)).toEqual([{ kind: 'hub-tab', tab: 'COMMUNITY' }]);
  });

  it('게시판 주소(select-board-list?bbsId=)를 직접 연결로 찾고, 사용 안 함 메뉴는 비활성이다', () => {
    const links = findBoardMenuLinks(NEW_BOARD, ready(), groups(ADMIN));
    expect(links.status === 'ready' && links.links).toEqual([expect.objectContaining({
      menuNo: 3000100, basis: { kind: 'board-address' }, exposure: { kind: 'inactive' },
    })]);
  });

  it('허브 ?bbsId= 는 그 값이 탭 게시판일 때만 연결이고, 탭 게시판이 아니면 ?tab= 으로 판정한다', () => {
    const entry = findBoardMenuLinks(NOTICE, ready([menu(1, '공지 바로가기', null, `/admin/help?bbsId=${NOTICE}&tab=WIKI`)]), groups(ADMIN));
    expect(entry.status === 'ready' && entry.links.map((link) => link.basis)).toEqual([{ kind: 'hub-tab', tab: 'FAQ' }]);
    const notWiki = findBoardMenuLinks(WIKI, ready([menu(1, '공지 바로가기', null, `/admin/help?bbsId=${NOTICE}&tab=WIKI`)]), groups(ADMIN));
    expect(notWiki.status === 'ready' && notWiki.links).toEqual([]);
    const strange = findBoardMenuLinks(WIKI, ready([menu(1, '엉뚱한 진입', null, `/admin/help?bbsId=${NEW_BOARD}&tab=WIKI`)]), groups(ADMIN));
    expect(strange.status === 'ready' && strange.links.map((link) => link.basis)).toEqual([{ kind: 'hub-tab', tab: 'WIKI' }]);
  });

  it('탭 없는 허브 주소는 허브 게시판에 한해 확인 불가 연결이다', () => {
    const links = findBoardMenuLinks(WIKI, ready([menu(1, '지식 허브', null, '/admin/help')]), groups(ADMIN));
    expect(links.status === 'ready' && links.links.map((link) => link.basis)).toEqual([{ kind: 'hub-default' }]);
    const other = findBoardMenuLinks(NEW_BOARD, ready([menu(1, '지식 허브', null, '/admin/help')]), groups(ADMIN));
    expect(other.status === 'ready' && other.links).toEqual([]);
  });

  it('관리자 그룹에만 보이면 관리자 그룹만, 사용자 정의 그룹에 보이면 일반 그룹, 상위가 숨으면 일반 그룹이 아니다', () => {
    const adminOnly = findBoardMenuLinks(WIKI, ready(), groups(ADMIN, group('ROLE_USER', '사용자', [])));
    expect(adminOnly.status === 'ready' && adminOnly.links[0].exposure).toEqual({ kind: 'admin-only', groups: ['관리자'] });
    const custom = findBoardMenuLinks(WIKI, ready(), groups(ADMIN, group('OPS_TEAM', '운영팀', nav(2000000, 2040000))));
    expect(custom.status === 'ready' && custom.links[0].exposure).toEqual({ kind: 'general', groups: ['관리자', '운영팀'] });
    const parentHidden = findBoardMenuLinks(WIKI, ready(), groups(group('OPS_TEAM', '운영팀', nav(2040000))));
    expect(parentHidden.status === 'ready' && parentHidden.links[0].exposure).toEqual({ kind: 'hidden' });
  });

  it('메뉴 원장을 읽을 권한이 없거나 실패하면 연결 없음으로 추정하지 않는다', () => {
    expect(findBoardMenuLinks(WIKI, { status: 'no-permission' }, groups(ADMIN))).toEqual({ status: 'no-permission' });
    expect(findBoardMenuLinks(WIKI, { status: 'failed' }, groups(ADMIN))).toEqual({ status: 'unknown' });
  });

  it('그룹을 읽을 권한이 없으면 노출은 확인 권한 없음, 실패면 확인 불가다', () => {
    const noPermission = findBoardMenuLinks(WIKI, ready(), { status: 'no-permission' });
    expect(noPermission.status === 'ready' && noPermission.links[0].exposure).toEqual({ kind: 'no-permission' });
    const failed = findBoardMenuLinks(WIKI, ready(), { status: 'failed' });
    expect(failed.status === 'ready' && failed.links[0].exposure).toEqual({ kind: 'unknown' });
  });
});

describe('메뉴 상태 요약(ADR-0043, G4·G5)', () => {
  const summary = (bbsId: string, menus: MenuSource = ready(), groupSource: GroupSource = groups(ADMIN, USER)) =>
    summarizeBoardMenuLinks(findBoardMenuLinks(bbsId, menus, groupSource));

  it('일반 그룹에 보이는 활성 메뉴 수를 센다', () => {
    expect(summary(WIKI)).toEqual({ kind: 'general', count: 1 });
  });

  it('관리자 그룹에만 보이면 관리자 그룹만, 비활성만이면 비활성, 아무 그룹에도 안 보이면 보이는 그룹 없음이다', () => {
    expect(summary(WIKI, ready(), groups(ADMIN))).toEqual({ kind: 'admin-only' });
    expect(summary(NEW_BOARD)).toEqual({ kind: 'inactive' });
    expect(summary(WIKI, ready(), groups(group('OPS_TEAM', '운영팀', nav(2040000))))).toEqual({ kind: 'hidden' });
  });

  it('연결이 없으면 연결 없음, 원장을 못 읽으면 확인 권한 없음·확인 불가, 그룹을 못 읽으면 확인 불가다', () => {
    expect(summary(NOTICE, ready(MENUS.slice(0, 2)))).toEqual({ kind: 'none' });
    expect(summary(WIKI, { status: 'no-permission' })).toEqual({ kind: 'no-permission' });
    expect(summary(WIKI, { status: 'failed' })).toEqual({ kind: 'unknown' });
    expect(summary(WIKI, ready(), { status: 'no-permission' })).toEqual({ kind: 'unknown' });
  });

  it('탭 없는 허브 주소는 일반 그룹에 보여도 일반 그룹 표시로 세지 않는다(확인 불가)', () => {
    const hub = ready([menu(2000000, '소통·지식', null, null), menu(2050000, '지식 허브', 2000000, '/admin/help')]);
    expect(summary(WIKI, hub, groups(ADMIN, group('ROLE_USER', '사용자', nav(2000000, 2050000))))).toEqual({ kind: 'unknown' });
  });
});

/**
 * 공개 준비 점검(ADR-0043 결정 3 — 사용 중 + 이용자가 찾는 길 하나 이상). 찾는 길은 일반 그룹 메뉴·지식 허브 탭·업무 홈 카드·
 * 사용 중인 커뮤니티 화면(귀속 게시판)이다. 관리자 그룹 전용 메뉴·사용 중지 커뮤니티·판정 불가는 통과하지 않는다(부정 시험).
 */
describe('공개 준비 점검', () => {
  const check = (bbsId: string, options: {
    inUse?: boolean; menus?: MenuSource; groups?: GroupSource; designations?: string[]; community?: BoardCommunityInput | null;
  } = {}) => {
    const groupSource = options.groups ?? groups(ADMIN, USER);
    return publicationReadiness({
      bbsId,
      boardInUse: options.inUse ?? true,
      links: findBoardMenuLinks(bbsId, options.menus ?? ready(), groupSource),
      groupSource,
      designations: options.designations ?? [],
      community: options.community ?? null,
    });
  };
  const entry = (result: ReturnType<typeof check>) => result.checks.find((item) => item.id === 'entry-path')?.state;
  const WITHOUT_NEW_MENU = ready(MENUS.filter((item) => item.menuNo !== 3000100));

  it('사용 중이고 일반 그룹에 보이는 활성 메뉴가 있으면 통과다', () => {
    expect(check(NEW_BOARD, { menus: ready([...MENUS.slice(0, 5), menu(3000100, '새 게시판', 3000000, boardMenuRoute(NEW_BOARD))]),
      groups: groups(ADMIN, group('ROLE_USER', '사용자', nav(3000000, 3000100))) }).state).toBe('pass');
  });

  it('관리자 그룹에만 보이는 메뉴는 찾는 길이 아니다(수용 시나리오 4)', () => {
    const adminOnly = ready([...MENUS.slice(0, 5), menu(3000100, '새 게시판', 3000000, boardMenuRoute(NEW_BOARD))]);
    const result = check(NEW_BOARD, { menus: adminOnly, groups: groups(ADMIN, group('ROLE_USER', '사용자', [])) });
    expect(result.state).toBe('fail');
    expect(entry(result)).toBe('fail');
  });

  it('메뉴가 없어도 지식 허브 탭이 그리는 게시판이면 통과다 — 메뉴는 접근을 막지 않는다', () => {
    const result = check(WIKI, { menus: ready([]) });
    expect(result.state).toBe('pass');
    expect(result.paths.hubTabs).toEqual(['WIKI']);
  });

  it('메뉴가 없어도 업무 홈 카드가 보이는 게시판(공지·업무 지정)이면 통과다', () => {
    const result = check('BBSMSTR_HOMECARD0001', { menus: ready([]), designations: ['TASK'] });
    expect(result.state).toBe('pass');
    expect(result.paths.homeCards).toEqual(['TASK']);
  });

  it('메뉴 원장을 읽을 권한이 없고 다른 길도 없으면 확인 불가로 끝난다 — 통과로도 실패로도 추정하지 않는다', () => {
    const result = check(NEW_BOARD, { menus: { status: 'no-permission' } });
    expect(result.state).toBe('unknown');
    expect(entry(result)).toBe('unknown');
    expect(entry(check(NEW_BOARD, { menus: { status: 'failed' } }))).toBe('unknown');
  });

  it('메뉴를 판정하지 못해도 허브 탭이 있으면 그 길로 통과다', () => {
    expect(entry(check(WIKI, { menus: { status: 'no-permission' } }))).toBe('pass');
  });

  it('사용 안 함 게시판은 다른 항목과 무관하게 실패다', () => {
    expect(check(WIKI, { inUse: false }).state).toBe('fail');
  });

  it('귀속 게시판은 커뮤니티가 이용 가능하면 메뉴 없이 통과다', () => {
    const result = check(NEW_BOARD, { menus: WITHOUT_NEW_MENU, community: { cmntySn: 7, cmntyNm: '개발 모임', inUse: true } });
    expect(result.state).toBe('pass');
    expect(result.paths.search).toBe(false);
  });

  it('귀속 커뮤니티가 사용 중지면 입구가 없어 통과하지 못한다 — 일반 그룹 메뉴가 있어도 그렇다', () => {
    const community = { cmntySn: 7, cmntyNm: '개발 모임', inUse: false };
    expect(entry(check(NEW_BOARD, { menus: WITHOUT_NEW_MENU, community }))).toBe('fail');
    const generalMenu = ready([...MENUS.slice(0, 5), menu(3000100, '새 게시판', 3000000, boardMenuRoute(NEW_BOARD))]);
    const withMenu = check(NEW_BOARD, { menus: generalMenu, groups: groups(ADMIN, group('ROLE_USER', '사용자', nav(3000000, 3000100))), community });
    expect(withMenu.state).toBe('fail');
    expect(entry(withMenu)).toBe('fail');
  });

  it('귀속 커뮤니티를 확인할 수 없으면(커뮤니티 기능 없음·찾지 못함) 확인 불가다', () => {
    const result = check(NEW_BOARD, { menus: WITHOUT_NEW_MENU, community: { cmntySn: 7, cmntyNm: null, inUse: null } });
    expect(result.state).toBe('unknown');
    expect(entry(result)).toBe('unknown');
  });

  it('귀속 게시판에 일반 그룹에 보이는 메뉴가 있으면 경고한다', () => {
    const generalMenu = ready([...MENUS.slice(0, 5), menu(3000100, '새 게시판', 3000000, boardMenuRoute(NEW_BOARD))]);
    const result = check(NEW_BOARD, {
      menus: generalMenu, groups: groups(ADMIN, group('ROLE_USER', '사용자', nav(3000000, 3000100))),
      community: { cmntySn: 7, cmntyNm: '개발 모임', inUse: true },
    });
    expect(result.state).toBe('pass');
    expect(result.warnings).toEqual(['community-general-menu']);
    expect(check(WIKI).warnings).toEqual([]);
  });

  it('사용 안 함 게시판에 일반 그룹에 보이는 메뉴가 있으면 경고한다', () => {
    expect(check(WIKI, { inUse: false }).warnings).toEqual(['closed-board-general-menu']);
  });

  it('공지·FAQ 지정 게시판은 그 편집 권한이 어느 그룹엔가 있어야 하고, 빠진 권한을 알린다', () => {
    const missing = check(WIKI, { designations: ['NOTICE', 'FAQ'] });
    expect(missing.state).toBe('fail');
    expect(missing.checks.find((item) => item.id === 'edit-permission')).toEqual({
      id: 'edit-permission', state: 'fail', missing: ['NOTICE_EDIT', 'FAQ_EDIT'],
    });
    const granted = check(WIKI, {
      designations: ['NOTICE'],
      groups: groups({ ...ADMIN, grants: [...ADMIN.grants, { type: 'OPERATION', code: 'NOTICE_EDIT' }] }, USER),
    });
    expect(granted.state).toBe('pass');
    expect(check(WIKI, { designations: ['TASK'] }).checks.find((item) => item.id === 'edit-permission')?.state).toBe('not-applicable');
  });

  it('그룹을 읽을 권한이 없으면 메뉴로만 닿는 게시판의 찾는 길·편집 권한 모두 확인 불가다', () => {
    const activeMenu = ready([...MENUS.slice(0, 5), menu(3000100, '새 게시판', 3000000, boardMenuRoute(NEW_BOARD))]);
    const result = check(NEW_BOARD, { menus: activeMenu, groups: { status: 'no-permission' }, designations: ['FAQ'] });
    expect(result.state).toBe('unknown');
    expect(result.checks.map((item) => item.state)).toEqual(['pass', 'unknown', 'unknown']);
  });

  it('탭 없는 허브 주소만 연결이면 확인 불가이고, 그 메뉴가 사용 안 함이면 실패다', () => {
    const hub = (useYn: string) => ready([menu(2000000, '소통·지식', null, null), menu(2050000, '지식 허브', 2000000, '/admin/help', useYn)]);
    const userSeesHub = groups(ADMIN, group('ROLE_USER', '사용자', nav(2000000, 2050000)));
    // 허브 탭이 그리지 않는 게시판으로 본다 — 탭 없는 허브 주소가 그 게시판의 연결인지는 판정할 수 없다.
    expect(entry(check(NEW_BOARD, { menus: hub('Y'), groups: userSeesHub }))).toBe('fail');
    expect(boardEntryPaths({ bbsId: WIKI, boardInUse: true, designations: [], community: null,
      links: findBoardMenuLinks(WIKI, hub('Y'), userSeesHub) }).generalMenu).toBe('unknown');
    expect(boardEntryPaths({ bbsId: WIKI, boardInUse: true, designations: [], community: null,
      links: findBoardMenuLinks(WIKI, hub('N'), userSeesHub) }).generalMenu).toBe('fail');
  });

  it('연결된 메뉴도 다른 길도 없으면 실패다', () => {
    expect(check(NEW_BOARD, { menus: WITHOUT_NEW_MENU }).state).toBe('fail');
  });
});

describe('이용자가 이미 닿는 길(NAV-07)', () => {
  const paths = (bbsId: string, options: { inUse?: boolean; designations?: string[]; community?: BoardCommunityInput | null } = {}) =>
    boardEntryPaths({
      bbsId, boardInUse: options.inUse ?? true, designations: options.designations ?? [], community: options.community ?? null,
      links: findBoardMenuLinks(bbsId, ready(), groups(ADMIN, USER)),
    });

  it('통합 검색은 사용 중이고 귀속이 아닌 게시판만이다', () => {
    expect(paths(NEW_BOARD).search).toBe(true);
    expect(paths(NEW_BOARD, { inUse: false }).search).toBe(false);
    expect(paths(NEW_BOARD, { community: { cmntySn: 7, cmntyNm: '개발 모임', inUse: true } }).search).toBe(false);
  });

  it('업무 홈 카드는 공지·업무 지정만이고, 기여 허브 탭(커뮤니티)은 따로 둔다', () => {
    expect(paths(TASK, { designations: ['TASK', 'QNA'] })).toMatchObject({ homeCards: ['TASK'], hubTabs: [], contributedHubTabs: ['COMMUNITY'] });
    expect(paths(NOTICE, { designations: ['NOTICE', 'FAQ'] })).toMatchObject({ homeCards: ['NOTICE'], hubTabs: ['FAQ'] });
  });
});
