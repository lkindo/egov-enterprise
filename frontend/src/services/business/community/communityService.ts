import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';
import { getCommunities_1Operation, getCommunity_1Operation } from '@/types/generated-operations';
import { requireCommunityPage, toCommunityListQuery } from './community-contract';

/**
 * 커뮤니티 관리 서비스
 * 백엔드 CommunityApiController와 연동
 */
class CommunityService extends ApiService {
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
