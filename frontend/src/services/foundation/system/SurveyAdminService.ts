import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import {
  Survey as SurveyInfo,
  SurveyRespondent,
  SurveyQuestion,
  SurveyAnswer,
} from '@/types/business/survey';
import type { components } from '@/types/generated-api';

/**
 * 설문 템플릿 — 백엔드 `SurveyTemplateDto` 의 생성 타입을 SSOT 로 삼는다.
 *
 * ⚠ 종전에는 `Survey as SurveyTemplate` 별칭이었다. 그러나 템플릿의 실제 필드는
 * `srvyTmpltSn`·`srvyTmpltTypeCd`·`srvyTmpltPathNm`·`srvyTmpltExpln` 로 설문(`Survey`)과
 * **전혀 겹치지 않는다**. 로그 도메인에서 수제 타입이 어긋나 화면이 빈 값을 그리던 것과 같은
 * 결함이며, 템플릿 화면이 없어서 드러나지 않고 있었을 뿐이다.
 */
export type SurveyTemplate = components['schemas']['SurveyTemplateDto'];

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
  async getSurvey(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyInfo> {
    return this.get<SurveyInfo>(`/${srvySn}`, config);
  }

  /** 설문 등록 */
  async createSurvey(data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<SurveyInfo> {
    return this.post<SurveyInfo>('', data, config);
  }

  /** 설문 수정 */
  async updateSurvey(srvySn: number, data: Partial<SurveyInfo>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${srvySn}`, data, config);
  }

  /** 설문 삭제 */
  async deleteSurvey(srvySn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${srvySn}`, config);
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
    srvySn: number,
    params?: SearchParams,
    config?: AxiosRequestConfig
  ): Promise<PageResponse<SurveyRespondent>> {
    return this.get<PageResponse<SurveyRespondent>>(`/${srvySn}/respondents`, {
      ...config,
      params: {
        ...params,
        keyword: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 설문 응답자 삭제 */
  async deleteRespondent(srvySn: number, respondentId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${srvySn}/respondents/${respondentId}`, config);
  }

  // --- 템플릿 CRUD ---

  async createTemplate(data: Partial<SurveyTemplate>, config?: AxiosRequestConfig): Promise<void> {
    return this.post('/templates', data, config);
  }

  async updateTemplate(srvyTmpltSn: number, data: Partial<SurveyTemplate>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/templates/${srvyTmpltSn}`, data, config);
  }

  async deleteTemplate(srvyTmpltSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/templates/${srvyTmpltSn}`, config);
  }

  // --- 문항·항목 CRUD ---

  /**
   * 설문의 문항 목록. **항목까지 중첩해서 온다** — 백엔드가 단일 IN 조회로 묶어 주므로
   * 문항별 항목 조회를 따로 호출하면 안 된다(N+1 을 프론트에서 되살리는 셈이다).
   */
  async getQuestions(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyQuestion[]> {
    return this.get<SurveyQuestion[]>(`/${srvySn}/questions`, config);
  }

  async createQuestion(srvySn: number, data: Partial<SurveyQuestion>, config?: AxiosRequestConfig): Promise<void> {
    return this.post(`/${srvySn}/questions`, data, config);
  }

  async updateQuestion(
    srvySn: number,
    srvyQstnSn: number,
    data: Partial<SurveyQuestion>,
    config?: AxiosRequestConfig
  ): Promise<void> {
    return this.put(`/${srvySn}/questions/${srvyQstnSn}`, data, config);
  }

  async deleteQuestion(srvySn: number, srvyQstnSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${srvySn}/questions/${srvyQstnSn}`, config);
  }

  /** 항목은 문항 하위 자원이다 — 경로가 소속 문항을 강제한다. */
  async createItem(srvyQstnSn: number, data: Partial<SurveyAnswer>, config?: AxiosRequestConfig): Promise<void> {
    return this.post(`/questions/${srvyQstnSn}/items`, data, config);
  }

  async updateItem(srvyArtclSn: number, data: Partial<SurveyAnswer>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/questions/items/${srvyArtclSn}`, data, config);
  }

  async deleteItem(srvyArtclSn: number, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/questions/items/${srvyArtclSn}`, config);
  }
}

export const surveyAdminService = new SurveyAdminService();
