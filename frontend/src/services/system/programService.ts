import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, ProgrmManage } from '@/types/system';

export const getProgramList = async (params: SearchParams): Promise<PaginationResponse<ProgrmManage>> => {
    const res = await client.get<PaginationResponse<ProgrmManage>>('/admin/programs', { params });
    return res;
};

export const getProgram = async (progrmFileNm: string): Promise<ProgrmManage> =>
    client.get<ProgrmManage>(`/admin/programs/${progrmFileNm}`);

export const createProgram = async (program: ProgrmManage): Promise<void> =>
    client.post('/admin/programs', program);

export const updateProgram = async (program: ProgrmManage): Promise<void> =>
    client.put(`/admin/programs/${program.progrmFileNm}`, program);

export const deleteProgram = async (progrmFileNm: string): Promise<void> =>
    client.delete(`/admin/programs/${progrmFileNm}`);
