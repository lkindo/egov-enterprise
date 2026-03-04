import { UserService } from '@/services/core/ApiService';
import { PaginationResponse } from '@/types/system';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

class CommunityUserService extends UserService {
    constructor() {
        // Note: Assuming paths remain the same, but normally we'd omit /api/v1/user since UserService adds it.
        // If endpoints are legacy /cop/cmy/..., we should just use them directly if Backend hasn't completely refactored their root.
        // Actually, Phase 1 moved User API to domain packages and usually under root or standard. Let's keep existing paths absolute if they include .do, but actually UserService prepends /api/v1/user. Wait, if it's the old .do, we should override or use client directly. But it's better to align. For now, let's keep the exact string but via client, or assume it's moved.
        // Let's use get, post from ApiService but pass the absolute path if needed, or adjust constructor.
        // ApiService handles `/${this.basePath}`. Let's set basePath = 'cop/cmy'.
        super('cop/cmy');
    }

    async getCommunityList(params: CommunitySearchParams): Promise<PaginationResponse<CommunityVO>> {
        return this.get<PaginationResponse<CommunityVO>>('/selectCommuMasterList.do', { params });
    }

    async getCommunity(cmmntyId: string): Promise<CommunityVO> {
        return this.get<CommunityVO>(`/selectCommuMasterDetail.do?cmmntyId=${cmmntyId}`);
    }

    async createCommunity(community: CommunityVO): Promise<void> {
        return this.post<void>('/insertCommuMaster.do', community);
    }

    async updateCommunity(community: CommunityVO): Promise<void> {
        return this.post<void>('/updateCommuMaster.do', community);
    }
}

export const communityUserService = new CommunityUserService();
