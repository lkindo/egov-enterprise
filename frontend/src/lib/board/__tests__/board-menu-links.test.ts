import { describe, expect, it } from 'vitest';
import {
  boardMenuRoute,
  findBoardMenuLinks,
  publicationReadiness,
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

describe('공개 준비 점검', () => {
  const check = (bbsId: string, options: { inUse?: boolean; menus?: MenuSource; groups?: GroupSource; designations?: string[] } = {}) => {
    const groupSource = options.groups ?? groups(ADMIN, USER);
    return publicationReadiness({
      boardInUse: options.inUse ?? true,
      links: findBoardMenuLinks(bbsId, options.menus ?? ready(), groupSource),
      groupSource,
      designations: options.designations ?? [],
    });
  };

  it('사용 중이고 일반 그룹에 보이는 활성 메뉴가 있으면 통과다', () => {
    expect(check(WIKI).state).toBe('pass');
  });

  it('관리자 그룹에만 보이면 통과가 아니다(수용 시나리오 4)', () => {
    const result = check(WIKI, { groups: groups(ADMIN) });
    expect(result.state).toBe('fail');
    expect(result.checks.find((item) => item.id === 'general-menu')?.state).toBe('fail');
  });

  it('사용 안 함 게시판은 다른 항목과 무관하게 실패다', () => {
    expect(check(WIKI, { inUse: false }).state).toBe('fail');
  });

  it('메뉴 원장을 읽을 권한이 없으면 확인 불가로 끝난다 — 연결 없음으로 실패시키지 않는다', () => {
    const result = check(WIKI, { menus: { status: 'no-permission' } });
    expect(result.state).toBe('unknown');
    expect(result.checks.find((item) => item.id === 'general-menu')?.state).toBe('unknown');
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

  it('그룹을 읽을 권한이 없으면 노출·편집 권한 모두 확인 불가다', () => {
    const result = check(WIKI, { groups: { status: 'no-permission' }, designations: ['FAQ'] });
    expect(result.state).toBe('unknown');
    expect(result.checks.map((item) => item.state)).toEqual(['pass', 'unknown', 'unknown']);
  });

  it('탭 없는 허브 주소만 연결이면 확인 불가이고, 그 메뉴가 사용 안 함이면 실패다', () => {
    const hub = (useYn: string) => ready([menu(2000000, '소통·지식', null, null), menu(2050000, '지식 허브', 2000000, '/admin/help', useYn)]);
    const userSeesHub = groups(ADMIN, group('ROLE_USER', '사용자', nav(2000000, 2050000)));
    expect(check(WIKI, { menus: hub('Y'), groups: userSeesHub }).checks.find((item) => item.id === 'general-menu')?.state)
      .toBe('unknown');
    expect(check(WIKI, { menus: hub('N'), groups: userSeesHub }).checks.find((item) => item.id === 'general-menu')?.state)
      .toBe('fail');
  });

  it('연결된 메뉴가 없으면 실패다', () => {
    expect(check(NEW_BOARD, { menus: ready(MENUS.filter((item) => item.menuNo !== 3000100)) }).state).toBe('fail');
  });
});
