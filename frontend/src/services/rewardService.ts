import client from '@/lib/api/client';

export interface Reward {
  rwdId: string;
  rwdNm: string;
  rwdDe: string;
  rwdKnd: string; // 1:?쒖갹, 2:?ъ긽湲? 3:?닿?
  rwdKndNm?: string;
  usid: string;
  trgetNm?: string;
  remark?: string;
  confmAt: 'Y' | 'N';
}

export const rewardService = {
  getRewards: async (params: { page?: number; size?: number; usid?: string }) => {
    const response = await client.get('/admin/system/rewards', { params });
    return response;
  },

  createReward: async (data: Partial<Reward>) => {
    const response = await client.post('/admin/system/rewards', data);
    return response;
  },

  updateReward: async (id: string, data: Partial<Reward>) => {
    const response = await client.put(`/admin/system/rewards/${id}`, data);
    return response;
  },

  deleteReward: async (id: string) => {
    const response = await client.delete(`/admin/system/rewards/${id}`);
    return response;
  }
};

