import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/system';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

class CommunityUserService extends UserService {
 constructor() {
 super('cop/cmy');
 }

 async getCommunityList(params: CommunitySearchParams): Promise<PageResponse<CommunityVO>> {
 return this.get<PageResponse<CommunityVO>>('/selectCommuMasterList.do', { params });
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
