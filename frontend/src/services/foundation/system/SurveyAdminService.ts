import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import { Survey as SurveyInfo, Survey as SurveyTemplate, SurveyRespondent } from '@/types/business/survey';

/**
 * 설문 관리 서비스 (Admin)
 */
class SurveyAdminService extends AdminService {
  constructor() {
    super('/surveys');
  }

  /** 설문 목록 조회 */
  async getSurveyList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SurveyInfo>> {
    return this.get<PageResponse<SurveyInfo>>('', {
      ...config,
      params: {
        ...params,
        keyword: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 설문 상세 조회 */
  async getSurvey(qestnrId: string, config?: AxiosRequestConfig): Promise<SurveyInfo> {
    return this.get<SurveyInfo>(`/${qestnrId}`, config);
  }

  /** 설문 등록 */
  async createSurvey(data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<SurveyInfo> {
    return this.post<SurveyInfo>('', data, config);
  }

  /** 설문 수정 */
  async updateSurvey(qestnrId: string, data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${qestnrId}`, data, config);
  }

  /** 설문 삭제 */
  async deleteSurvey(qestnrId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${qestnrId}`, config);
  }

  /** 설문 템플릿목록 조회 */
  async getTemplateList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SurveyTemplate>> {
    return this.get<PageResponse<SurveyTemplate>>('/templates', {
      ...config,
      params: {
        ...params,
        keyword: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /**
   * 설문별 응답자 목록 (관리자 전용).
   *
   * <p>응답자는 반드시 설문 하위로 조회한다 — 경로가 조회 범위를 강제한다.
   * 백엔드가 `@AdminOnly` 이므로 ADMIN 이 아니면 403 이다.
   */
  async getRespondents(
    srvyId: string,
    params?: SearchParams,
    config?: AxiosRequestConfig
  ): Promise<PageResponse<SurveyRespondent>> {
    return this.get<PageResponse<SurveyRespondent>>(`/${srvyId}/respondents`, {
      ...config,
      params: {
        ...params,
        keyword: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 설문 응답자 삭제 */
  async deleteRespondent(srvyId: string, respondentId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${srvyId}/respondents/${respondentId}`, config);
  }
}

export const surveyAdminService = new SurveyAdminService();
