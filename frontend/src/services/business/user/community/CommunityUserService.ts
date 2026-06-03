import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { CommunityVO, CommunitySearchParams } from '@/types/business/community';

/**
 * 커뮤니티 사용자 서비스
 * path: /api/v1/communities
 */
class CommunityUserService extends UserService {
    constructor() {
        super('communities');
    }

    /**
     * 커뮤니티 목록 조회
     */
    async getCommunityList(params: CommunitySearchParams): Promise<PageResponse<CommunityVO>> {
        return this.get<PageResponse<CommunityVO>>('', { params });
    }

    /**
     * 커뮤니티 상세 조회
     */
    async getCommunity(cmntyId: string): Promise<CommunityVO> {
        return this.get<CommunityVO>(`/${cmntyId}`);
    }

    /**
     * 커뮤니티 가입 신청
     */
    async joinCommunity(cmntyId: string): Promise<void> {
        return this.post<void>(`/${cmntyId}/join`);
    }

    /**
     * 커뮤니티 등록 (사용자용)
     */
    async createCommunity(community: Partial<CommunityVO>): Promise<void> {
        return this.post<void>('', community);
    }
}

export const communityUserService = new CommunityUserService();
export default communityUserService;
