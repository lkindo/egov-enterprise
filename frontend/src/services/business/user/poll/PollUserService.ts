import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { OnlinePollManageVO, OnlinePollManageDetailVO, OnlinePollItemVO, OnlinePollPartcptnVO, PollSearchParams } from '@/types/business/poll';
import { AxiosRequestConfig } from 'axios';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  createPollOperation,
  deletePollOperation,
  getPollItemsOperation,
  getPollOperation,
  getPollsOperation,
  updatePollOperation,
  voteOperation,
} from '@/types/generated-operations';

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
    return this.executeGenerated(getPollsOperation, {
      query: {
        ...(params.page !== undefined ? { page: params.page } : {}),
        ...(params.size !== undefined ? { size: params.size } : {}),
        keyword: params.searchKeyword || '',
      },
      config,
    }) as Promise<PageResponse<OnlinePollManageDetailVO>>;
  }

  /** 설문 상세 조회 */
  async getPollDetail(pollSn: number, config?: AxiosRequestConfig): Promise<OnlinePollManageDetailVO> {
    return this.executeGenerated(getPollOperation, {
      path: { pollSn },
      config,
    }) as Promise<OnlinePollManageDetailVO>;
  }

  /** 설문 등록 */
  async createPoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(createPollOperation, {
      body: poll as GeneratedOperationRequest<'createPoll'>,
      config,
    });
  }

  /** 설문 수정 */
  async updatePoll(poll: Partial<OnlinePollManageVO>, config?: AxiosRequestConfig): Promise<void> {
    if (!poll.pollSn) throw new Error('pollSn is required for update');
    return this.executeGenerated(updatePollOperation, {
      path: { pollSn: poll.pollSn },
      body: poll as GeneratedOperationRequest<'updatePoll'>,
      config,
    });
  }

  /** 설문 삭제 */
  async deletePoll(pollSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deletePollOperation, {
      path: { pollSn },
      config,
    });
  }

  /** 설문 항목 목록 조회 */
  async getPollItemList(pollSn: number, config?: AxiosRequestConfig): Promise<OnlinePollItemVO[]> {
    return this.executeGenerated(getPollItemsOperation, {
      path: { pollSn },
      config,
    }) as Promise<OnlinePollItemVO[]>;
  }

  /** 설문 참여(투표) */
  async participatePoll(participation: OnlinePollPartcptnVO, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(voteOperation, {
      path: {
        pollSn: participation.pollSn,
        pollArtclSn: participation.pollArtclSn,
      },
      config,
    });
  }
}

export const pollUserService = new PollUserService();

// Individual method exports for convenience
export const getPollList = pollUserService.getPollList.bind(pollUserService);
export const createPoll = pollUserService.createPoll.bind(pollUserService);
