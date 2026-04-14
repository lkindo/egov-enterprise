import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * ⑤씪님Poll ?뺣낫 ?명꽣?섏씠님 */
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
  createdDate?: string;
}

/**
 * ⑤씪님Poll 님ぉ ?명꽣?섏씠님 */
export interface OnlinePollItemDto {
  pollIemId?: string;
  pollIemNm: string;
  pollIemCo?: number;
}

class OnlinePollAdminService extends AdminService {
  constructor() {
    super('/polls');
  }

  /** ⑤씪님Poll 紐⑸줉 ?섏씠吏조회 */
  async getPollList(params?: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<OnlinePollDto>>('', { ...config, params });
  }

  /** ⑤씪님Poll 상세 조회 */
  async getPoll(pollId: string, config?: AxiosRequestConfig) {
    return this.get<OnlinePollDto>(`/${pollId}`, config);
  }

  /** ⑤씪님Poll 등록 */
  async createPoll(pollDto: OnlinePollDto, config?: AxiosRequestConfig) {
    return this.post<void>('', pollDto, config);
  }

  /** ы몴 泥섎━ */
  async vote(pollId: string, pollIemId: string, config?: AxiosRequestConfig) {
    return this.post<void>(`/${pollId}/vote`, null, { ...config, params: { pollIemId } });
  }
}

export const onlinePollAdminService = new OnlinePollAdminService();
