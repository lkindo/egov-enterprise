import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * 통계 愿由님쒕퉬님(Admin)
 */
export interface StatsDto {
  statsDate: string;
  statsCo: number;
  creatCo: number;
  inqireCo: number;
  updtCo: number;
  deleteCo: number;
  errorCo: number;
  [key: string]: unknown;
}

class StatsAdminService extends AdminService {
  constructor() {
    super('/statistics');
  }

  /** ?붿빟 통계 조회 */
  async getSummary(config?: AxiosRequestConfig) {
    return this.get<Record<string, unknown>>('/summary', config);
  }

  /** 접속 통계 조회 */
  async getConnectStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/connect', { ...config, params });
  }

  /** 寃뚯떆님통계 조회 */
  async getBbsStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/bbs', { ...config, params });
  }

  /** ?ъ슜님통계 조회 */
  async getUserStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/user', { ...config, params });
  }

  /** 요청(?붾㈃) 통계 조회 */
  async getScreenStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/screen', { ...config, params });
  }

  /** 蹂닿퀬님통계 조회 */
  async getReportStats(params?: { fromDate?: string; toDate?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/report', { ...config, params });
  }

  /** ?먮즺?댁슜현황 통계 조회 */
  async getDataUsageStats(params?: { fromDate?: string; toDate?: string }, config?: AxiosRequestConfig) {
    return this.get<StatsDto[]>('/data-usage', { ...config, params });
  }

  /** 硫붾돱 통계 조회 */
  async getMenuStats(config?: AxiosRequestConfig) {
    return this.get<Record<string, unknown>[]>('/menu', config);
  }
}

export const statsAdminService = new StatsAdminService();
