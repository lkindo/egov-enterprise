import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptSchedule, ScheduleSearchParams } from '@/types/schedule';

const BASE_URL = '/api/v1/schedule';

export const getDeptScheduleList = async (params: any = {}): Promise<any> => {
    const response = await client.get<any>(BASE_URL, { params });
    return {
        resultList: response.resultList || [],
        totalCount: response.totalCount || 0
    };
};

export const getDeptScheduleMonthList = async (params: { yearMonth: string }): Promise<any[]> => {
    const response = await client.get<any>(`${BASE_URL}/monthly`, { params });
    return response.schedules || [];
};

export const getDeptScheduleByRange = async (startDate: string, endDate: string): Promise<any[]> => {
    const response = await client.get<any>(`${BASE_URL}/range`, { params: { startDate, endDate } });
    return response.schedules || [];
};

export const getDeptSchedule = async (id: string): Promise<any> => {
    const response = await client.get<any>(`${BASE_URL}/${id}`);
    return response.schedule;
};

export const createDeptSchedule = async (schedule: any): Promise<void> =>
    client.post(BASE_URL, schedule);

export const updateDeptSchedule = async (id: string, schedule: any): Promise<void> =>
    client.put(`${BASE_URL}/${id}`, schedule);

export const deleteDeptSchedule = async (id: string): Promise<void> =>
    client.delete(`${BASE_URL}/${id}`);
