import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  getBoardMasterList: vi.fn(),
  getBoardMaster: vi.fn(),
  getBoardChangeHistory: vi.fn(),
}));
const userService = vi.hoisted(() => ({
  getBoardMeta: vi.fn(),
  getBoardOptions: vi.fn(),
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({ boardAdminService: service }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: userService }));

import { boardMasterKeys, boardMasterQueryOptions } from '../board-master-query-options';

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
});
