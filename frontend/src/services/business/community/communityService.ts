import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';

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
    return this.get<PageResponse<CommunityVO>>('', params);
  }

  /**
   * 커뮤니티 상세 조회
   * @param cmmntyId 커뮤니티 ID
   * @returns 커뮤니티 상세 정보
   */
  public async getCommunity(cmmntyId: string): Promise<CommunityVO> {
    return this.get<CommunityVO>(`/${cmmntyId}`);
  }

  /**
   * 커뮤니티 등록
   * @param community 커뮤니티 정보
   * @returns 생성된 커뮤니티 정보
   */
  public async createCommunity(community: Partial<CommunityVO>): Promise<CommunityVO> {
    return this.post<CommunityVO>('', community);
  }

  /**
   * 커뮤니티 수정
   * @param cmmntyId 커뮤니티 ID
   * @param community 수정할 커뮤니티 정보
   */
  public async updateCommunity(cmmntyId: string, community: Partial<CommunityVO>): Promise<void> {
    return this.put<void>(`/${cmmntyId}`, community);
  }

  /**
   * 커뮤니티 삭제
   * @param cmmntyId 커뮤니티 ID
   */
  public async deleteCommunity(cmmntyId: string): Promise<void> {
    return this.delete<void>(`/${cmmntyId}`);
  }
}

export const communityService = new CommunityService();
