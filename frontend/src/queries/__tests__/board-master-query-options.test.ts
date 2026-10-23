import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  getBoardMasterList: vi.fn(),
  getBoardMaster: vi.fn(),
  getBoardChangeHistory: vi.fn(),
}));
const userService = vi.hoisted(() => ({
  getBoardMeta: vi.fn(),
  getBoardOptions: vi.fn(),
  getPosts: vi.fn(),
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({ boardAdminService: service }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: userService }));

import { boardMasterKeys, boardMasterQueryOptions, invalidateBoardOperationPosts } from '../board-master-query-options';

describe('board master query ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('목록과 상세를 계층형 key로 소유한다', () => {
    expect(boardMasterKeys.list({ searchKeyword: '공지' })).toEqual([
      'board-masters', 'list', { searchKeyword: '공지' },
    ]);
    expect(boardMasterKeys.detail('BBSMSTR_A')).toEqual([
      'board-masters', 'detail', 'BBSMSTR_A',
    ]);
  });

  it('목록 query options의 queryKey가 쪽·크기를 담는다(페이지 크기 결속 census 가 이 사실에 기댄다)', () => {
    expect(boardMasterQueryOptions.list({ searchKeyword: '', page: 2, size: 20 }).queryKey).toEqual([
      'board-masters', 'list', { searchKeyword: '', page: 2, size: 20 },
    ]);
    expect(boardMasterQueryOptions.list({ searchKeyword: '', page: 2, size: 50 }).queryKey)
      .not.toEqual(boardMasterQueryOptions.list({ searchKeyword: '', page: 2, size: 20 }).queryKey);
  });

  it('query options가 generated 파라미터와 서비스 호출을 함께 소유한다', async () => {
    service.getBoardMasterList.mockResolvedValueOnce({ list: [] });
    service.getBoardMaster.mockResolvedValueOnce({ bbsId: 'BBSMSTR_A' });
    const list = boardMasterQueryOptions.list({ page: 1, size: 20 });
    const detail = boardMasterQueryOptions.detail('BBSMSTR_A');

    await list.queryFn?.({ queryKey: list.queryKey } as never);
    await detail.queryFn?.({ queryKey: detail.queryKey } as never);

    expect(service.getBoardMasterList).toHaveBeenCalledWith({ page: 1, size: 20 });
    expect(service.getBoardMaster).toHaveBeenCalledWith('BBSMSTR_A');
  });

  // [2026-10-23 ADR-0040 결정 11] 이용 화면의 선택지는 관리 목록(전 페이지 수집)이 아니라 사용자 선택지 API 하나다.
  it('선택지 option은 사용자 선택지 API 를 부르고 관리 목록을 부르지 않는다', async () => {
    userService.getBoardOptions.mockResolvedValueOnce([{ bbsId: 'BBSMSTR_A', bbsTtl: '공지' }]);

    const options = boardMasterQueryOptions.options();
    await expect(options.queryFn?.({ queryKey: options.queryKey } as never))
      .resolves.toEqual([{ bbsId: 'BBSMSTR_A', bbsTtl: '공지' }]);

    expect(options.queryKey).toEqual(['board-masters', 'options']);
    expect(service.getBoardMasterList).not.toHaveBeenCalled();
  });

  it('변경 이력 option은 게시판 상세 키 아래에 쪽·크기를 담는다(설정 저장이 상세 키로 함께 무효화한다)', async () => {
    service.getBoardChangeHistory.mockResolvedValueOnce({ list: [] });
    const history = boardMasterQueryOptions.changeHistory('BBSMSTR_A', 2, 20);

    await history.queryFn?.({ queryKey: history.queryKey } as never);

    expect(history.queryKey).toEqual(['board-masters', 'detail', 'BBSMSTR_A', 'change-history', { page: 2, size: 20 }]);
    expect(service.getBoardChangeHistory).toHaveBeenCalledWith('BBSMSTR_A', { page: 2, size: 20 });
  });
  // [2026-10-23 ADR-0040 §5.4·D-1] 운영 게시물 목록은 이용자 목록 API 를 쓰되 상세 키 아래에 둔다 — 설정 저장이 함께 다시 읽는다.
  it('운영 게시물 option은 상세 키 아래에 조건을 담고, 빈 조건은 보내지 않는다', async () => {
    userService.getPosts.mockResolvedValue({ list: [] });
    const plain = boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 1, size: 20 });
    const filtered = boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 2, size: 50, searchWrd: '공지', postingStatus: 'SCHEDULED' });

    expect(plain.queryKey).toEqual(['board-masters', 'detail', 'BBSMSTR_A', 'posts', { page: 1, size: 20 }]);
    await plain.queryFn?.({ queryKey: plain.queryKey } as never);
    await filtered.queryFn?.({ queryKey: filtered.queryKey } as never);
    expect(userService.getPosts).toHaveBeenNthCalledWith(1, 'BBSMSTR_A', { page: 1, size: 20 });
    expect(userService.getPosts).toHaveBeenNthCalledWith(2, 'BBSMSTR_A', {
      page: 2, size: 50, searchCnd: '0', searchWrd: '공지', postingStatus: 'SCHEDULED',
    });
  });

  // [2026-10-23 ADR-0040 결정 5] 상단 고정 조건은 true·false 둘 다 조건이다 — false('고정 아닌 글')를 빈 조건으로 삼키지 않는다.
  it('운영 게시물 option은 상단 고정 조건을 true·false 그대로 키와 요청에 싣는다', async () => {
    userService.getPosts.mockResolvedValue({ list: [] });
    const pinned = boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 1, size: 20, pinned: true });
    const unpinned = boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 1, size: 20, pinned: false });

    expect(pinned.queryKey).not.toEqual(unpinned.queryKey);
    await pinned.queryFn?.({ queryKey: pinned.queryKey } as never);
    await unpinned.queryFn?.({ queryKey: unpinned.queryKey } as never);
    expect(userService.getPosts).toHaveBeenNthCalledWith(1, 'BBSMSTR_A', { page: 1, size: 20, pinned: true });
    expect(userService.getPosts).toHaveBeenNthCalledWith(2, 'BBSMSTR_A', { page: 1, size: 20, pinned: false });
  });

  it('운영 게시물 query options의 queryKey가 쪽·크기를 담는다(페이지 크기 결속 census 가 이 사실에 기댄다)', () => {
    expect(boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 2, size: 50 }).queryKey)
      .not.toEqual(boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 2, size: 20 }).queryKey);
    expect(boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 1, size: 20 }).queryKey)
      .not.toEqual(boardMasterQueryOptions.operationPosts('BBSMSTR_A', { page: 2, size: 20 }).queryKey);
  });

  it('게시 기간·상단 고정을 바꾼 뒤 운영 목록·변경 이력·이용 화면 목록·상세를 다시 읽는다', async () => {
    const invalidateQueries = vi.fn().mockResolvedValue(undefined);
    await invalidateBoardOperationPosts({ invalidateQueries } as never, 'BBSMSTR_A');

    expect(invalidateQueries.mock.calls.map(([filters]) => filters.queryKey)).toEqual([
      ['board-masters', 'detail', 'BBSMSTR_A', 'posts'],
      ['board-masters', 'detail', 'BBSMSTR_A', 'change-history'],
      ['boardList', 'BBSMSTR_A'],
      ['article-detail', 'BBSMSTR_A'],
    ]);
  });
});
