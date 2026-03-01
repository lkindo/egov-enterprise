import { ApiService } from '@/services/core/ApiService';
import { Survey, SurveyQuestion, SurveyResultStats } from '@/types/survey';

class SurveyAdminService extends ApiService {
    constructor() {
        super('/surveys');
    }

    /**
     * 설문 목록 조회
     */
    async getSurveys(params: { page?: number; size?: number; searchWrd?: string }, config?: any) {
        return this.get<any>('', { ...config, params });
    }

    /**
     * 설문 상세 정보 조회
     */
    async getSurvey(id: string, config?: any) {
        return this.get<any>(`/${id}`, config);
    }

    /**
     * 설문 질문 목록 조회
     */
    async getQuestions(surveyId: string, config?: any) {
        return this.get<any>(`/${surveyId}/questions`, config);
    }

    /**
     * 설문 응답 제출
     */
    async submitAnswers(surveyId: string, answers: any, config?: any) {
        return this.post<any>(`/${surveyId}/respond`, answers, config);
    }

    /**
     * 설문 결과 통계 조회
     */
    async getStats(surveyId: string, config?: any) {
        return this.get<any>(`/${surveyId}/stats`, config);
    }
}

export const surveyAdminService = new SurveyAdminService();
