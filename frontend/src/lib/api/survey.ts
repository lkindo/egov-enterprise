import client from './client';
import { QustnrRespondInfo, QustnrRespondInfoVO } from '@/types/survey';

export const getQustnrRespondInfoList = async (params: Partial<QustnrRespondInfoVO>) => {
    const response = await client.get<{ resultList: QustnrRespondInfo[]; paginationInfo: any }>('/uss/olp/qri/EgovQustnrRespondInfoList.do', {
        params,
        headers: {
            Accept: 'application/json'
        }
    });
    return response.data;
};

export const getQustnrRespondInfoDetail = async (id: string) => {
    const response = await client.get<QustnrRespondInfo>(`/survey/response/${id}`);
    return response.data;
};

export const deleteQustnrRespondInfo = async (id: string) => {
    const response = await client.delete(`/survey/response/${id}`);
    return response.data;
};

export const getSurveyStats = async (data: { qestnrId: string, qestnrTmplatId?: string, type?: string }) => {
    const response = await client.get('/survey/stats', {
        params: data,
    });
    return response.data;
};
