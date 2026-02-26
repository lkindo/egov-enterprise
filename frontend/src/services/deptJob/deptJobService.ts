import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptJobVO, DeptJobSearchParams } from '@/types/deptJob';

const BASE_URL = '/cop/smt/djm';

export const getDeptJobList = async (params: DeptJobSearchParams): Promise<PaginationResponse<DeptJobVO>> =>
    client.get<PaginationResponse<DeptJobVO>>(`${BASE_URL}/selectDeptJobList.do`, { params });

export const getDeptJobDetail = async (deptJobId: string): Promise<DeptJobVO> =>
    client.get<DeptJobVO>(`${BASE_URL}/selectDeptJob.do?deptJobId=${deptJobId}`);

export const createDeptJob = async (job: DeptJobVO): Promise<void> =>
    client.post(`${BASE_URL}/insertDeptJob.do`, job);

export const updateDeptJob = async (job: DeptJobVO): Promise<void> =>
    client.post(`${BASE_URL}/updateDeptJob.do`, job);

export const deleteDeptJob = async (deptJobId: string): Promise<void> =>
    client.post(`${BASE_URL}/deleteDeptJob.do?deptJobId=${deptJobId}`);

export const getDeptJobBxList = async (): Promise<unknown[]> => {
    const result = await client.get<unknown>(`${BASE_URL}/selectDeptJobBxList.do`);
    return (result as any)?.resultList || [];
};
