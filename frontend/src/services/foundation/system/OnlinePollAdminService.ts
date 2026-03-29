import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 온라인 Poll 정보 인터페이스
 */
export interface OnlinePollDto {
  pollId?: string;
  pollNm: string;
  pollBeginDe: string;
  pollEndDe: string;
  pollKindCode: string;
  pollDsuseYn: string;
  pollAutoDsuseYn?: string;
  pollItems?: OnlinePollItemDto[];
  frstRegisterId?: string;
  frstRegistPnttm?: string;
}

/**
 * 온라인 Poll 항목 인터페이스
 */
export interface OnlinePollItemDto {
  pollIemId?: string;
  pollIemNm: string;
  pollIemCo?: number;
}

class OnlinePollAdminService extends AdminService {
  constructor() {
    super('/polls');
  }

  /** 온라인 Poll 목록 페이징 조회 */
  async getPollList(params?: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<OnlinePollDto>>('', { ...config, params });
  }

  /** 온라인 Poll 상세 조회 */
  async getPoll(pollId: string, config?: AxiosRequestConfig) {
    return this.get<OnlinePollDto>(`/${pollId}`, config);
  }

  /** 온라인 Poll 등록 */
  async createPoll(pollDto: OnlinePollDto, config?: AxiosRequestConfig) {
    return this.post<void>('', pollDto, config);
  }

  /** 투표 처리 */
  async vote(pollId: string, pollIemId: string, config?: AxiosRequestConfig) {
    return this.post<void>(`/${pollId}/vote`, null, { ...config, params: { pollIemId } });
  }
}

export const onlinePollAdminService = new OnlinePollAdminService();
