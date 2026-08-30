import { beforeEach, describe, expect, it, vi } from 'vitest';
import client from '@/lib/api/client';
import { scrapService } from '../ScrapService';

vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('ScrapService generated contract', () => {
  beforeEach(() => vi.clearAllMocks());

  it('생성된 page/scrap Zod 계약으로 목록 응답을 검증한다', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      list: [{ scrapSn: 17, scrapNm: '문서', useYn: 'Y' }],
      total: 1,
      page: 0,
      size: 10,
      totalPage: 1,
    });

    await expect(scrapService.getMyScraps({ pageIndex: 1, pageUnit: 10 })).resolves.toMatchObject({
      list: [{ scrapSn: 17, useYn: 'Y' }],
      total: 1,
    });
  });

  it('계약 밖 useYn 응답을 UI로 통과시키지 않는다', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({
      list: [{ scrapSn: 17, scrapNm: '문서', useYn: 'UNKNOWN' }],
    });

    await expect(scrapService.getMyScraps({ pageIndex: 1, pageUnit: 10 })).rejects.toThrow();
  });

  it('상세·생성·수정은 생성 DTO를 공유하고 생성 식별자를 보존한다', async () => {
    vi.mocked(client.get).mockResolvedValueOnce({ scrapSn: 17, scrapNm: '문서', useYn: 'Y' });
    vi.mocked(client.post).mockResolvedValueOnce(31);
    vi.mocked(client.put).mockResolvedValueOnce(undefined);

    await expect(scrapService.getScrap(17)).resolves.toMatchObject({ scrapSn: 17 });
    await expect(scrapService.createScrap({ scrapNm: '신규', useYn: 'Y' })).resolves.toBe(31);
    await expect(scrapService.updateScrap(17, { scrapNm: '수정', useYn: 'Y' })).resolves.toBeUndefined();

    expect(client.post).toHaveBeenCalledWith('scraps', { scrapNm: '신규', useYn: 'Y' }, undefined);
    expect(client.put).toHaveBeenCalledWith('scraps/17', { scrapNm: '수정', useYn: 'Y' }, undefined);
  });
});
