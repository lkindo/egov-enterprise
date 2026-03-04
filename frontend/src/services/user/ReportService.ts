import { ApiService } from '@/services/core/ApiService';

export interface WorkReport {
    reprtId: string;
    reprtSj: string;
    reprtSe: string; // 1:주간, 2:월간
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

class ReportService extends ApiService {
    constructor() {
        super('/reports');
    }

    async getReports(params: { page?: number; size?: number; searchWrd?: string }) {
        return this.get<any>('', { params });
    }

    async getReport(id: string) {
        return this.get<any>(`/${id}`);
    }

    async createReport(data: Partial<WorkReport>) {
        return this.post<any>('', data);
    }

    async confirmReport(id: string, confmAt: 'Y' | 'N') {
        return this.put<any>(`/${id}/confirm`, { confmAt });
    }
}

export const reportService = new ReportService();
