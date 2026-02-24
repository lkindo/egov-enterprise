import client from '@/lib/api/client';

export interface Community {
  cmmntyId: string;
  cmmntyNm: string;
  cmmntyIntrcn: string;
  useAt: 'Y' | 'N';
  registSeCode: string;
  frstRegisterId: string;
  createdDate: string;
}

export const communityService = {
  getCommunities: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/communities', { params });
    return response;
  },

  createCommunity: async (data: Partial<Community>) => {
    const response = await client.post('/admin/communities', data);
    return response;
  },

  deleteCommunity: async (id: string) => {
    const response = await client.delete(`/admin/communities/${id}`);
    return response;
  }
};

