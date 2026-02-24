import client from '@/lib/api/client';
import { Survey, SurveyQuestion, SurveyAnswer, SurveyResultStats } from '@/types/survey';

export const surveyService = {
  /**
   * ?ㅻЦ 紐⑸줉 議고쉶
   */
  getSurveys: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/surveys', { params });
    return response;
  },

  /**
   * ?ㅻЦ ?곸꽭 ?뺣낫 議고쉶
   */
  getSurvey: async (id: string) => {
    const response = await client.get(`/surveys/${id}`);
    return response;
  },

  /**
   * ?ㅻЦ 吏덈Ц 紐⑸줉 議고쉶
   */
  getQuestions: async (surveyId: string) => {
    const response = await client.get(`/surveys/${surveyId}/questions`);
    return response;
  },

  /**
   * ?ㅻЦ ?묐떟 ?쒖텧
   */
  submitAnswers: async (surveyId: string, answers: any) => {
    const response = await client.post(`/surveys/${surveyId}/respond`, answers);
    return response;
  },

  /**
   * ?ㅻЦ 寃곌낵 ?듦퀎 議고쉶
   */
  getStats: async (surveyId: string) => {
    const response = await client.get(`/surveys/${surveyId}/stats`);
    return response;
  }
};

