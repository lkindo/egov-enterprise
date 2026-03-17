import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';
import { CnsltVO as Consult } from '@/types/consult';

/**
 * 상담 관리 서비스 (Admin)
 */
class CnsltAdminService extends AdminService {
    constructor() {
        super('/consultations');
    }

    /** 상담 목록 조회 */
    async getConsultationList(params?: SearchParams, config?: any): Promise<PageResponse<Consult>> {
        return this.get<PageResponse<Consult>>('', { ...config, params });
    }

    /** 상담 상세 조회 */
    async getConsultation(cnsltId: string, config?: any): Promise<Consult> {
        return this.get<Consult>(`/${cnsltId}`, config);
    }

    /** 상담 답변 등록 */
    async answerConsultation(cnsltId: string, data: Partial<Consult>, config?: any): Promise<void> {
        return this.put(`/${cnsltId}/answer`, data, config);
    }

    /** 상담 삭제 */
    async deleteConsultation(cnsltId: string, config?: any): Promise<void> {
        return this.delete(`/${cnsltId}`, config);
    }
}

export const cnsltAdminService = new CnsltAdminService();
