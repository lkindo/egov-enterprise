import { describe, expect, it } from 'vitest';
import {
  BOARD_OPERATIONS_TAB_LABELS,
  BOARD_OPERATIONS_TABS,
  DEFAULT_BOARD_OPERATIONS_TAB,
  TAB_HUB,
  boardOperationsHref,
  isBoardOperationsId,
  parseBoardOperationsTab,
} from '../board-operations-tabs';

/** 게시판 운영 화면의 탭·주소 해석(ADR-0040 결정 2). */
describe('board-operations-tabs', () => {
  it('탭은 posts·settings·access 셋이고 기본은 설정이다', () => {
    expect(BOARD_OPERATIONS_TABS).toEqual(['posts', 'settings', 'access']);
    expect(DEFAULT_BOARD_OPERATIONS_TAB).toBe('settings');
    expect(TAB_HUB.routes).toEqual(['/admin/community/boards/master/[id]']);
  });

  // 운영 화면의 탭과 목록의 행별 바로가기가 같은 이름을 쓴다(ADR-0043, G4).
  it('탭마다 이름이 하나씩 있다', () => {
    expect(BOARD_OPERATIONS_TAB_LABELS).toEqual({ posts: '게시물', settings: '설정', access: '메뉴·접근' });
  });

  it.each(['posts', 'settings', 'access'])('알려진 탭(%s)은 그대로 받는다', (tab) => {
    expect(parseBoardOperationsTab(tab)).toBe(tab);
  });

  it.each([null, undefined, '', 'POSTS', 'Settings', 'menu', 'view'])('모르는 값·대소문자 다른 값(%s)은 null 이다', (tab) => {
    expect(parseBoardOperationsTab(tab)).toBeNull();
  });

  it('주소는 경로에 게시판 ID 를 싣고 ?bbsId 를 싣지 않으며, 기본 탭이면 tab 을 생략한다', () => {
    expect(boardOperationsHref('BBSMSTR_AAAAAAAAAAAA')).toBe('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA');
    expect(boardOperationsHref('BBSMSTR_AAAAAAAAAAAA', 'settings')).toBe('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA');
    expect(boardOperationsHref('BBSMSTR_AAAAAAAAAAAA', 'access')).toBe('/admin/community/boards/master/BBSMSTR_AAAAAAAAAAAA?tab=access');
    expect(boardOperationsHref('BBSMSTR_AAAAAAAAAAAA', 'posts')).not.toContain('bbsId');
  });

  it.each([
    ['BBSMSTR_AAAAAAAAAAAA', true],
    ['BBSMSTR_0123456789AB', true],
    ['BBSMSTR_AAAAAAAAAAA', false],
    ['BBSMSTR_AAAAAAAAAAAAA', false],
    ['BBSMSTR_aaaaaaaaaaaa', false],
    ['BBSXXXX_AAAAAAAAAAAA', false],
    ['xyz', false],
    ['', false],
  ] as const)('게시판 ID 형식 %s → %s', (id, expected) => {
    expect(isBoardOperationsId(id)).toBe(expected);
  });
});
