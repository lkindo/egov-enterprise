import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptJobVO, DeptJobSearchParams } from '@/types/deptJob';

const BASE_URL = '/deptjob';

export const getDeptJobList = async (params: any = {}): Promise<any[]> => {
    const result = await client.get<any>(`${BASE_URL}/boxes`, { params });
    return result.resultList || [];
};

export const getDeptJobDetail = async (id: string): Promise<any> => {
    const result = await client.get<any>(`${BASE_URL}/boxes/${id}`);
    return result.deptJobBox;
};

export const createDeptJob = async (data: any): Promise<void> =>
    client.post(`${BASE_URL}/boxes`, data);

export const updateDeptJob = async (data: any): Promise<void> => {
    const id = data.deptJobbxId;
    return client.put(`${BASE_URL}/boxes/${id}`, data);
};

export const deleteDeptJob = async (id: string): Promise<void> =>
    client.delete(`${BASE_URL}/boxes/${id}`);
