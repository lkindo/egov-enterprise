import { QueryClient } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const service = vi.hoisted(() => ({
  createScrap: vi.fn(),
  deleteScrap: vi.fn(),
  getMyScraps: vi.fn(),
  getScrap: vi.fn(),
  updateScrap: vi.fn(),
}));

vi.mock('@/services/business/user/ScrapService', () => ({ scrapService: service }));

import {
  scrapKeys,
  scrapMutationOptions,
  scrapQueryOptions,
} from '../scrap-query-options';

describe('scrap query ownership', () => {
  beforeEach(() => vi.clearAllMocks());

  it('목록과 상세가 충돌하지 않는 계층형 key를 소유한다', () => {
    expect(scrapKeys.all).toEqual(['scraps']);
    expect(scrapKeys.list({ pageIndex: 2, pageUnit: 20 })).toEqual([
      'scraps', 'list', { pageIndex: 2, pageUnit: 20 },
    ]);
    expect(scrapKeys.detail(17)).toEqual(['scraps', 'detail', 17]);
  });

  it('목록·상세 query options가 service 호출까지 소유한다', async () => {
    service.getMyScraps.mockResolvedValueOnce({ list: [], total: 0 });
    service.getScrap.mockResolvedValueOnce({ scrapSn: 17, useYn: 'Y' });

    const list = scrapQueryOptions.list({ pageIndex: 2, pageUnit: 20 });
    const detail = scrapQueryOptions.detail(17);
    await list.queryFn?.({ queryKey: list.queryKey } as never);
    await detail.queryFn?.({ queryKey: detail.queryKey } as never);

    expect(service.getMyScraps).toHaveBeenCalledWith({ pageIndex: 2, pageUnit: 20 });
    expect(service.getScrap).toHaveBeenCalledWith(17);
  });

  it('성공한 create/update/delete만 factory key로 cache를 무효화한다', async () => {
    const queryClient = new QueryClient();
    const invalidate = vi.spyOn(queryClient, 'invalidateQueries').mockResolvedValue(undefined);
    service.createScrap.mockResolvedValueOnce(31);
    service.updateScrap.mockResolvedValueOnce(undefined);
    service.deleteScrap.mockResolvedValueOnce(undefined);

    await scrapMutationOptions.create(queryClient).mutationFn?.(
      { scrapNm: '문서', useYn: 'Y' },
      {} as never,
    );
    await scrapMutationOptions.update(queryClient).mutationFn?.({
      scrapSn: 17,
      data: { scrapNm: '수정', useYn: 'Y' },
    }, {} as never);
    await scrapMutationOptions.remove(queryClient).mutationFn?.(17, {} as never);

    expect(invalidate).toHaveBeenCalledWith({ queryKey: scrapKeys.lists() });
    expect(invalidate).toHaveBeenCalledWith({ queryKey: scrapKeys.detail(17) });
    expect(invalidate).not.toHaveBeenCalledWith({ queryKey: ['scraps'] });
  });
});
