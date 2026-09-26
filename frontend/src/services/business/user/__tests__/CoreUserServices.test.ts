vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { vi, describe, it, expect, beforeEach } from 'vitest';
import client from '@/lib/api/client';
import { deptJobUserService } from '../deptJob/DeptJobUserService';
import { menuService } from '../MenuService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    getRaw: vi.fn(),
    requestRaw: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  }
}));

const PAGE = {
  success: true,
  code: 'S000',
  message: '성공',
  data: { list: [], total: 0, page: 0, size: 10, totalPage: 0 },
};

/*
 * [GAP-PACK-001] 이 파일은 **모든 프로필에 남는 서비스만** 검증한다.
 *
 * 재사용 base 투영은 import 그래프로 cascade 제거를 판정한다 — 한 파일이 여러 pack 의 서비스를
 * 함께 import 하면, 가장 먼저 빠지는 pack 때문에 파일 전체가 사라지고 <b>살아남은 서비스의 검증까지
 * 함께 없어진다</b>. 종전 ComprehensiveUserServices/FinalDomainServices/UserDomainServices 가
 * 정확히 그 상태였다(각각 demo·collaboration·demo 서비스를 섞어 들고 있었다).
 *
 * pack 별로 가르면 cascade 제거가 오히려 **정확한 동작**이 된다 — 검증 대상이 없으면 검증도 없다.
 * 이 경계는 scripts/frontend-reachability-census.test.mjs 의 생존 가드가 main CI 에서 지킨다.
 */
describe('Core user services', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('deptJobUserService calls correct endpoints', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce(PAGE);
    await deptJobUserService.getDeptJobBoxes({ page: 0 });
    expect(client.getRaw).toHaveBeenCalledWith('dept-jobs/boxes', {
      params: { pageIndex: 1 },
    });
  });

  it('menuService calls correct endpoints', async () => {
    vi.mocked(client.getRaw).mockResolvedValueOnce({
      success: true,
      code: 'S000',
      message: '성공',
      data: { list: [] },
    });
    await menuService.getHeadMenus();
    expect(client.getRaw).toHaveBeenCalledWith('menus/head', undefined);
  });

  it('menuService 즐겨찾기는 본인 목록·추가·빼기 경로를 부른다 (DIP B5 F2)', async () => {
    const OK = { success: true, code: 'S000', message: '성공', data: null };
    vi.mocked(client.getRaw).mockResolvedValueOnce({ ...OK, data: [{ menuNo: 10, menuNm: '공지' }] });
    vi.mocked(client.requestRaw).mockResolvedValue(OK);

    await expect(menuService.getMyBookmarks()).resolves.toEqual([{ menuNo: 10, menuNm: '공지' }]);
    expect(client.getRaw).toHaveBeenCalledWith('menus/bookmarks', undefined);
    await menuService.addBookmark(10);
    expect(client.requestRaw).toHaveBeenCalledWith({ url: 'menus/bookmarks/10', method: 'put' });
    await menuService.removeBookmark(10);
    expect(client.requestRaw).toHaveBeenCalledWith({ url: 'menus/bookmarks/10', method: 'delete' });
  });
});
