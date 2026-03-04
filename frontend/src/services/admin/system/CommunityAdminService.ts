import { AdminService } from '@/services/core/ApiService';

export interface Community {
    cmmntyId: string;
    cmmntyNm: string;
    cmmntyIntrcn: string;
    useAt: 'Y' | 'N';
    registSeCode: string;
    frstRegisterId: string;
    createdDate: string;
}

class CommunityAdminService extends AdminService {
    constructor() {
        super('/communities');
    }

    async getCommunities(params: { page?: number; size?: number; searchWrd?: string }) {
        return this.get<any>('', { params });
    }

    async createCommunity(data: Partial<Community>) {
        return this.post<any>('', data);
    }

    async deleteCommunity(id: string) {
        return this.delete<any>(`/${id}`);
    }
}

export const communityAdminService = new CommunityAdminService();