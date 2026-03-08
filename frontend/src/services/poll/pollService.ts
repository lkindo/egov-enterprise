import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { OnlinePollManageVO, OnlinePollItemVO, OnlinePollPartcptnVO, PollSearchParams } from '@/types/poll';

export const getPollList = async (params: PollSearchParams): Promise<PaginationResponse<OnlinePollManageVO>> => {
    return client.get<PaginationResponse<OnlinePollManageVO>>('/uss/olp/opm/listOnlinePollManage.do', { params });
};

export const getPollDetail = async (pollId: string): Promise<OnlinePollManageVO> => {
    return client.get<OnlinePollManageVO>(`/uss/olp/opm/detailOnlinePollManage.do?pollId=${pollId}`);
};

export const createPoll = async (poll: OnlinePollManageVO): Promise<void> => {
    return client.post('/uss/olp/opm/registOnlinePollManage.do', poll);
};

export const updatePoll = async (poll: OnlinePollManageVO): Promise<void> => {
    return client.post('/uss/olp/opm/updtOnlinePollManage.do', poll);
};

export const deletePoll = async (pollId: string): Promise<void> => {
    return client.post(`/uss/olp/opm/detailOnlinePollManage.do?cmd=del&pollId=${pollId}`);
};

export const getPollItemList = async (pollId: string): Promise<OnlinePollItemVO[]> => {
    return client.get<OnlinePollItemVO[]>(`/uss/olp/opm/listOnlinePollItem.do?pollId=${pollId}`);
};

export const createPollItem = async (item: OnlinePollItemVO): Promise<void> => {
    return client.post('/uss/olp/opm/registOnlinePollItem.do', item);
};

export const updatePollItem = async (item: OnlinePollItemVO): Promise<void> => {
    return client.post('/uss/olp/opm/updtOnlinePollItem.do', item);
};

export const deletePollItem = async (pollId: string, pollIemId: string): Promise<void> => {
    return client.post(`/uss/olp/opm/delOnlinePollItem.do?pollId=${pollId}&pollIemId=${pollIemId}`);
};

export const participatePoll = async (participation: OnlinePollPartcptnVO): Promise<void> => {
    return client.post('/uss/olp/opp/registOnlinePollPartcptn.do', participation);
};

export const getPollResult = async (pollId: string): Promise<unknown> => {
    return client.get(`/uss/olp/opp/egovOnlinePollManageStatistics.do?pollId=${pollId}`);
};
