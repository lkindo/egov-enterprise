import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';
;

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
   * @param cmntySn 커뮤니티 일련번호
   * @returns 커뮤니티 상세 정보
   */
  public async getCommunity(cmntySn: number): Promise<CommunityVO> {
    return this.get<CommunityVO>(`/${cmntySn}`);
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
   * @param cmntySn 커뮤니티 일련번호
   * @param community 수정할 커뮤니티 정보
   */
  public async updateCommunity(cmntySn: number, community: Partial<CommunityVO>): Promise<void> {
    return this.put<void>(`/${cmntySn}`, community);
  }

  /**
   * 커뮤니티 삭제
   * @param cmntySn 커뮤니티 일련번호
   */
  public async deleteCommunity(cmntySn: number): Promise<void> {
    return this.delete<void>(`/${cmntySn}`);
  }
}

export const communityService = new CommunityService();

export const getCommunityList = communityService.getCommunityList.bind(communityService);
export const getCommunity = communityService.getCommunity.bind(communityService);
export const createCommunity = communityService.createCommunity.bind(communityService);
export const updateCommunity = communityService.updateCommunity.bind(communityService);
export const deleteCommunity = communityService.deleteCommunity.bind(communityService);
