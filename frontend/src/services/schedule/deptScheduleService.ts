import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptSchedule, ScheduleSearchParams } from '@/types/schedule';

export const getDeptScheduleList = async (params: ScheduleSearchParams): Promise<PaginationResponse<DeptSchedule>> =>
    client.get<PaginationResponse<DeptSchedule>>('/smart-toolkit/schedule/EgovDeptSchdulManageDailyList.do', { params });

export const getDeptScheduleMonthList = async (params: ScheduleSearchParams): Promise<PaginationResponse<DeptSchedule>> =>
    client.get<PaginationResponse<DeptSchedule>>('/smart-toolkit/schedule/EgovDeptSchdulManageMonthList.do', { params });

export const getDeptSchedule = async (schdulId: string): Promise<DeptSchedule> =>
    client.get<DeptSchedule>(`/smart-toolkit/schedule/EgovDeptSchdulManageDetail.do?schdulId=${schdulId}`);

export const createDeptSchedule = async (schedule: DeptSchedule): Promise<void> =>
    client.post('/smart-toolkit/schedule/EgovDeptSchdulManageRegistActor.do', schedule);

export const updateDeptSchedule = async (schedule: DeptSchedule): Promise<void> =>
    client.post('/smart-toolkit/schedule/EgovDeptSchdulManageModifyActor.do', schedule);

export const deleteDeptSchedule = async (schdulId: string): Promise<void> =>
    client.post(`/smart-toolkit/schedule/EgovDeptSchdulManageDelete.do?schdulId=${schdulId}`);