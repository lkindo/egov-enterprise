import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, ProgrmManage } from '@/types/system';

export const getProgramList = async (params: SearchParams): Promise<PaginationResponse<ProgrmManage>> =>
    client.get<PaginationResponse<ProgrmManage>>('/sym/prm/EgovProgramListManageSelect.do', { params });

export const getProgram = async (progrmFileNm: string): Promise<ProgrmManage> =>
    client.get<ProgrmManage>(`/sym/prm/EgovProgramListDetailSelect.do?progrmFileNm=${progrmFileNm}`);

export const createProgram = async (program: ProgrmManage): Promise<void> =>
    client.post('/sym/prm/EgovProgramListRegist.do', program);

export const updateProgram = async (program: ProgrmManage): Promise<void> =>
    client.put('/sym/prm/EgovProgramListDetailSelectUpdt.do', program);

export const deleteProgram = async (progrmFileNm: string): Promise<void> =>
    client.delete(`/sym/prm/EgovProgramListManageDelete.do?progrmFileNm=${progrmFileNm}`);
