import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { CommunityVO, CommunitySearchParams } from '@/types/community';

const BASE_URL = '/api/v1/communities';

export const getCommunityList = async (params: any = {}): Promise<any> => {
    const response = await client.get<any>(BASE_URL, { params });
    return {
        resultList: response.result?.content || [],
        totalCount: response.result?.totalElements || 0
    };
};

export const getCommunity = async (cmmntyId: string): Promise<any> => {
    const response = await client.get<any>(`${BASE_URL}/${cmmntyId}`);
    return response.result;
};

export const createCommunity = async (community: any): Promise<void> =>
    client.post(BASE_URL, community);

export const updateCommunity = async (cmmntyId: string, community: any): Promise<void> =>
    client.put(`${BASE_URL}/${cmmntyId}`, community);

export const deleteCommunity = async (cmmntyId: string): Promise<void> =>
    client.delete(`${BASE_URL}/${cmmntyId}`);
