import { describe, expect, it } from 'vitest';
import type { GroupSource, MenuLinkMenuInput, MenuSource } from '@/lib/navigation/route-menu-links';
import { cmsPageRoute, findCmsPageMenuLinks } from '../page-menu-links';

/**
 * 콘텐츠 페이지 ↔ 메뉴 연결(ADR-0042). 메뉴 경로의 pathname 이 정확히 `/pages/<주소>` 인 메뉴만 연결이다 — 쿼리·해시는 보지
 * 않고, 앞부분만 같은 주소는 다른 페이지다.
 */
const menu = (menuNo: number, menuNm: string, upMenuSn: number | null, modernRoute: string | null, useYn = 'Y'): MenuLinkMenuInput =>
  ({ menuNo, menuNm, upMenuSn, menuOrdr: menuNo, modernRoute, useYn });

const MENUS: MenuLinkMenuInput[] = [
  menu(4000, '안내', null, null),
  menu(4010, '이용 안내', 4000, '/pages/guide'),
  menu(4020, '이용 안내(쿼리)', 4000, '/pages/guide?from=menu#top'),
  menu(4030, '이용 안내 끝 슬래시', 4000, '/pages/guide/'),
  menu(4040, '이용 안내 부록', 4000, '/pages/guide-appendix'),
  menu(4050, '이용 안내 하위', 4000, '/pages/guide/sub'),
  menu(4060, '안내 페이지 목록', 4000, '/pages'),
  menu(4070, '관리 화면', 4000, '/admin/system/content-pages?path=guide'),
  menu(4080, '짧은 주소', 4000, '/pages/g'),
];
const ready = (menus = MENUS): MenuSource => ({ status: 'ready', menus });
const groups: GroupSource = {
  status: 'ready',
  groups: [{ code: 'ROLE_USER', name: '사용자', grants: [4000, 4010].map((id) => ({ type: 'NAVIGATION', code: String(id) })) }],
};

const linkedMenus = (contsPathNm: string, menus = MENUS) => {
  const links = findCmsPageMenuLinks(contsPathNm, ready(menus), groups);
  if (links.status !== 'ready') throw new Error('메뉴 원장이 준비되지 않았습니다.');
  return links.links.map((link) => link.menuNo);
};

describe('콘텐츠 페이지 주소', () => {
  it('게시된 페이지 화면 주소는 /pages/<주소> 다', () => {
    expect(cmsPageRoute('guide')).toBe('/pages/guide');
    expect(cmsPageRoute('guide-2026')).toBe('/pages/guide-2026');
  });

  it('주소 형식 밖의 글자는 인코딩해 다른 경로로 해석되지 않는다', () => {
    expect(cmsPageRoute('a/b')).toBe('/pages/a%2Fb');
  });
});

describe('콘텐츠 페이지 메뉴 연결', () => {
  it('pathname 이 정확히 같은 메뉴만 연결이고, 쿼리·해시·끝 슬래시는 같은 화면이다', () => {
    expect(linkedMenus('guide')).toEqual([4010, 4020, 4030]);
  });

  it('앞부분만 같은 주소(/pages/g 와 /pages/guide)는 서로 연결이 아니다', () => {
    expect(linkedMenus('g')).toEqual([4080]);
    expect(linkedMenus('guide-appendix')).toEqual([4040]);
    expect(linkedMenus('gu')).toEqual([]);
  });

  it('근거는 페이지 주소이고, 노출은 공용 판정으로 계산한다', () => {
    const links = findCmsPageMenuLinks('guide', ready(), groups);
    expect(links.status === 'ready' && links.links[0]).toEqual({
      menuNo: 4010, menuNm: '이용 안내', path: ['안내', '이용 안내'], route: '/pages/guide',
      basis: { kind: 'page-address' }, exposure: { kind: 'general', groups: ['사용자'] },
    });
    expect(links.status === 'ready' && links.links[1].exposure).toEqual({ kind: 'hidden' });
  });

  it('주소가 비어 있으면 사용자용 목록(/pages) 메뉴도 연결이 아니다', () => {
    expect(linkedMenus('')).toEqual([]);
  });

  it('메뉴 원장을 읽을 권한이 없거나 실패하면 연결 없음으로 추정하지 않는다', () => {
    expect(findCmsPageMenuLinks('guide', { status: 'no-permission' }, groups)).toEqual({ status: 'no-permission' });
    expect(findCmsPageMenuLinks('guide', { status: 'failed' }, groups)).toEqual({ status: 'unknown' });
  });
});
