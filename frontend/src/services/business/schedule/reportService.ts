import { ApiService, PageResponse } from '@/services/core/ApiService';

export interface WorkReportDto {
    reportId?: string;
    reportSubject: string;
    reportContent: string;
    reportType: string;
    reportDate: string;
    writerId?: string;
    reportStatus: string;
}

/**
 * 주간/월간 보고 서비스
 * legacy path: /smart-toolkit/work-report/
 * modern path: /api/v1/work-reports
 */
class WorkReportService extends ApiService {
    constructor() {
        super('work-reports');
    }

    /**
     * 업무보고 목록 조회
     * @param params 페이징 및 검색 파라미터
     */
    async getWorkReports(params?: any) {
        return this.get<PageResponse<WorkReportDto>>('', params);
    }

    /**
     * 업무보고 상세 조회
     * @param id 보고 ID
     */
    async getWorkReport(id: string) {
        return this.get<WorkReportDto>(`/${id}`);
    }

    /**
     * 업무보고 등록
     * @param report 보고 데이터
     */
    async createWorkReport(report: WorkReportDto) {
        return this.post<void>('', report);
    }

    /**
     * 업무보고 수정
     * @param id 보고 ID
     * @param report 수정 데이터
     */
    async updateWorkReport(id: string, report: WorkReportDto) {
        return this.put<void>(`/${id}`, report);
    }

    /**
     * 업무보고 삭제
     * @param id 보고 ID
     */
    async deleteWorkReport(id: string) {
        return this.delete<void>(`/${id}`);
    }
}

export const workReportService = new WorkReportService();
export default workReportService;
