import client from '@/lib/api/client';
import { CmmnClCode, CmmnCode, CmmnDetailCode, SearchParams, PaginationResponse } from '@/types/system';
import { AxiosRequestConfig } from 'axios';

/**
 * 공통코드 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.code.CodeApiController
 */
const BASE_URL = '/admin/codes';

export const codeAdminService = {
    // --- Classification Code (분류코드) ---
    getClCodes: async (params?: SearchParams, config?: AxiosRequestConfig) => {
        return client.get<PaginationResponse<CmmnClCode>>(`${BASE_URL}/cl`, { ...config, params });
    },
    getClCodeList: async (params?: SearchParams, config?: AxiosRequestConfig) => {
        return client.get<PaginationResponse<CmmnClCode>>(`${BASE_URL}/cl`, { ...config, params });
    },
    getClCode: async (clCode: string, config?: AxiosRequestConfig) => {
        return client.get<CmmnClCode>(`${BASE_URL}/cl/${clCode}`, config);
    },
    createClCode: async (data: CmmnClCode, config?: AxiosRequestConfig) => {
        return client.post<void>(`${BASE_URL}/cl`, data, config);
    },
    updateClCode: async (clCode: string | CmmnClCode, data?: CmmnClCode, config?: AxiosRequestConfig) => {
        const code = typeof clCode === 'string' ? clCode : clCode.clCode;
        const payload = data || (clCode as CmmnClCode);
        return client.put<void>(`${BASE_URL}/cl/${code}`, payload, config);
    },
    deleteClCode: async (clCode: string, config?: AxiosRequestConfig) => {
        return client.delete<void>(`${BASE_URL}/cl/${clCode}`, config);
    },

    // --- Common Code (공통코드) ---
    getGroups: async (params?: SearchParams, config?: AxiosRequestConfig) => {
        return client.get<PaginationResponse<CmmnCode>>(`${BASE_URL}/cmmn`, { ...config, params });
    },
    getCmmnCodeList: async (params?: SearchParams, config?: AxiosRequestConfig) => {
        return client.get<PaginationResponse<CmmnCode>>(`${BASE_URL}/cmmn`, { ...config, params });
    },
    getGroup: async (codeId: string, config?: AxiosRequestConfig) => {
        return client.get<CmmnCode>(`${BASE_URL}/cmmn/${codeId}`, config);
    },
    createGroup: async (data: CmmnCode, config?: AxiosRequestConfig) => {
        return client.post<void>(`${BASE_URL}/cmmn`, data, config);
    },
    createCmmnCode: async (data: CmmnCode, config?: AxiosRequestConfig) => {
        return client.post<void>(`${BASE_URL}/cmmn`, data, config);
    },
    updateGroup: async (codeId: string, data: CmmnCode, config?: AxiosRequestConfig) => {
        return client.put<void>(`${BASE_URL}/cmmn/${codeId}`, data, config);
    },
    updateCmmnCode: async (data: CmmnCode, config?: AxiosRequestConfig) => {
        return client.put<void>(`${BASE_URL}/cmmn/${data.codeId}`, data, config);
    },
    deleteGroup: async (codeId: string, config?: AxiosRequestConfig) => {
        return client.delete<void>(`${BASE_URL}/cmmn/${codeId}`, config);
    },
    deleteCmmnCode: async (codeId: string, config?: AxiosRequestConfig) => {
        return client.delete<void>(`${BASE_URL}/cmmn/${codeId}`, config);
    },

    // --- Detail Code (상세코드) ---
    getDetails: async (params?: SearchParams, config?: AxiosRequestConfig) => {
        return client.get<PaginationResponse<CmmnDetailCode>>(`${BASE_URL}/detail`, { ...config, params });
    },
    getDetailCodeList: async (params?: SearchParams, config?: AxiosRequestConfig) => {
        return client.get<PaginationResponse<CmmnDetailCode>>(`${BASE_URL}/detail`, { ...config, params });
    },
    getDetail: async (codeId: string, code: string, config?: AxiosRequestConfig) => {
        return client.get<CmmnDetailCode>(`${BASE_URL}/detail/${codeId}/${code}`, config);
    },
    createDetail: async (data: CmmnDetailCode, config?: AxiosRequestConfig) => {
        return client.post<void>(`${BASE_URL}/detail`, data, config);
    },
    createDetailCode: async (data: CmmnDetailCode, config?: AxiosRequestConfig) => {
        return client.post<void>(`${BASE_URL}/detail`, data, config);
    },
    updateDetail: async (codeId: string, code: string, data: CmmnDetailCode, config?: AxiosRequestConfig) => {
        return client.put<void>(`${BASE_URL}/detail/${codeId}/${code}`, data, config);
    },
    updateDetailCode: async (data: CmmnDetailCode, config?: AxiosRequestConfig) => {
        return client.put<void>(`${BASE_URL}/detail/${data.codeId}/${data.code}`, data, config);
    },
    deleteDetail: async (codeId: string, code: string, config?: AxiosRequestConfig) => {
        return client.delete<void>(`${BASE_URL}/detail/${codeId}/${code}`, config);
    },
    deleteDetailCode: async (codeId: string | any, code?: string, config?: AxiosRequestConfig) => {
        const cId = typeof codeId === 'string' ? codeId : codeId.codeId;
        const c = typeof code === 'string' ? code : (codeId as any).code;
        return client.delete<void>(`${BASE_URL}/detail/${cId}/${c}`, config);
    },
};

export interface CommonCodeDetail extends CmmnDetailCode {}
