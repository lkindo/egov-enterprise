import { describe, expect, it } from 'vitest';
import { loginReturnPath, restorableQuery } from '../login-return-path';

/** 재로그인 뒤 돌아갈 자리는 경로와 구조 키만 싣는다(2026-10-01 결정 17). */
describe('loginReturnPath', () => {
  it('게시판·글·탭·쪽 번호는 남긴다', () => {
    expect(loginReturnPath('/admin/community/boards/detail', '?bbsId=BBSMSTR_0001&pstSn=42&page=3'))
      .toBe('/admin/community/boards/detail?bbsId=BBSMSTR_0001&pstSn=42&page=3');
    expect(loginReturnPath('/admin/help', '?tab=COMMUNITY')).toBe('/admin/help?tab=COMMUNITY');
  });

  it('검색어 같은 자유 입력은 어떤 경우에도 싣지 않는다', () => {
    expect(loginReturnPath('/admin/community/boards/select-board-list', '?bbsId=B1&searchCnd=2&searchWrd=%ED%99%8D%EA%B8%B8%EB%8F%99'))
      .toBe('/admin/community/boards/select-board-list?bbsId=B1');
    expect(loginReturnPath('/search', '?q=%ED%99%8D%EA%B8%B8%EB%8F%99')).toBe('/search');
  });

  it('형식이 틀리거나 여러 번 온 구조 키는 버린다 — 자유 입력을 구조 키로 위장하지 못한다', () => {
    expect(restorableQuery('?tab=%ED%99%8D%EA%B8%B8%EB%8F%99')).toBe('');
    expect(restorableQuery('?pstSn=12a')).toBe('');
    expect(restorableQuery('?page=0')).toBe('');
    expect(restorableQuery('?bbsId=A&bbsId=B')).toBe('');
  });
});
