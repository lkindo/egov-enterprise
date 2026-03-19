import client from '@/lib/api/client';
import { PageResponse } from '@/types/system';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

const BASE_URL = '/communities';

export const getCommunityList = async (params: CommunitySearchParams = {}): Promise<PageResponse<CommunityVO>> => {
 return client.get<PageResponse<CommunityVO>>(BASE_URL, { params });
};

export const getCommunity = async (cmmntyId: string): Promise<CommunityVO> => {
 return client.get<CommunityVO>(`${BASE_URL}/${cmmntyId}`);
};

export const createCommunity = async (community: Partial<CommunityVO>): Promise<CommunityVO> =>
 client.post(BASE_URL, community);

export const updateCommunity = async (cmmntyId: string, community: Partial<CommunityVO>): Promise<void> =>
 client.put(`${BASE_URL}/${cmmntyId}`, community);

export const deleteCommunity = async (cmmntyId: string): Promise<void> =>
 client.delete(`${BASE_URL}/${cmmntyId}`);
