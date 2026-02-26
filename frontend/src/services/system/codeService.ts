import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/system';

// Classification Code
export const getClCodeList = async (params: SearchParams): Promise<PaginationResponse<CmmnClCode>> => {
    return client.get<PaginationResponse<CmmnClCode>>('/sym/ccm/ccc/EgovCcmCmmnClCodeList.do', { params });
};

export const getClCode = async (clCode: string): Promise<CmmnClCode> => {
    return client.get<CmmnClCode>(`/sym/ccm/ccc/EgovCcmCmmnClCodeDetail.do?clCode=${clCode}`);
};

export const createClCode = async (clCode: CmmnClCode): Promise<void> => {
    return client.post('/sym/ccm/ccc/EgovCcmCmmnClCodeRegist.do', clCode);
};

export const updateClCode = async (clCode: CmmnClCode): Promise<void> => {
    return client.put('/sym/ccm/ccc/EgovCcmCmmnClCodeModify.do', clCode);
};

export const deleteClCode = async (clCode: string): Promise<void> => {
    return client.delete(`/sym/ccm/ccc/EgovCcmCmmnClCodeRemove.do?clCode=${clCode}`);
};

// Common Code
export const getCmmnCodeList = async (params: SearchParams): Promise<PaginationResponse<CmmnCode>> => {
    return client.get<PaginationResponse<CmmnCode>>('/sym/ccm/cca/EgovCcmCmmnCodeList.do', { params });
};

export const getCmmnCode = async (codeId: string): Promise<CmmnCode> => {
    return client.get<CmmnCode>(`/sym/ccm/cca/EgovCcmCmmnCodeDetail.do?codeId=${codeId}`);
};

export const createCmmnCode = async (code: CmmnCode): Promise<void> => {
    return client.post('/sym/ccm/cca/EgovCcmCmmnCodeRegist.do', code);
};

export const updateCmmnCode = async (code: CmmnCode): Promise<void> => {
    return client.put('/sym/ccm/cca/EgovCcmCmmnCodeModify.do', code);
};

export const deleteCmmnCode = async (codeId: string): Promise<void> => {
    return client.delete(`/sym/ccm/cca/EgovCcmCmmnCodeRemove.do?codeId=${codeId}`);
};

// Detail Code
export const getDetailCodeList = async (params: SearchParams): Promise<PaginationResponse<CmmnDetailCode>> => {
    return client.get<PaginationResponse<CmmnDetailCode>>('/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do', { params });
};

export const getDetailCode = async (codeId: string, code: string): Promise<CmmnDetailCode> => {
    return client.get<CmmnDetailCode>(`/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail.do?codeId=${codeId}&code=${code}`);
};

export const createDetailCode = async (code: CmmnDetailCode): Promise<void> => {
    return client.post('/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist.do', code);
};

export const updateDetailCode = async (code: CmmnDetailCode): Promise<void> => {
    return client.put('/sym/ccm/cde/EgovCcmCmmnDetailCodeModify.do', code);
};

export const deleteDetailCode = async (codeId: string, code: string): Promise<void> => {
    return client.delete(`/sym/ccm/cde/EgovCcmCmmnDetailCodeRemove.do?codeId=${codeId}&code=${code}`);
};
