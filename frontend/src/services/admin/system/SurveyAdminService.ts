import { AdminService } from '@/services/core/ApiService';
import { PaginationResponse, SearchParams } from '@/types/system';
import { SurveyInfo, SurveyTemplate } from '@/types/survey';

/**
 * 설문 관리 서비스 (Admin)
 */
class SurveyAdminService extends AdminService {
    constructor() {
        super('/surveys');
    }

    /** 설문 목록 조회 */
    async getSurveyList(params?: SearchParams, config?: any): Promise<PaginationResponse<SurveyInfo>> {
        const response = await this.get<any>('', { ...config, params });
        return response?.result || response;
    }

    /** 설문 상세 조회 */
    async getSurvey(qestnrId: string, config?: any): Promise<SurveyInfo> {
        const response = await this.get<any>(`/${qestnrId}`, config);
        return response?.result || response;
    }

    /** 설문 등록 */
    async createSurvey(data: Partial<SurveyInfo>, config?: any): Promise<SurveyInfo> {
        const response = await this.post<any>('', data, config);
        return response?.result || response;
    }

    /** 설문 수정 */
    async updateSurvey(qestnrId: string, data: Partial<SurveyInfo>, config?: any): Promise<void> {
        return this.put(`/${qestnrId}`, data, config);
    }

    /** 설문 삭제 */
    async deleteSurvey(qestnrId: string, config?: any): Promise<void> {
        return this.delete(`/${qestnrId}`, config);
    }

    /** 설문 템플릿 목록 조회 */
    async getTemplateList(params?: SearchParams, config?: any): Promise<PaginationResponse<SurveyTemplate>> {
        const response = await this.get<any>('/templates', { ...config, params });
        return response?.result || response;
    }
}

export const surveyAdminService = new SurveyAdminService();
