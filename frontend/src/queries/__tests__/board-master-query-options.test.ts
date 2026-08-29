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
});
