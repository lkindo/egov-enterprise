import client from '@/lib/api/client';

export interface Reward {
  rwdId: string;
  rwdNm: string;
  rwdDe: string;
  rwdKnd: string; // 1:표창, 2:포상금, 3:휴가
  rwdKndNm?: string;
  usid: string;
  trgetNm?: string;
  remark?: string;
  confmAt: 'Y' | 'N';
}

export const rewardService = {
  getRewards: async (params: { page?: number; size?: number; usid?: string }) => {
    const response = await client.get('/admin/system/rewards', { params });
    return response.data;
  },

  createReward: async (data: Partial<Reward>) => {
    const response = await client.post('/admin/system/rewards', data);
    return response.data;
  },

  updateReward: async (id: string, data: Partial<Reward>) => {
    const response = await client.put(`/admin/system/rewards/${id}`, data);
    return response.data;
  },

  deleteReward: async (id: string) => {
    const response = await client.delete(`/admin/system/rewards/${id}`);
    return response.data;
  }
};
