import client from '@/lib/api/client';
import { PageResponse } from '@/types/system';
import { DeptJobVO, DeptJobBxVO, DeptJobSearchParams } from '@/types/deptJob';

const BASE_URL = '/deptjob';

export const getDeptJobList = async (params: DeptJobSearchParams = {}): Promise<PageResponse<DeptJobBxVO>> => {
 return client.get<PageResponse<DeptJobBxVO>>(`${BASE_URL}/boxes`, { params });
};

export const getDeptJobDetail = async (id: string): Promise<DeptJobBxVO> => {
 return client.get<DeptJobBxVO>(`${BASE_URL}/boxes/${id}`);
};

export const createDeptJob = async (data: Partial<DeptJobBxVO>): Promise<DeptJobBxVO> =>
 client.post(`${BASE_URL}/boxes`, data);

export const updateDeptJob = async (data: Partial<DeptJobBxVO>): Promise<void> => {
 const id = data.deptJobBxId;
 return client.put(`${BASE_URL}/boxes/${id}`, data);
};

export const deleteDeptJob = async (id: string): Promise<void> =>
 client.delete(`${BASE_URL}/boxes/${id}`);
