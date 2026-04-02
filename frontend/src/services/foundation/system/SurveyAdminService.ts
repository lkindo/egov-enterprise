import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Survey as SurveyInfo, Survey as SurveyTemplate } from '@/types/business/survey';

/**
 * 설문 관리님쒕퉬님(Admin)
 */
class SurveyAdminService extends AdminService {
  constructor() {
    super('/surveys');
  }

  /** 설문 紐⑸줉 조회 */
  async getSurveyList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SurveyInfo>> {
    return this.get<PageResponse<SurveyInfo>>('', { ...config, params });
  }

  /** 설문 상세 조회 */
  async getSurvey(qestnrId: string, config?: AxiosRequestConfig): Promise<SurveyInfo> {
    return this.get<SurveyInfo>(`/${qestnrId}`, config);
  }

  /** 설문 등록 */
  async createSurvey(data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<SurveyInfo> {
    return this.post<SurveyInfo>('', data, config);
  }

  /** 설문 ?섏젙 */
  async updateSurvey(qestnrId: string, data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${qestnrId}`, data, config);
  }

  /** 설문 님젣 */
  async deleteSurvey(qestnrId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${qestnrId}`, config);
  }

  /** 설문 ?쒗뵆由紐⑸줉 조회 */
  async getTemplateList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SurveyTemplate>> {
    return this.get<PageResponse<SurveyTemplate>>('/templates', { ...config, params });
  }
}

export const surveyAdminService = new SurveyAdminService();
