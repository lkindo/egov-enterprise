import client from './client';
import { QustnrRespondInfo, QustnrRespondInfoVO } from '@/types/survey';

export const getQustnrRespondInfoList = async (params: Partial<QustnrRespondInfoVO>) => {
    return client.get<{ resultList: QustnrRespondInfo[]; paginationInfo: unknown }>(
        '/uss/olp/qri/EgovQustnrRespondInfoList.do',
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
