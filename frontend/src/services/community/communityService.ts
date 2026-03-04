import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

export const getCommunityList = async (params: CommunitySearchParams): Promise<PaginationResponse<CommunityVO>> =>
    client.get<PaginationResponse<CommunityVO>>('/cop/cmy/selectCommuMasterList.do', { params });

export const getCommunity = async (cmmntyId: string): Promise<CommunityVO> =>
    client.get<CommunityVO>(`/cop/cmy/selectCommuMasterDetail.do?cmmntyId=${cmmntyId}`);

export const createCommunity = async (community: CommunityVO): Promise<void> =>
    client.post('/cop/cmy/insertCommuMaster.do', community);

export const updateCommunity = async (community: CommunityVO): Promise<void> =>
    client.post('/cop/cmy/updateCommuMaster.do', community);