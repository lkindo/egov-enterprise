import { ApiService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface LeaderSchedule {
  scheduleId: string;
  leaderId: string;
  leaderNm?: string;
  scheduleSe: string;
  scheduleNm: string;
  scheduleDc?: string;
  schdulBgnde: string;
  schdulEndde: string;
  reptitSeCode?: string;
}

export interface LeaderStatus {
  leaderId: string;
  leaderNm: string;
  orgnztNm?: string;
  positionNm?: string;
  status: string;
}

class LeaderScheduleAdminService extends ApiService {
  constructor() {
    super('leader-schedules'); // /api/v1/leader-schedules
  }

  /** 일정 목록 조회 */
  async getLeaderScheduleList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LeaderSchedule>> {
    return this.get<PageResponse<LeaderSchedule>>('', { ...config, params });
  }

  /** 일정 상세 조회 */
  async getLeaderSchedule(id: string, config?: AxiosRequestConfig): Promise<LeaderSchedule> {
    return this.get<LeaderSchedule>(`/${id}`, config);
  }

  /** 일정 등록 */
  async createLeaderSchedule(data: Partial<LeaderSchedule>, config?: AxiosRequestConfig): Promise<string> {
    return this.post<string>('', data, config);
  }

  /** 일정 수정 */
  async updateLeaderSchedule(id: string, data: Partial<LeaderSchedule>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${id}`, data, config);
  }

  /** 일정 삭제 */
  async deleteLeaderSchedule(id: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${id}`, config);
  }

  /** 간부 상태 목록 조회 */
  async getLeaderStatusList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LeaderStatus>> {
    return this.get<PageResponse<LeaderStatus>>('/status', { ...config, params });
  }
}

export const leaderScheduleAdminService = new LeaderScheduleAdminService();
