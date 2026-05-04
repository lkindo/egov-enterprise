import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { OnlinePollManageVO as OnlinePoll } from '@/types/business/poll';

/**
 * ⑤씪님설문(Poll) 관리님쒕퉬님(Admin)
 */
class PollAdminService extends AdminService {
  constructor() {
    super('/polls');
  }

  /** 설문 목록 조회 */
  async getPollList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<OnlinePoll>> {
    return this.get<PageResponse<OnlinePoll>>('', { ...config, params });
  }

  /** 설문 상세 조회 */
  async getPoll(pollId: string, config?: AxiosRequestConfig): Promise<OnlinePoll> {
    return this.get<OnlinePoll>(`/${pollId}`, config);
  }

  /** 설문 등록 */
  async createPoll(data: Partial<OnlinePoll>, config?: AxiosRequestConfig): Promise<OnlinePoll> {
    return this.post<OnlinePoll>('', data, config);
  }

  /** 설문 수정 */
  async updatePoll(pollId: string, data: Partial<OnlinePoll>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${pollId}`, data, config);
  }

  /** 설문 님젣 */
  async deletePoll(pollId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${pollId}`, config);
  }
}

export const pollAdminService = new PollAdminService();
