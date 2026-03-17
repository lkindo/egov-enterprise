import client from '@/lib/api/client';
import { PageResponse } from '@/types/system';
import { DeptSchedule, ScheduleSearchParams } from '@/types/schedule';

const BASE_URL = '/schedule';

export const getDeptScheduleList = async (params: ScheduleSearchParams = {}): Promise<PageResponse<DeptSchedule>> => {
    return client.get<PageResponse<DeptSchedule>>(BASE_URL, { params });
};

export const getDeptScheduleMonthList = async (params: { yearMonth: string }): Promise<DeptSchedule[]> => {
    return client.get<DeptSchedule[]>(`${BASE_URL}/monthly`, { params });
};

export const getDeptScheduleByRange = async (startDate: string, endDate: string): Promise<DeptSchedule[]> => {
    return client.get<DeptSchedule[]>(`${BASE_URL}/range`, { params: { startDate, endDate } });
};

export const getDeptSchedule = async (id: string): Promise<DeptSchedule> => {
    return client.get<DeptSchedule>(`${BASE_URL}/${id}`);
};

export const createDeptSchedule = async (schedule: Partial<DeptSchedule>): Promise<DeptSchedule> =>
    client.post(BASE_URL, schedule);

export const updateDeptSchedule = async (id: string, schedule: Partial<DeptSchedule>): Promise<void> =>
    client.put(`${BASE_URL}/${id}`, schedule);

export const deleteDeptSchedule = async (id: string): Promise<void> =>
    client.delete(`${BASE_URL}/${id}`);
