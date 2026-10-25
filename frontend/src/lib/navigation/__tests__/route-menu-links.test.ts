import { describe, expect, it, vi } from 'vitest';
import {
  findRouteMenuLinks,
  generalMenuState,
  routePathname,
  type GroupSource,
  type MenuLinkGroupInput,
  type MenuLinkMenuInput,
  type MenuSource,
  type RouteMenuLink,
} from '../route-menu-links';

/**
 * 화면 주소 ↔ 메뉴 연결·노출·일반 그룹 판정(ADR-0040 결정 8 을 공용화, ADR-0042). 기능마다 다른 것은 "이 경로가 내 화면인가"
 * 하나라서 시험은 기능과 무관한 화면 주소(/guide/use)로 본다. 노출은 사이드바 판정을 그룹마다 부른 결과다.
 */
const menu = (menuNo: number, menuNm: string, upMenuSn: number | null, modernRoute: string | null, useYn = 'Y'): MenuLinkMenuInput =>
  ({ menuNo, menuNm, upMenuSn, menuOrdr: menuNo, modernRoute, useYn });

const MENUS: MenuLinkMenuInput[] = [
  menu(1000, '안내', null, null),
  menu(1010, '이용 안내', 1000, '/guide/use'),
  menu(1020, '이용 안내(옛)', 1000, '/guide/use/?from=old#top', 'N'),
  menu(1030, '다른 안내', 1000, '/guide/other'),
  menu(1040, '바깥 주소', 1000, 'https://example.com/guide/use'),
];
const ready = (menus = MENUS): MenuSource => ({ status: 'ready', menus });

type Basis = { kind: 'guide' };
const matchGuide = (route: string): Basis | null => (routePathname(route) === '/guide/use' ? { kind: 'guide' } : null);

const nav = (...ids: number[]) => ids.map((id) => ({ type: 'NAVIGATION', code: String(id) }));
const group = (code: string, name: string, grants: MenuLinkGroupInput['grants']): MenuLinkGroupInput => ({ code, name, grants });
const ADMIN = group('ROLE_ADMIN', '관리자', nav(1000, 1010, 1020, 1030, 1040));
const SYSTEM = group('ROLE_SYSTEM', '시스템 관리자', nav(1000, 1010));
const groups = (...list: MenuLinkGroupInput[]): GroupSource => ({ status: 'ready', groups: list });

const link = (exposure: RouteMenuLink<Basis>['exposure'], basis: Basis = { kind: 'guide' }): RouteMenuLink<Basis> =>
  ({ menuNo: 1, menuNm: '메뉴', path: ['메뉴'], route: '/guide/use', basis, exposure });

describe('메뉴 연결 찾기', () => {
  it('경로가 맞는 메뉴를 사용 안 함 메뉴까지 찾고, 최상위부터의 이름과 해석한 경로를 돌려준다', () => {
    const links = findRouteMenuLinks(ready(), groups(ADMIN), matchGuide);
    expect(links).toEqual({
      status: 'ready',
      links: [
        {
          menuNo: 1010, menuNm: '이용 안내', path: ['안내', '이용 안내'], route: '/guide/use',
          basis: { kind: 'guide' }, exposure: { kind: 'admin-only', groups: ['관리자'] },
        },
        expect.objectContaining({ menuNo: 1020, route: '/guide/use/?from=old#top', exposure: { kind: 'inactive' } }),
      ],
    });
  });

  it('이동할 수 없는 경로(바깥 주소·경로 없음)는 match 에 넘기지 않는다', () => {
    const match = vi.fn(matchGuide);
    findRouteMenuLinks(ready(), groups(ADMIN), match);
    expect(match.mock.calls.map(([route]) => route)).toEqual(['/guide/use', '/guide/use/?from=old#top', '/guide/other']);
  });

  it('상위가 순환해도 멈추고, 이름은 한 번씩만 넣는다', () => {
    const cyclic = [menu(1, '가', 2, null), menu(2, '나', 1, '/guide/use')];
    const links = findRouteMenuLinks(ready(cyclic), groups(ADMIN), matchGuide);
    expect(links.status === 'ready' && links.links.map((item) => item.path)).toEqual([['가', '나']]);
  });

  it('메뉴 원장을 읽을 권한이 없거나 조회에 실패하면 연결 없음으로 추정하지 않는다', () => {
    expect(findRouteMenuLinks({ status: 'no-permission' }, groups(ADMIN), matchGuide)).toEqual({ status: 'no-permission' });
    expect(findRouteMenuLinks({ status: 'failed' }, groups(ADMIN), matchGuide)).toEqual({ status: 'unknown' });
  });
});

