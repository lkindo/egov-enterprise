import { ApiService } from '@/services/core/ApiService';
import { Survey, SurveyQuestion, SurveyResultStats } from '@/types/survey';

class SurveyAdminService extends ApiService {
    constructor() {
        super('/surveys');
    }

    /**
     * ??뿅?筌뤴뫖以?鈺곌퀬??
     */
    async getSurveys(params: { page?: number; size?: number; searchWrd?: string }, config?: any) {
        return this.get<any>('', { ...config, params });
    }

    /**
     * ??뿅??怨멸쉭 ?類ｋ궖 鈺곌퀬??
     */
    async getSurvey(id: string, config?: any) {
        return this.get<any>(`/${id}`, config);
    }

    /**
     * ??뿅?筌욌뜄揆 筌뤴뫖以?鈺곌퀬??
     */
    async getQuestions(surveyId: string, config?: any) {
        return this.get<any>(`/${surveyId}/questions`, config);
    }

    /**
     * ??뿅??臾먮뼗 ??뽱뀱
     */
    async submitAnswers(surveyId: string, answers: any, config?: any) {
        return this.post<any>(`/${surveyId}/respond`, answers, config);
    }

    /**
     * ??뿅?野껉퀗??????鈺곌퀬??
     */
    async getStats(surveyId: string, config?: any) {
        return this.get<any>(`/${surveyId}/stats`, config);
    }
}

export const surveyAdminService = new SurveyAdminService();
