import { AxiosRequestConfig } from 'axios';
import { ApiService } from '@/services/core/ApiService';
import { Survey, SurveyQuestion, SurveyResultStats } from '@/types/business/survey';
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
   * 설문 답변 제출
   */
  async submitAnswers(srvySn: number, answers: Record<string, unknown>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>(`/${srvySn}/respond`, answers, config);
  }

  /**
   * 설문 결과 통계 조회
   */
  async getStats(srvySn: number, config?: AxiosRequestConfig): Promise<SurveyResultStats> {
    return this.get<SurveyResultStats>(`/${srvySn}/stats`, config);
  }
}

export const surveyAdminService = new SurveyAdminService();
