import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  getPoll_1Operation,
  getPolls_1Operation,
  insertPollOperation,
  vote_1Operation,
} from '@/types/generated-operations';

/**
 * 온라인설문(OnlinePoll) 정보 DTO 인터페이스
 */
export interface OnlinePollDto {
  pollSn?: number;
  pollNm: string;
  /** 저장 포맷 'yyyyMMdd' (varchar(8) / @Size(max = 8)) — 10자 전송은 400 */
  pollBgngYmd: string;
  /** 저장 포맷 'yyyyMMdd' */
  pollEndYmd: string;
  pollKndCd: string;
  pollDsuseYn: string;
  pollAtmcDsuseYn?: string;
  pollArticles?: OnlinePollItemDto[];
  frstRgtrId?: string;
  crtDt?: string;
}

/**
 * 온라인설문 항목(OnlinePollItem) DTO 인터페이스
 */
interface OnlinePollItemDto {
  pollArtclSn?: number;
  pollArtclNm: string;
  pollIemCo?: number;
}

class OnlinePollAdminService extends AdminService {
  constructor() {
    super('/polls');
  }

  /** ⑤씪님Poll 목록 페이지조회 */
  async getPollList(params?: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    const generatedConfig = config ? { ...config } : undefined;
    if (generatedConfig) delete generatedConfig.params;
    return this.executeGenerated(getPolls_1Operation, {
      query: params ?? {},
      config: generatedConfig,
    }) as Promise<PageResponse<OnlinePollDto>>;
  }

  /** ⑤씪님Poll 상세 조회 */
  async getPoll(pollSn: number, config?: AxiosRequestConfig) {
    return this.executeGenerated(getPoll_1Operation, {
      path: { pollSn },
      config,
    }) as Promise<OnlinePollDto>;
  }

  /** ⑤씪님Poll 등록 */
  async createPoll(pollDto: OnlinePollDto, config?: AxiosRequestConfig) {
    return this.executeGenerated(insertPollOperation, {
      body: pollDto as GeneratedOperationRequest<'insertPoll'>,
      config,
    });
  }

  /** ы몴 泥섎━ */
  async vote(pollSn: number, pollArtclSn: number, config?: AxiosRequestConfig) {
    const generatedConfig = config ? { ...config } : undefined;
    if (generatedConfig) delete generatedConfig.params;
    return this.executeGenerated(vote_1Operation, {
      path: { pollSn },
      query: { pollArtclSn },
      config: generatedConfig,
    });
  }
}

export const onlinePollAdminService = new OnlinePollAdminService();
