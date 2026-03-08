import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptJobVO, DeptJobSearchParams } from '@/types/deptJob';

const BASE_URL = '/deptjob';

export const getDeptJobBxList = async (params: any = {}): Promise<any[]> => {
    const result = await client.get<any>(`${BASE_URL}/boxes`, { params });
    return result.resultList || [];
};

export const getDeptJobBoxDetail = async (id: string): Promise<any> =>
    client.get(`${BASE_URL}/boxes/${id}`);

export const createDeptJobBox = async (data: any): Promise<void> =>
    client.post(`${BASE_URL}/boxes`, data);

export const updateDeptJobBox = async (id: string, data: any): Promise<void> =>
    client.put(`${BASE_URL}/boxes/${id}`, data);

export const deleteDeptJobBox = async (id: string): Promise<void> =>
    client.delete(`${BASE_URL}/boxes/${id}`);
