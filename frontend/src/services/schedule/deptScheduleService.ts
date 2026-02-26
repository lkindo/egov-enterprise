import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptSchedule, ScheduleSearchParams } from '@/types/schedule';

export const getDeptScheduleList = async (params: ScheduleSearchParams): Promise<PaginationResponse<DeptSchedule>> =>
    client.get<PaginationResponse<DeptSchedule>>('/cop/smt/sdm/EgovDeptSchdulManageDailyList.do', { params });

export const getDeptScheduleMonthList = async (params: ScheduleSearchParams): Promise<PaginationResponse<DeptSchedule>> =>
    client.get<PaginationResponse<DeptSchedule>>('/cop/smt/sdm/EgovDeptSchdulManageMonthList.do', { params });

export const getDeptSchedule = async (schdulId: string): Promise<DeptSchedule> =>
    client.get<DeptSchedule>(`/cop/smt/sdm/EgovDeptSchdulManageDetail.do?schdulId=${schdulId}`);

export const createDeptSchedule = async (schedule: DeptSchedule): Promise<void> =>
    client.post('/cop/smt/sdm/EgovDeptSchdulManageRegistActor.do', schedule);

export const updateDeptSchedule = async (schedule: DeptSchedule): Promise<void> =>
    client.post('/cop/smt/sdm/EgovDeptSchdulManageModifyActor.do', schedule);

export const deleteDeptSchedule = async (schdulId: string): Promise<void> =>
    client.post(`/cop/smt/sdm/EgovDeptSchdulManageDelete.do?schdulId=${schdulId}`);
