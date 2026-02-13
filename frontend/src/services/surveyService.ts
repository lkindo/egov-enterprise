import client from '@/lib/api/client';
import { Survey, SurveyQuestion, SurveyAnswer, SurveyResultStats } from '@/types/survey';

export const surveyService = {
  /**
   * 설문 목록 조회
   */
  getSurveys: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/surveys', { params });
    return response.data;
  },

  /**
   * 설문 상세 정보 조회
   */
  getSurvey: async (id: string) => {
    const response = await client.get(`/surveys/${id}`);
    return response.data;
  },

  /**
   * 설문 질문 목록 조회
   */
  getQuestions: async (surveyId: string) => {
    const response = await client.get(`/surveys/${surveyId}/questions`);
    return response.data;
  },

  /**
   * 설문 응답 제출
   */
  submitAnswers: async (surveyId: string, answers: any) => {
    const response = await client.post(`/surveys/${surveyId}/respond`, answers);
    return response.data;
  },

  /**
   * 설문 결과 통계 조회
   */
  getStats: async (surveyId: string) => {
    const response = await client.get(`/surveys/${surveyId}/stats`);
    return response.data;
  }
};
