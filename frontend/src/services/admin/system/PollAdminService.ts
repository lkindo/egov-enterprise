import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/system';
import { OnlinePollManageVO as OnlinePoll } from '@/types/poll';

/**
 * 온라인 설문(Poll) 관리 서비스 (Admin)
 */
class PollAdminService extends AdminService {
    constructor() {
        super('/polls');
    }

    /** 설문 목록 조회 */
    async getPollList(params?: SearchParams, config?: any): Promise<PaginationResponse<OnlinePoll>> {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 설문 상세 조회 */
    async getPoll(pollId: string, config?: any): Promise<OnlinePoll> {
        const response = await this.get<any>(`/${pollId}`, config);
        return response?.result || response;
    }

    /** 설문 등록 */
    async createPoll(data: Partial<OnlinePoll>, config?: any): Promise<OnlinePoll> {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 설문 수정 */
    async updatePoll(pollId: string, data: Partial<OnlinePoll>, config?: any): Promise<void> {
        return this.put(`/${pollId}`, data, config);
    }

    /** 설문 삭제 */
    async deletePoll(pollId: string, config?: any): Promise<void> {
        return this.delete(`/${pollId}`, config);
    }
}

export const pollAdminService = new PollAdminService();
