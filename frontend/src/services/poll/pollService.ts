import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { OnlinePollManageVO, OnlinePollItemVO, OnlinePollPartcptnVO, PollSearchParams } from '@/types/business/poll';
import { AxiosRequestConfig } from 'axios';

/**
 * 온라인 설문(Poll) 서비스
 * 백엔드 PollApiController 연동 (/api/v1/polls)
 */
class PollService extends ApiService {
  constructor() {
    super('polls');
  }

  /** 설문 목록 조회 */
  async getPollList(params: PollSearchParams, config?: AxiosRequestConfig): Promise<PageResponse<OnlinePollManageVO>> {
    return this.get<PageResponse<OnlinePollManageVO>>('', { 
      ...config, 
      params: {
        ...params,
        searchWrd: params.searchKeyword 
      }
    });
  }

  /** 설문 상세 조회 */
  async getPollDetail(pollId: string, config?: AxiosRequestConfig): Promise<OnlinePollManageVO> {
    return this.get<OnlinePollManageVO>(`/${pollId}`, config);
  }

  /** 설문 등록 */
  async createPoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.post('', poll, config);
  }

  /** 설문 수정 */
  async updatePoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
    if (!poll.pollId) throw new Error('pollId is required for update');
    return this.put(`/${poll.pollId}`, poll, config);
  }

  /** 설문 삭제 */
  async deletePoll(pollId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${pollId}`, config);
  }

  /** 설문 항목 목록 조회 */
  async getPollItemList(pollId: string, config?: AxiosRequestConfig): Promise<OnlinePollItemVO[]> {
    return this.get<OnlinePollItemVO[]>(`/${pollId}/items`, config);
  }

  /** 설문 참여(투표) */
  async participatePoll(participation: OnlinePollPartcptnVO, config?: AxiosRequestConfig): Promise<void> {
    return this.post(`/${participation.pollId}/vote/${participation.pollIemId}`, null, config);
  }
}

export const pollService = new PollService();

// Backward compatibility exports
export const getPollList = pollService.getPollList.bind(pollService);
export const getPollDetail = pollService.getPollDetail.bind(pollService);
export const createPoll = pollService.createPoll.bind(pollService);
export const updatePoll = pollService.updatePoll.bind(pollService);
export const deletePoll = pollService.deletePoll.bind(pollService);
export const getPollItemList = pollService.getPollItemList.bind(pollService);
export const participatePoll = pollService.participatePoll.bind(pollService);

export default pollService;
