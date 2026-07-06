import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

interface WorkReport {
  rptId?: string;
  rptTtl?: string;
  rptCn?: string;
  rptSeCd?: string; // 1: 주간, 2: 월간
  rptYmd?: string;
  userId?: string;
  wrterNm?: string;
  atchFileId?: string;
  rptSttsCd?: string; // R: 대기, Y: 승인, N: 반려
}

/**
 * 보고 관리 서비스 (User)
 */
class ReportService extends ApiService {
  constructor() {
    super('/work-reports');
  }

  /**
   * 보고 목록 조회
   */
  async getReports(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<WorkReport>> {
    return this.get<PageResponse<WorkReport>>('', { ...config, params });
  }

  /**
   * 보고 상세 조회
   */
  async getReport(rptId: string, config?: AxiosRequestConfig): Promise<WorkReport> {
    return this.get<WorkReport>(`/${rptId}`, config);
  }

  /**
   * 보고 등록
   */
  async createReport(data: Partial<WorkReport>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /**
   * 보고 승인/반려
   */
  async confirmReport(rptId: string, confmAt: 'Y' | 'N', config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${rptId}/confirm`, { confmAt }, config);
  }
}

export const reportService = new ReportService();
