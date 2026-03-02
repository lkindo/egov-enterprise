import client from '@/lib/api/client';
import { CmmnClCode, CmmnCode, CmmnDetailCode, SearchParams, PaginationResponse } from '@/types/system';

/**
 * 공통코드 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.code.CodeApiController
 */
const BASE_URL = '/admin/codes';

export const codeAdminService = {
    // --- Classification Code (분류코드) ---
    getClCodes: async (params?: SearchParams, ..._args: any[]) => {
        return client.get<PaginationResponse<CmmnClCode>>(`${BASE_URL}/cl`, { params });
    },
    getClCodeList: async (params?: SearchParams, ..._args: any[]) => {
        return client.get<PaginationResponse<CmmnClCode>>(`${BASE_URL}/cl`, { params });
    },
    getClCode: async (clCode: string, ..._args: any[]) => {
        return client.get<CmmnClCode>(`${BASE_URL}/cl/${clCode}`);
    },
    createClCode: async (data: CmmnClCode, ..._args: any[]) => {
        return client.post<void>(`${BASE_URL}/cl`, data);
    },
    updateClCode: async (clCode: string | CmmnClCode, data?: CmmnClCode, ..._args: any[]) => {
        const code = typeof clCode === 'string' ? clCode : clCode.clCode;
        const payload = data || (clCode as CmmnClCode);
        return client.put<void>(`${BASE_URL}/cl/${code}`, payload);
    },
    deleteClCode: async (clCode: string, ..._args: any[]) => {
        return client.delete<void>(`${BASE_URL}/cl/${clCode}`);
    },

    // --- Common Code (공통코드) ---
    getGroups: async (params?: SearchParams, ..._args: any[]) => {
        return client.get<PaginationResponse<CmmnCode>>(`${BASE_URL}/cmmn`, { params });
    },
    getCmmnCodeList: async (params?: SearchParams, ..._args: any[]) => {
        return client.get<PaginationResponse<CmmnCode>>(`${BASE_URL}/cmmn`, { params });
    },
    getGroup: async (codeId: string, ..._args: any[]) => {
        return client.get<CmmnCode>(`${BASE_URL}/cmmn/${codeId}`);
    },
    createGroup: async (data: CmmnCode, ..._args: any[]) => {
        return client.post<void>(`${BASE_URL}/cmmn`, data);
    },
    createCmmnCode: async (data: CmmnCode, ..._args: any[]) => {
        return client.post<void>(`${BASE_URL}/cmmn`, data);
    },
    updateGroup: async (codeId: string, data: CmmnCode, ..._args: any[]) => {
        return client.put<void>(`${BASE_URL}/cmmn/${codeId}`, data);
    },
    updateCmmnCode: async (data: CmmnCode, ..._args: any[]) => {
        return client.put<void>(`${BASE_URL}/cmmn/${data.codeId}`, data);
    },
    deleteGroup: async (codeId: string, ..._args: any[]) => {
        return client.delete<void>(`${BASE_URL}/cmmn/${codeId}`);
    },
    deleteCmmnCode: async (codeId: string, ..._args: any[]) => {
        return client.delete<void>(`${BASE_URL}/cmmn/${codeId}`);
    },

    // --- Detail Code (상세코드) ---
    getDetails: async (params?: SearchParams, ..._args: any[]) => {
        return client.get<PaginationResponse<CmmnDetailCode>>(`${BASE_URL}/detail`, { params });
    },
    getDetailCodeList: async (params?: SearchParams, ..._args: any[]) => {
        return client.get<PaginationResponse<CmmnDetailCode>>(`${BASE_URL}/detail`, { params });
    },
    getDetail: async (codeId: string, code: string, ..._args: any[]) => {
        return client.get<CmmnDetailCode>(`${BASE_URL}/detail/${codeId}/${code}`);
    },
    createDetail: async (data: CmmnDetailCode, ..._args: any[]) => {
        return client.post<void>(`${BASE_URL}/detail`, data);
    },
    createDetailCode: async (data: CmmnDetailCode, ..._args: any[]) => {
        return client.post<void>(`${BASE_URL}/detail`, data);
    },
    updateDetail: async (codeId: string, code: string, data: CmmnDetailCode, ..._args: any[]) => {
        return client.put<void>(`${BASE_URL}/detail/${codeId}/${code}`, data);
    },
    updateDetailCode: async (data: CmmnDetailCode, ..._args: any[]) => {
        return client.put<void>(`${BASE_URL}/detail/${data.codeId}/${data.code}`, data);
    },
    deleteDetail: async (codeId: string, code: string, ..._args: any[]) => {
        return client.delete<void>(`${BASE_URL}/detail/${codeId}/${code}`);
    },
    deleteDetailCode: async (codeId: string | any, code?: string, ..._args: any[]) => {
        const cId = typeof codeId === 'string' ? codeId : codeId.codeId;
        const c = typeof code === 'string' ? code : (codeId as any).code;
        return client.delete<void>(`${BASE_URL}/detail/${cId}/${c}`);
    },
};

export interface CommonCodeDetail extends CmmnDetailCode {}
