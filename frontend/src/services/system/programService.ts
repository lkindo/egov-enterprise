import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, ProgrmManage } from '@/types/system';

export const getProgramList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<ProgrmManage>>('/sym/prm/EgovProgramListManageSelect.do', { params });
    return data;
};

export const getProgram = async (progrmFileNm: string) => {
    const { data } = await client.get<ProgrmManage>(`/sym/prm/EgovProgramListDetailSelect.do?progrmFileNm=${progrmFileNm}`);
    return data;
};

export const createProgram = async (program: ProgrmManage) => {
    return client.post('/sym/prm/EgovProgramListRegist.do', program);
};

export const updateProgram = async (program: ProgrmManage) => {
    return client.put('/sym/prm/EgovProgramListDetailSelectUpdt.do', program);
};

export const deleteProgram = async (progrmFileNm: string) => {
    return client.delete(`/sym/prm/EgovProgramListManageDelete.do?progrmFileNm=${progrmFileNm}`);
};

