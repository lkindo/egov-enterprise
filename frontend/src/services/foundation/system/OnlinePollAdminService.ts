import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 온라인설문(OnlinePoll) 정보 DTO 인터페이스
 */
export interface OnlinePollDto {
  pollId?: string;
  pollNm: string;
  pollBgngYmd: string;
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
  pollArtclId?: string;
  pollArtclNm: string;
  pollIemCo?: number;
}

class OnlinePollAdminService extends AdminService {
  constructor() {
    super('/polls');
  }

  /** ⑤씪님Poll 목록 페이지조회 */
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
