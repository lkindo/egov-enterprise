import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/system';

// Classification Code
export const getClCodeList = async (params: SearchParams): Promise<PaginationResponse<CmmnClCode>> => {
    const res: any = await client.get('/admin/codes/cl', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

export const getClCode = async (clCode: string): Promise<CmmnClCode> => {
    const res: any = await client.get(`/admin/codes/cl/${clCode}`);
    return res.data;
};

export const createClCode = async (clCode: CmmnClCode): Promise<void> => {
    return client.post('/admin/codes/cl', clCode);
};

export const updateClCode = async (clCode: CmmnClCode): Promise<void> => {
    return client.put(`/admin/codes/cl/${clCode.clCode}`, clCode);
};

export const deleteClCode = async (clCode: string): Promise<void> => {
    return client.delete(`/admin/codes/cl/${clCode}`);
};

// Common Code
export const getCmmnCodeList = async (params: SearchParams): Promise<PaginationResponse<CmmnCode>> => {
    const res: any = await client.get('/admin/codes/cmmn', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

export const getCmmnCode = async (codeId: string): Promise<CmmnCode> => {
    const res: any = await client.get(`/admin/codes/cmmn/${codeId}`);
    return res.data;
};

export const createCmmnCode = async (code: CmmnCode): Promise<void> => {
    return client.post('/admin/codes/cmmn', code);
};

export const updateCmmnCode = async (code: CmmnCode): Promise<void> => {
    return client.put(`/admin/codes/cmmn/${code.codeId}`, code);
};

export const deleteCmmnCode = async (codeId: string): Promise<void> => {
    return client.delete(`/admin/codes/cmmn/${codeId}`);
};

// Detail Code
export const getDetailCodeList = async (params: SearchParams): Promise<PaginationResponse<CmmnDetailCode>> => {
    const res: any = await client.get('/admin/codes/detail', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

export const getDetailCode = async (codeId: string, code: string): Promise<CmmnDetailCode> => {
    const res: any = await client.get(`/admin/codes/detail/${codeId}/${code}`);
    return res.data;
};

export const createDetailCode = async (code: CmmnDetailCode): Promise<void> => {
    return client.post('/admin/codes/detail', code);
};

export const updateDetailCode = async (code: CmmnDetailCode): Promise<void> => {
    return client.put(`/admin/codes/detail/${code.codeId}/${code.code}`, code);
};

export const deleteDetailCode = async (codeId: string, code: string): Promise<void> => {
    return client.delete(`/admin/codes/detail/${codeId}/${code}`);
};
