import { UserService } from '@/services/core/ApiService';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

class CommunityUserService extends UserService {
    constructor() {
        super('cop/cmy');
    }

    async getCommunityList(params: CommunitySearchParams) {
        const response = await this.get<any>('/selectCommuMasterList.do', { params });
        return response?.result || response;
    }

    async getCommunity(cmmntyId: string) {
        const response = await this.get<any>(`/selectCommuMasterDetail.do?cmmntyId=${cmmntyId}`);
        return response?.result || response;
    }

    async createCommunity(community: CommunityVO) {
        const response = await this.post<any>('/insertCommuMaster.do', community);
        return response?.result || response;
    }

    async updateCommunity(community: CommunityVO) {
        const response = await this.post<any>('/updateCommuMaster.do', community);
        return response?.result || response;
    }
}

export const communityUserService = new CommunityUserService();
