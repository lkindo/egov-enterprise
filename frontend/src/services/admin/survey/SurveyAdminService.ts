import { ApiService } from '@/services/core/ApiService';
import { Survey, SurveyQuestion, SurveyResultStats } from '@/types/survey';
import { PageResponse } from '@/types/system';

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
 async getSurveys(params: { page?: number; size?: number; searchWrd?: string }, config?: any): Promise<PageResponse<Survey>> {
 return this.get<PageResponse<Survey>>('', { ...config, params });
 }

 /**
 * 설문 상세 정보 조회
 */
 async getSurvey(id: string, config?: any): Promise<Survey> {
 return this.get<Survey>(`/${id}`, config);
 }

 /**
 * 설문 문항 목록 조회
 */
 async getQuestions(surveyId: string, config?: any): Promise<SurveyQuestion[]> {
 return this.get<SurveyQuestion[]>(`/${surveyId}/questions`, config);
 }

 /**
 * 설문 응답 제출
 */
 async submitAnswers(surveyId: string, answers: any, config?: any): Promise<void> {
 return this.post<void>(`/${surveyId}/respond`, answers, config);
 }

 /**
 * 설문 결과 통계 조회
 */
 async getStats(surveyId: string, config?: any): Promise<SurveyResultStats> {
 return this.get<SurveyResultStats>(`/${surveyId}/stats`, config);
 }
}

export const surveyAdminService = new SurveyAdminService();
