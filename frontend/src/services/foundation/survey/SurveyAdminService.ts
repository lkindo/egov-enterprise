import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { Survey, SurveyQuestion, SurveyResponseSubmit, SurveyResultStats } from '@/types/business/survey';
import { PageResponse } from '@/types/foundation/system';

/**
 * 설문 관리 서비스 (Admin)
 */
class SurveyAdminService extends ApiService {
  constructor() {
    super('/surveys');
  }

  /**
   * 설문 목록 조회
   */
  async getSurveys(params: { page?: number; size?: number; keyword?: string }, config?: AxiosRequestConfig): Promise<PageResponse<Survey>> {
    return this.get<PageResponse<Survey>>('', { ...config, params });
  }

  /**
   * 설문 상세 정보 조회
   */
  async getSurvey(srvySn: number, config?: AxiosRequestConfig): Promise<Survey> {
    return this.get<Survey>(`/${srvySn}`, config);
  }

  /**
   * 설문 문항 목록 조회
   */
  async getQuestions(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyQuestion[]> {
    return this.get<SurveyQuestion[]>(`/${srvySn}/questions`, config);
  }

  /**
   * 설문 답변 제출.
   *
   * <p>[2026-08-28] 경로 교정 — 종전 `/respond` 는 서버에 존재하지 않는다.
   * 실제 엔드포인트는 SurveySubmissionApiController 의 `POST /api/v1/surveys/{srvySn}/responses` 다.
   * 호출부가 0건이라 아무도 404 를 보지 못했고, 그래서 이 죽은 경로가 남아 있었다.
   *
   * <p>답변 1건이 응답 행 1개가 된다. 같은 사용자의 재제출은 서버가 거부한다.
   * 서버는 문항·항목이 이 설문 소속인지도 검증하므로 클라이언트가 보증할 필요는 없다.
   */
  async submitAnswers(
    srvySn: number,
    payload: SurveyResponseSubmit,
    config?: AxiosRequestConfig,
  ): Promise<number> {
    return this.post<number>(`/${srvySn}/responses`, payload, config);
  }

  /**
   * 설문 결과 통계 조회
   */
  async getStats(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyResultStats> {
    return this.get<SurveyResultStats>(`/${srvySn}/stats`, config);
  }
}

export const surveyAdminService = new SurveyAdminService();
