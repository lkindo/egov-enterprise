import { beforeEach, describe, expect, it, vi } from 'vitest';

const client = vi.hoisted(() => ({
  getRaw: vi.fn(),
  requestRaw: vi.fn(),
}));

vi.mock('@/lib/api/client', () => ({ default: client }));

import { communityService } from '../communityService';
import { communityUserService } from '@/services/business/user/community/CommunityUserService';

const success = <T,>(data: T) => ({
  success: true as const,
  code: 'S000',
  message: '성공',
  data,
});

const emptyPage = { list: [], total: 0, page: 0, size: 10, totalPage: 0 };

describe('communityService generated contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    client.getRaw.mockResolvedValue(success(emptyPage));
  });

  it('목록과 상세는 generated operation의 정확한 경로를 사용한다', async () => {
    const detail = { cmntySn: 7, cmntyNm: '개발', cmntyIntroCn: '소개', useYn: 'Y' as const };
    client.getRaw
      .mockResolvedValueOnce(success(emptyPage))
      .mockResolvedValueOnce(success(detail));

    await communityService.getCommunityList();
    await expect(communityService.getCommunity(7)).resolves.toStrictEqual(detail);

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'communities', { params: {} });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'communities/7', undefined);
  });

  it('0-based page와 size는 OpenAPI Pageable 축으로 그대로 전달한다', async () => {
    await communityService.getCommunityList({ page: 2, size: 15 });

    expect(client.getRaw).toHaveBeenCalledWith('communities', {
      params: { page: 2, size: 15 },
    });
  });

  it.each([
    ['communityService', communityService],
    ['communityUserService', communityUserService],
  ] as const)('%s는 같은 목록 계약에서 page와 명시 검색 키를 우선한다', async (_name, service) => {
    const params = {
      page: 2, pageIndex: 8, pageNo: 9,
      size: 15, pageUnit: 20, pageSize: 30,
      searchCnd: '0', searchCondition: '1',
      searchWrd: '개발', searchKeyword: '운영',
      sort: ['cmntyNm,asc'],
    };
    const before = structuredClone(params);

    await service.getCommunityList(params);

    expect(client.getRaw).toHaveBeenCalledWith('communities', {
      params: { page: 2, size: 15, searchCnd: '0', searchWrd: '개발', sort: ['cmntyNm,asc'] },
    });
    expect(params).toStrictEqual(before);
  });

  it('1-based legacy pageIndex/pageNo와 pageUnit/pageSize를 명시적으로 변환한다', async () => {
    await communityService.getCommunityList({ pageIndex: 3, pageUnit: 20 });
    await communityService.getCommunityList({ pageNo: 4, pageSize: 30 });

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'communities', {
      params: { page: 2, size: 20 },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'communities', {
      params: { page: 3, size: 30 },
    });
  });

  it('정확한 searchCnd/searchWrd와 공개 legacy 별칭을 같은 generated query로 정규화한다', async () => {
    await communityService.getCommunityList({ searchCnd: '0', searchWrd: '개발' });
    await communityService.getCommunityList({ searchCondition: '1', searchKeyword: '홍길동' });

    expect(client.getRaw).toHaveBeenNthCalledWith(1, 'communities', {
      params: { searchCnd: '0', searchWrd: '개발' },
    });
    expect(client.getRaw).toHaveBeenNthCalledWith(2, 'communities', {
      params: { searchCnd: '1', searchWrd: '홍길동' },
    });
  });

  it('OpenAPI에 없는 useYn은 요청 경계에 흘리지 않는다', async () => {
    await communityService.getCommunityList({ page: 0, useYn: 'Y' });

    expect(client.getRaw).toHaveBeenCalledWith('communities', { params: { page: 0 } });
  });

  it('페이지 필수 필드가 빠진 응답은 fail-closed한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({ list: [] }));

    await expect(communityService.getCommunityList()).rejects.toThrow(
      '커뮤니티 페이지 응답이 필수 계약과 일치하지 않습니다.',
    );
  });

  it.each(['list', 'total', 'page', 'size', 'totalPage'] as const)(
    '사용자 서비스도 %s가 없는 페이지를 빈 결과로 위장하지 않는다',
    async (field) => {
      const incomplete: Partial<typeof emptyPage> = { ...emptyPage };
      delete incomplete[field];
      client.getRaw.mockResolvedValueOnce(success(incomplete));

      await expect(communityUserService.getCommunityList({})).rejects.toThrow(
        '커뮤니티 페이지 응답이 필수 계약과 일치하지 않습니다.',
      );
    },
  );

  it('상세 응답의 generated enum이 어긋나면 거부한다', async () => {
    client.getRaw.mockResolvedValueOnce(success({ cmntySn: 7, useYn: 'INVALID' }));

    await expect(communityService.getCommunity(7)).rejects.toThrow(
      '생성 API 응답이 OpenAPI 계약과 일치하지 않습니다.',
    );
  });

  it('transport 오류를 삼키지 않고 그대로 전파한다', async () => {
    const failure = new Error('조회 권한이 없습니다.');
    client.getRaw.mockRejectedValueOnce(failure);

    await expect(communityService.getCommunity(1)).rejects.toBe(failure);
  });
});
