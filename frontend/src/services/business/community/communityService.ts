import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';
import { CommunityDto } from '@/types/modernization';

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
    return this.get<PageResponse<CommunityVO>>('', { params });
  }

  /**
   * 커뮤니티 상세 조회
   * @param cmntyId 커뮤니티 ID
   * @returns 커뮤니티 상세 정보
   */
  public async getCommunity(cmntyId: string): Promise<CommunityVO> {
    return this.get<CommunityVO>(`/${cmntyId}`);
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
   * @param cmntyId 커뮤니티 ID
   * @param community 수정할 커뮤니티 정보
   */
  public async updateCommunity(cmntyId: string, community: Partial<CommunityVO>): Promise<void> {
    return this.put<void>(`/${cmntyId}`, community);
  }

  /**
   * 커뮤니티 삭제
   * @param cmntyId 커뮤니티 ID
   */
  public async deleteCommunity(cmntyId: string): Promise<void> {
    return this.delete<void>(`/${cmntyId}`);
  }
}

export const communityService = new CommunityService();

export const getCommunityList = communityService.getCommunityList.bind(communityService);
export const getCommunity = communityService.getCommunity.bind(communityService);
export const createCommunity = communityService.createCommunity.bind(communityService);
export const updateCommunity = communityService.updateCommunity.bind(communityService);
export const deleteCommunity = communityService.deleteCommunity.bind(communityService);