describe('노출 분류', () => {
  const exposureFor = (groupSource: GroupSource) => {
    const links = findRouteMenuLinks(ready(), groupSource, matchGuide);
    if (links.status !== 'ready') throw new Error('메뉴 원장이 준비되지 않았습니다.');
    return links.links[0].exposure;
  };

  it('관리자 그룹(ROLE_ADMIN·ROLE_SYSTEM)에만 보이면 관리자 그룹만이다', () => {
    expect(exposureFor(groups(ADMIN, SYSTEM, group('ROLE_USER', '사용자', [])))).toEqual({
      kind: 'admin-only', groups: ['관리자', '시스템 관리자'],
    });
  });

  it('관리자 그룹 밖의 그룹(사용자 정의 그룹 포함)에 하나라도 보이면 일반 그룹 표시이고, 이름이 없으면 코드로 부른다', () => {
    expect(exposureFor(groups(ADMIN, group('OPS_TEAM', '', nav(1000, 1010))))).toEqual({
      kind: 'general', groups: ['관리자', 'OPS_TEAM'],
    });
  });

  it('메뉴 표시가 있어도 상위가 숨으면 어느 그룹에도 보이지 않는다', () => {
    expect(exposureFor(groups(group('ROLE_USER', '사용자', nav(1010))))).toEqual({ kind: 'hidden' });
  });

  it('그룹을 읽을 권한이 없으면 확인 권한 없음, 조회에 실패하면 확인 불가다 — 사용 안 함 메뉴는 그대로 사용 안 함이다', () => {
    expect(exposureFor({ status: 'no-permission' })).toEqual({ kind: 'no-permission' });
    expect(exposureFor({ status: 'failed' })).toEqual({ kind: 'unknown' });
    const inactive = findRouteMenuLinks(ready(), { status: 'failed' }, matchGuide);
    expect(inactive.status === 'ready' && inactive.links[1].exposure).toEqual({ kind: 'inactive' });
  });
});

describe('일반 그룹 판정', () => {
  it('활성이고 관리자 그룹 밖 그룹에 보이는 연결이 있으면 통과다', () => {
    expect(generalMenuState(findRouteMenuLinks(ready(), groups(ADMIN, group('ROLE_USER', '사용자', nav(1000, 1010))), matchGuide)))
      .toBe('pass');
  });

  it('연결이 없거나 사용 안 함·숨김·관리자 그룹만이면 실패다', () => {
    expect(generalMenuState(findRouteMenuLinks(ready([menu(1, '다른 안내', null, '/guide/other')]), groups(ADMIN), matchGuide)))
      .toBe('fail');
    expect(generalMenuState(findRouteMenuLinks(ready(), groups(ADMIN), matchGuide))).toBe('fail');
    expect(generalMenuState([link({ kind: 'inactive' }), link({ kind: 'hidden' })])).toBe('fail');
  });

  it('통과 근거가 없고 노출을 판정하지 못한 연결이 있거나 메뉴 원장을 읽지 못하면 확인 불가다', () => {
    expect(generalMenuState(findRouteMenuLinks(ready(), { status: 'no-permission' }, matchGuide))).toBe('unknown');
    expect(generalMenuState([link({ kind: 'admin-only', groups: ['관리자'] }), link({ kind: 'unknown' })])).toBe('unknown');
    expect(generalMenuState(findRouteMenuLinks({ status: 'no-permission' }, groups(ADMIN), matchGuide))).toBe('unknown');
    expect(generalMenuState(findRouteMenuLinks({ status: 'failed' }, groups(ADMIN), matchGuide))).toBe('unknown');
  });

  it('판정 불가 연결이 있어도 일반 그룹에 보이는 연결이 하나 있으면 통과다', () => {
    expect(generalMenuState([link({ kind: 'unknown' }), link({ kind: 'general', groups: ['사용자'] })])).toBe('pass');
  });

  it('확인되지 않은 근거의 연결은 일반 그룹에 보여도 통과 근거가 아니고, 사용 안 함이 아니면 확인 불가다', () => {
    type Hub = { kind: 'certain' } | { kind: 'uncertain' };
    const uncertain = (item: RouteMenuLink<Hub>) => item.basis.kind === 'uncertain';
    const hubLink = (exposure: RouteMenuLink<Hub>['exposure'], kind: Hub['kind']): RouteMenuLink<Hub> =>
      ({ menuNo: 1, menuNm: '허브', path: ['허브'], route: '/guide', basis: { kind }, exposure });
    expect(generalMenuState([hubLink({ kind: 'general', groups: ['사용자'] }, 'uncertain')], uncertain)).toBe('unknown');
    expect(generalMenuState([hubLink({ kind: 'inactive' }, 'uncertain')], uncertain)).toBe('fail');
    expect(generalMenuState([
      hubLink({ kind: 'general', groups: ['사용자'] }, 'uncertain'),
      hubLink({ kind: 'general', groups: ['사용자'] }, 'certain'),
    ], uncertain)).toBe('pass');
  });
});

describe('메뉴 경로의 pathname', () => {
  it('쿼리·해시를 떼고 끝의 / 를 지운다', () => {
    expect(routePathname('/guide/use?tab=A#top')).toBe('/guide/use');
    expect(routePathname('/guide/use/')).toBe('/guide/use');
    expect(routePathname('/')).toBe('/');
  });
});
