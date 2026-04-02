import { ApiService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';

export interface WorkReport {
 reprtId: string;
 reprtSj: string;
 reprtSe: string; // 1: 二쇨컙, 2: ?붽컙
 reprtDe: string;
 wrterId: string;
 wrterNm?: string;
 reportrId: string;
 reportrNm?: string;
 reprtThswikCn: string;
 reprtLesseeCn: string;
 confmDt?: string;
 sttus: 'R' | 'Y' | 'N';
}

/**
 * 보고관리님쒕퉬님(User)
 */
class ReportService extends ApiService {
 constructor() {
 super('/reports');
 }

 /**
 * 보고紐⑸줉 조회
 */
 async getReports(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<WorkReport>> {
 return this.get<PageResponse<WorkReport>>('', { ...config, params });
 }

 /**
 * 보고상세 조회
 */
 async getReport(id: string, config?: AxiosRequestConfig): Promise<WorkReport> {
 return this.get<WorkReport>(`/${id}`, config);
 }

 /**
 * 보고등록
 */
 async createReport(data: Partial<WorkReport>, config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>('', data, config);
 }

 /**
 * 보고?뱀씤/諛섎젮
 */
 async confirmReport(id: string, confmAt: 'Y' | 'N', config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}/confirm`, { confmAt }, config);
 }
}

export const reportService = new ReportService();
