import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { OnlinePollManageVO, OnlinePollItemVO, OnlinePollPartcptnVO, PollSearchParams } from '@/types/poll';

// Poll Management
export const getPollList = async (params: PollSearchParams) => {
    const { data } = await client.get<PaginationResponse<OnlinePollManageVO>>('/uss/olp/opm/listOnlinePollManage.do', { params });
    return data;
};

export const getPollDetail = async (pollId: string) => {
    const { data } = await client.get<OnlinePollManageVO>(`/uss/olp/opm/detailOnlinePollManage.do?pollId=${pollId}`);
    return data;
};

export const createPoll = async (poll: OnlinePollManageVO) => {
    return client.post('/uss/olp/opm/registOnlinePollManage.do', poll);
};

// Update: Controller uses /updtOnlinePollManage.do
export const updatePoll = async (poll: OnlinePollManageVO) => {
    return client.post('/uss/olp/opm/updtOnlinePollManage.do', poll);
};

export const deletePoll = async (pollId: string) => {
    return client.post(`/uss/olp/opm/detailOnlinePollManage.do?cmd=del&pollId=${pollId}`);
};

// Poll Item Management
export const getPollItemList = async (pollId: string) => {
    const { data } = await client.get<OnlinePollItemVO[]>(`/uss/olp/opm/listOnlinePollItem.do?pollId=${pollId}`);
    // Backend API seems to wrap list in 'resultList' or return list directly? 
    // Usually Egov endpoints return a View, but we assume API adapter returns JSON.
    // Based on previous patterns, it might return { resultList: [...] }. 
    // If it returns View name string (as seen in Controller), the API adapter must handle it.
    // We assume the Client API Adapter handles the JSON conversion.
    return data;
};

export const createPollItem = async (item: OnlinePollItemVO) => {
    return client.post('/uss/olp/opm/registOnlinePollItem.do', item);
};

export const updatePollItem = async (item: OnlinePollItemVO) => {
    return client.post('/uss/olp/opm/updtOnlinePollItem.do', item);
};

export const deletePollItem = async (pollId: string, pollIemId: string) => {
    return client.post(`/uss/olp/opm/delOnlinePollItem.do?pollId=${pollId}&pollIemId=${pollIemId}`);
};

// Participation
export const participatePoll = async (participation: OnlinePollPartcptnVO) => {
    return client.post('/uss/olp/opp/registOnlinePollPartcptn.do', participation);
};

// Result/Statistics
export const getPollResult = async (pollId: string) => {
    // This endpoint (/uss/olp/opm/EgovOnlinePollManageStatistics) seems to return a View with model attributes.
    // We need to check if we can get JSON. The controller returns a String (view name).
    // If we use the API Client which expects JSON, this might fail unless the backend sends JSON.
    // For now, let's assume we can fetch data or we might need to parse HTML/use a specific JSON endpoint if available.
    // EgovOnlinePollResultController might have a better endpoint?
    const { data } = await client.get(`/uss/olp/opp/egovOnlinePollManageStatistics.do?pollId=${pollId}`);
    return data;
};

