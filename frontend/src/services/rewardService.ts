import client from '@/lib/api/client';
import { AxiosRequestConfig } from 'axios';

export interface Reward {
    rwdId: string;
    rwdNm: string;
    rwdDe: string;
    rwdKnd: string;
    rwdKndNm?: string;
    usid: string;
    trgetNm?: string;
    remark?: string;
    confmAt: 'Y' | 'N';
}

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

export const rewardService = {
    getRewards: async (params: { page?: number; size?: number; usid?: string }, config?: AxiosRequestConfig): Promise<PageResult<Reward>> =>
        client.get<PageResult<Reward>>('/admin/system/rewards', { ...config, params }),

    createReward: async (data: Partial<Reward>): Promise<void> =>
        client.post('/admin/system/rewards', data),

    updateReward: async (id: string, data: Partial<Reward>): Promise<void> =>
        client.put(`/admin/system/rewards/${id}`, data),

    deleteReward: async (id: string): Promise<void> =>
        client.delete(`/admin/system/rewards/${id}`),
};
