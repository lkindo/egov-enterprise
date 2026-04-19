import client from './client';
import { Survey, QustnrRespondInfo } from '@/types/business/survey';

export const getQustnrRespondInfoList = async (params: { keyword?: string; page?: number; size?: number } = {}) => {
  return client.get<{ list: Survey[]; total: number }>(
    '/surveys',
    { params, headers: { Accept: 'application/json' } }
  );
};

export const getQustnrRespondInfoDetail = async (id: string): Promise<QustnrRespondInfo> => {
 return client.get<QustnrRespondInfo>(`/survey/response/${id}`);
};

export const deleteQustnrRespondInfo = async (id: string): Promise<void> => {
 return client.delete(`/survey/response/${id}`);
};

export const getSurveyStats = async (data: { qestnrId: string; qestnrTmplatId?: string; type?: string }): Promise<unknown> => {
 return client.get('/survey/stats', { params: data });
};
