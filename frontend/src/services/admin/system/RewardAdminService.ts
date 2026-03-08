import { AdminService } from '@/services/core/ApiService';
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

class RewardAdminService extends AdminService {
    constructor() {
        super('/rewards');
    }

    async getRewards(params: { page?: number; size?: number; usid?: string }, config?: AxiosRequestConfig): Promise<PageResult<Reward>> {
        return this.get<PageResult<Reward>>('', { ...config, params });
    }

    async createReward(data: Partial<Reward>, config?: AxiosRequestConfig): Promise<void> {
        return this.post('', data, config);
    }

    async updateReward(id: string, data: Partial<Reward>, config?: AxiosRequestConfig): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    async deleteReward(id: string, config?: AxiosRequestConfig): Promise<void> {
        return this.delete(`/${id}`, config);
    }
}

export const rewardAdminService = new RewardAdminService();
