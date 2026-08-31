import { beforeEach, describe, expect, it, vi } from 'vitest';

const cookieState = vi.hoisted(() => ({ accessToken: 'token' as string | undefined }));
const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));
const boardAdminService = vi.hoisted(() => ({
  getBoardMasterList: vi.fn(),
  getBoardMaster: vi.fn(),
}));

vi.mock('next/headers', () => ({
  cookies: vi.fn(async () => ({
    get: (name: string) => name === 'accessToken' && cookieState.accessToken
      ? { value: cookieState.accessToken }
      : undefined,
  })),
}));
vi.mock('next/navigation', () => ({ redirect: vi.fn() }));
vi.mock('@/lib/api/client', () => ({ default: client }));
vi.mock('@/services/foundation/system/BoardAdminService', () => ({ boardAdminService }));

import { getInitialBoardData, resolveDefaultBoardId } from '../BoardListServer';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: 'success',
  data,
});

describe('BoardListServer generated 경계', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    cookieState.accessToken = 'token';
  });

  it('게시판 기본값은 pageUnit=100으로 끝까지 조회한 generated service 결과에서 고른다', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({
      bbsId: `DISABLED_${index}`,
      useYn: 'N',
    }));
    boardAdminService.getBoardMasterList
      .mockResolvedValueOnce({ list: firstPage, total: 101, page: 1, size: 100, totalPage: 2 })
      .mockResolvedValueOnce({
        list: [{ bbsId: 'BBS_ACTIVE', useYn: 'Y' }],
        total: 101,
        page: 2,
        size: 100,
        totalPage: 2,
      });

    await expect(resolveDefaultBoardId()).resolves.toBe('BBS_ACTIVE');
    expect(boardAdminService.getBoardMasterList).toHaveBeenNthCalledWith(
      1,
      { pageIndex: 1, pageUnit: 100 },
      { headers: { Authorization: 'Bearer token' } },
    );
    expect(boardAdminService.getBoardMasterList).toHaveBeenNthCalledWith(
      2,
      { pageIndex: 2, pageUnit: 100 },
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('게시글 목록은 exact getPosts operation을 쓰고 마스터는 generated service로 조회한다', async () => {
    const page = { list: [], total: 0, page: 1, size: 10, totalPage: 0 };
    const master = { bbsId: 'BBS_1', bbsNm: '게시판' };
    client.getRaw.mockResolvedValueOnce(success(page));
    boardAdminService.getBoardMaster.mockResolvedValueOnce(master);

    await expect(getInitialBoardData({
      bbsId: 'BBS_1',
      page: 2,
      searchWrd: '검색',
      searchCnd: '0',
      orderBy: 'latest',
    })).resolves.toStrictEqual({
      list: [],
      total: 0,
      totalPage: 0,
      masterInfo: master,
      fetchError: null,
    });

    expect(client.getRaw).toHaveBeenCalledWith('boards/BBS_1', {
      headers: { Authorization: 'Bearer token' },
      params: {
        page: 1,
        size: 10,
        searchWrd: '검색',
        searchCnd: '0',
        orderBy: 'latest',
      },
    });
    expect(boardAdminService.getBoardMaster).toHaveBeenCalledWith(
      'BBS_1',
      { headers: { Authorization: 'Bearer token' } },
    );
  });

  it('토큰이 없으면 어떤 HTTP 경계도 실행하지 않는다', async () => {
    cookieState.accessToken = undefined;

    await expect(getInitialBoardData({
      bbsId: 'BBS_1',
      page: 1,
      searchWrd: '',
      searchCnd: '',
      orderBy: '',
    })).resolves.toStrictEqual({
      list: [],
      total: 0,
      totalPage: 0,
      masterInfo: null,
      fetchError: null,
    });
    expect(client.getRaw).not.toHaveBeenCalled();
    expect(boardAdminService.getBoardMaster).not.toHaveBeenCalled();
  });
});
