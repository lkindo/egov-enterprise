import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { OnlinePollManageVO, OnlinePollManageDetailVO, OnlinePollItemVO, OnlinePollPartcptnVO, PollSearchParams } from '@/types/business/poll';
import { AxiosRequestConfig } from 'axios';

/**
 * 온라인 설문(Poll) 서비스
 * 백엔드 PollApiController 연동 (/api/v1/polls)
 */
export class PollUserService extends ApiService {
  constructor() {
    super('polls');
  }

  /** 설문 목록 조회 */
  async getPollList(params: PollSearchParams, config?: AxiosRequestConfig): Promise<PageResponse<OnlinePollManageDetailVO>> {
    return this.get<PageResponse<OnlinePollManageDetailVO>>('', { 
      ...config, 
      params: {
        ...params,
        keyword: params.searchKeyword || '' 
      }
    });
  }

  /** 설문 상세 조회 */
  async getPollDetail(pollSn: number, config?: AxiosRequestConfig): Promise<OnlinePollManageDetailVO> {
    return this.get<OnlinePollManageDetailVO>(`/${pollSn}`, config);
  }

  /** 설문 등록 */
  async createPoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.post('', poll, config);
  }

  /** 설문 수정 */
  async updatePoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
    if (!poll.pollSn) throw new Error('pollSn is required for update');
    return this.put(`/${poll.pollSn}`, poll, config);
  }

  /** 설문 삭제 */
  async deletePoll(pollSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${pollSn}`, config);
  }

  /** 설문 항목 목록 조회 */
  async getPollItemList(pollSn: number, config?: AxiosRequestConfig): Promise<OnlinePollItemVO[]> {
    return this.get<OnlinePollItemVO[]>(`/${pollSn}/items`, config);
  }

  /** 설문 참여(투표) */
  async participatePoll(participation: OnlinePollPartcptnVO, config?: AxiosRequestConfig): Promise<void> {
    return this.post(`/${participation.pollSn}/vote/${participation.pollArtclSn}`, null, config);
  }
}

export const pollUserService = new PollUserService();

// Individual method exports for convenience
export const getPollList = pollUserService.getPollList.bind(pollUserService);
export const createPoll = pollUserService.createPoll.bind(pollUserService);
