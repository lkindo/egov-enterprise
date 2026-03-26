import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Survey as SurveyInfo, Survey as SurveyTemplate } from '@/types/business/survey';

/**
 * 설문 관리 서비스 (Admin)
 */
class SurveyAdminService extends AdminService {
 constructor() {
 super('/surveys');
 }

 /** 설문 목록 조회 */
 async getSurveyList(params?: SearchParams, config?: any): Promise<PageResponse<SurveyInfo>> {
 return this.get<PageResponse<SurveyInfo>>('', { ...config, params });
 }

 /** 설문 상세 조회 */
 async getSurvey(qestnrId: string, config?: any): Promise<SurveyInfo> {
 return this.get<SurveyInfo>(`/${qestnrId}`, config);
 }

 /** 설문 등록 */
 async createSurvey(data: Partial<SurveyInfo>, config?: any): Promise<SurveyInfo> {
 return this.post<SurveyInfo>('', data, config);
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
 async getTemplateList(params?: SearchParams, config?: any): Promise<PageResponse<SurveyTemplate>> {
 return this.get<PageResponse<SurveyTemplate>>('/templates', { ...config, params });
 }
}

export const surveyAdminService = new SurveyAdminService();
