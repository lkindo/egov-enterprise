import { afterEach, describe, expect, it, vi } from 'vitest';
import { RECENT_MENU_LIMIT, readRecentMenuNos, recordRecentMenu } from '../recent-menus';

/** [2026-09-26 DIP B5 F2] 최근 방문 메뉴는 이 브라우저·이 사용자에게만 남는 편의 기록이다. */
describe('최근 방문 메뉴 기록', () => {
  afterEach(() => {
    window.localStorage.clear();
    vi.restoreAllMocks();
  });

  it('가장 최근 것이 앞에 오고, 같은 메뉴는 한 번만 남는다', () => {
    recordRecentMenu('u1', 10);
    recordRecentMenu('u1', 20);
    recordRecentMenu('u1', 10);
    expect(readRecentMenuNos('u1')).toEqual([10, 20]);
  });

  it(`최대 ${RECENT_MENU_LIMIT}개만 남긴다`, () => {
    for (let no = 1; no <= RECENT_MENU_LIMIT + 3; no += 1) recordRecentMenu('u1', no);
    const recent = readRecentMenuNos('u1');
    expect(recent).toHaveLength(RECENT_MENU_LIMIT);
    expect(recent[0]).toBe(RECENT_MENU_LIMIT + 3);
  });

  it('사용자마다 따로 남는다 — 같은 브라우저의 다른 계정에 보이지 않는다', () => {
    recordRecentMenu('u1', 10);
    expect(readRecentMenuNos('u2')).toEqual([]);
  });

  it('사용자를 모르거나 메뉴 번호가 올바르지 않으면 기록하지 않는다', () => {
    recordRecentMenu(undefined, 10);
    recordRecentMenu('u1', 0);
    recordRecentMenu('u1', null);
    expect(readRecentMenuNos(undefined)).toEqual([]);
    expect(readRecentMenuNos('u1')).toEqual([]);
  });

  it('손상된 기록은 비어 있는 것으로 읽는다', () => {
    window.localStorage.setItem('egov.recent-menus.v1:u1', '{not json');
    expect(readRecentMenuNos('u1')).toEqual([]);
    window.localStorage.setItem('egov.recent-menus.v1:u1', JSON.stringify([3, 'x', -1, 1.5, 7]));
    expect(readRecentMenuNos('u1')).toEqual([3, 7]);
  });

  it('저장소를 쓸 수 없어도 예외를 던지지 않는다', () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    expect(() => recordRecentMenu('u1', 10)).not.toThrow();
    expect(readRecentMenuNos('u1')).toEqual([]);
  });
});
