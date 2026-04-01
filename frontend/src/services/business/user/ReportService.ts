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
 * 蹂닿퀬님愿由님쒕퉬님(User)
 */
class ReportService extends ApiService {
 constructor() {
 super('/reports');
 }

 /**
 * 蹂닿퀬님紐⑸줉 조회
 */
 async getReports(params: { page?: number; size?: number; searchWrd?: string }, config?: AxiosRequestConfig): Promise<PageResponse<WorkReport>> {
 return this.get<PageResponse<WorkReport>>('', { ...config, params });
 }

 /**
 * 蹂닿퀬님?곸꽭 조회
 */
 async getReport(id: string, config?: AxiosRequestConfig): Promise<WorkReport> {
 return this.get<WorkReport>(`/${id}`, config);
 }

 /**
 * 蹂닿퀬님등록
 */
 async createReport(data: Partial<WorkReport>, config?: AxiosRequestConfig): Promise<void> {
 return this.post<void>('', data, config);
 }

 /**
 * 蹂닿퀬님?뱀씤/諛섎젮
 */
 async confirmReport(id: string, confmAt: 'Y' | 'N', config?: AxiosRequestConfig): Promise<void> {
 return this.put<void>(`/${id}/confirm`, { confmAt }, config);
 }
}

export const reportService = new ReportService();
