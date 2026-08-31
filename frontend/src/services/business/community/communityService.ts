import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';
import type { components, operations } from '@/types/generated-api';
import { getCommunities_1Operation, getCommunity_1Operation } from '@/types/generated-operations';
;

type CommunityListQuery = NonNullable<operations['getCommunities_1']['parameters']['query']>;

function toCommunityListQuery(params: CommunitySearchParams): CommunityListQuery {
  const raw = params as Record<string, unknown>;
  const page = params.page
    ?? (params.pageIndex === undefined ? undefined : Math.max(0, params.pageIndex - 1))
    ?? (params.pageNo === undefined ? undefined : Math.max(0, params.pageNo - 1));
  const size = typeof params.size === 'number'
    ? params.size
    : typeof params.pageUnit === 'number'
      ? params.pageUnit
      : typeof raw.pageSize === 'number'
        ? raw.pageSize
        : undefined;
  const searchCnd = typeof raw.searchCnd === 'string' ? raw.searchCnd : params.searchCondition;
  const searchWrd = typeof raw.searchWrd === 'string' ? raw.searchWrd : params.searchKeyword;
  const sort = Array.isArray(raw.sort) && raw.sort.every((item) => typeof item === 'string')
    ? raw.sort as string[]
    : undefined;

  return {
    ...(page === undefined ? {} : { page }),
    ...(size === undefined ? {} : { size }),
    ...(searchCnd === undefined ? {} : { searchCnd }),
    ...(searchWrd === undefined ? {} : { searchWrd }),
    ...(sort === undefined ? {} : { sort }),
  };
}

function requireCommunityPage(
  response: components['schemas']['PageResponseCommunityDto'],
): PageResponse<CommunityVO> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('커뮤니티 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as unknown as PageResponse<CommunityVO>;
}

/**
 * 커뮤니티 관리 서비스
 * 백엔드 CommunityApiController (business-suite)와 연동
 */
class CommunityService extends ApiService {
  constructor() {
    super('/communities');
  }

  /**
   * 커뮤니티 목록 조회
   * @param params 검색 파라미터
   * @returns 커뮤니티 페이지 결과
   */
  public async getCommunityList(params: CommunitySearchParams = {}): Promise<PageResponse<CommunityVO>> {
    const response = await this.executeGenerated(getCommunities_1Operation, {
      query: toCommunityListQuery(params),
    });
    return requireCommunityPage(response);
  }

  /**
   * 커뮤니티 상세 조회
   * @param cmntySn 커뮤니티 일련번호
   * @returns 커뮤니티 상세 정보
   */
  public async getCommunity(cmntySn: number): Promise<CommunityVO> {
    return this.executeGenerated(getCommunity_1Operation, {
      path: { cmntySn },
    }) as Promise<CommunityVO>;
  }

}

export const communityService = new CommunityService();

export const getCommunityList = communityService.getCommunityList.bind(communityService);
export const getCommunity = communityService.getCommunity.bind(communityService);
