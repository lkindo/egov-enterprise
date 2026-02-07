import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { DeptJobVO, DeptJobBxVO, DeptJobSearchParams } from '@/types/deptJob';

const BASE_URL = '/cop/smt/djm';

// Dept Job (부서업무)
export const getDeptJobList = async (params: DeptJobSearchParams) => {
    const { data } = await client.get<PaginationResponse<DeptJobVO>>(`${BASE_URL}/selectDeptJobList.do`, { params });
    return data;
};

export const getDeptJobDetail = async (deptJobId: string) => {
    const { data } = await client.get<DeptJobVO>(`${BASE_URL}/selectDeptJob.do?deptJobId=${deptJobId}`);
    return data;
};

export const createDeptJob = async (job: DeptJobVO) => {
    return client.post(`${BASE_URL}/insertDeptJob.do`, job);
};

export const updateDeptJob = async (job: DeptJobVO) => {
    return client.post(`${BASE_URL}/updateDeptJob.do`, job);
};

export const deleteDeptJob = async (deptJobId: string) => {
    return client.post(`${BASE_URL}/deleteDeptJob.do?deptJobId=${deptJobId}`);
};

// Dept Job Box (부서업무함 - for selection)
export const getDeptJobBxList = async () => {
    // Assuming simple list or pagination
    const { data } = await client.get<any>(`${BASE_URL}/selectDeptJobBxList.do`);
    return data?.resultList || [];
};
