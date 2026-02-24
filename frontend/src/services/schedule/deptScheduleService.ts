import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptSchedule, ScheduleSearchParams } from '@/types/schedule';

// Department Schedule Management
export const getDeptScheduleList = async (params: ScheduleSearchParams) => {
    const { data } = await client.get<PaginationResponse<DeptSchedule>>('/cop/smt/sdm/EgovDeptSchdulManageDailyList.do', { params });
    return data;
};

export const getDeptScheduleMonthList = async (params: ScheduleSearchParams) => {
    const { data } = await client.get<PaginationResponse<DeptSchedule>>('/cop/smt/sdm/EgovDeptSchdulManageMonthList.do', { params });
    return data;
};

export const getDeptSchedule = async (schdulId: string) => {
    const { data } = await client.get<DeptSchedule>(`/cop/smt/sdm/EgovDeptSchdulManageDetail.do?schdulId=${schdulId}`);
    return data;
};

export const createDeptSchedule = async (schedule: DeptSchedule) => {
    return client.post('/cop/smt/sdm/EgovDeptSchdulManageRegistActor.do', schedule);
};

export const updateDeptSchedule = async (schedule: DeptSchedule) => {
    return client.post('/cop/smt/sdm/EgovDeptSchdulManageModifyActor.do', schedule);
};

export const deleteDeptSchedule = async (schdulId: string) => {
    return client.post(`/cop/smt/sdm/EgovDeptSchdulManageDelete.do?schdulId=${schdulId}`);
};

