import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

export const getCommunityList = async (params: CommunitySearchParams) => {
    const { data } = await client.get<PaginationResponse<CommunityVO>>('/cop/cmy/selectCommuMasterList.do', { params });
    return data;
};

export const getCommunity = async (cmmntyId: string) => {
    const { data } = await client.get<CommunityVO>(`/cop/cmy/selectCommuMasterDetail.do?cmmntyId=${cmmntyId}`);
    return data;
};

export const createCommunity = async (community: CommunityVO) => {
    return client.post('/cop/cmy/insertCommuMaster.do', community);
};

export const updateCommunity = async (community: CommunityVO) => {
    return client.post('/cop/cmy/updateCommuMaster.do', community);
};
