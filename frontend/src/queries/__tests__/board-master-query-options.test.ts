import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  getBoardMasterList: vi.fn(),
  getBoardMaster: vi.fn(),
}));

vi.mock('@/services/foundation/system/BoardAdminService', () => ({ boardAdminService: service }));

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

  it('query options가 generated 파라미터와 서비스 호출을 함께 소유한다', async () => {
    service.getBoardMasterList.mockResolvedValueOnce({ list: [] });
    service.getBoardMaster.mockResolvedValueOnce({ bbsId: 'BBSMSTR_A' });
    const list = boardMasterQueryOptions.list({ pageIndex: 1, pageUnit: 20 });
    const detail = boardMasterQueryOptions.detail('BBSMSTR_A');

    await list.queryFn?.({ queryKey: list.queryKey } as never);
    await detail.queryFn?.({ queryKey: detail.queryKey } as never);

    expect(service.getBoardMasterList).toHaveBeenCalledWith({ pageIndex: 1, pageUnit: 20 });
    expect(service.getBoardMaster).toHaveBeenCalledWith('BBSMSTR_A');
  });

  it('전체 선택지 option은 서버 상한 100으로 모든 페이지를 수집한다', async () => {
    const firstPage = Array.from({ length: 100 }, (_, index) => ({ bbsId: `BBS_${index}` }));
    service.getBoardMasterList
      .mockResolvedValueOnce({ list: firstPage, total: 101 })
      .mockResolvedValueOnce({ list: [{ bbsId: 'BBS_100' }], total: 101 });

    const completeList = boardMasterQueryOptions.completeList();
    await expect(completeList.queryFn?.({ queryKey: completeList.queryKey } as never))
      .resolves.toHaveLength(101);

    expect(completeList.queryKey).toEqual(['board-masters', 'list', 'complete']);
    expect(service.getBoardMasterList.mock.calls).toEqual([
      [{ pageIndex: 1, pageUnit: 100 }],
      [{ pageIndex: 2, pageUnit: 100 }],
    ]);
  });
});
