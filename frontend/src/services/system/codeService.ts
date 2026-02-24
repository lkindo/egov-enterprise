import client from '@/lib/api/client';
import { PaginationResponse, SearchParams, CmmnClCode, CmmnCode, CmmnDetailCode } from '@/types/system';

// Classification Code
export const getClCodeList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<CmmnClCode>>('/sym/ccm/ccc/EgovCcmCmmnClCodeList.do', { params });
    return data;
};

export const getClCode = async (clCode: string) => {
    const { data } = await client.get<CmmnClCode>(`/sym/ccm/ccc/EgovCcmCmmnClCodeDetail.do?clCode=${clCode}`);
    return data;
};

export const createClCode = async (clCode: CmmnClCode) => {
    return client.post('/sym/ccm/ccc/EgovCcmCmmnClCodeRegist.do', clCode);
};

export const updateClCode = async (clCode: CmmnClCode) => {
    return client.put('/sym/ccm/ccc/EgovCcmCmmnClCodeModify.do', clCode);
};

export const deleteClCode = async (clCode: string) => {
    return client.delete(`/sym/ccm/ccc/EgovCcmCmmnClCodeRemove.do?clCode=${clCode}`);
};

// Common Code
export const getCmmnCodeList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<CmmnCode>>('/sym/ccm/cca/EgovCcmCmmnCodeList.do', { params });
    return data;
};

export const getCmmnCode = async (codeId: string) => {
    const { data } = await client.get<CmmnCode>(`/sym/ccm/cca/EgovCcmCmmnCodeDetail.do?codeId=${codeId}`);
    return data;
};

export const createCmmnCode = async (code: CmmnCode) => {
    return client.post('/sym/ccm/cca/EgovCcmCmmnCodeRegist.do', code);
};

export const updateCmmnCode = async (code: CmmnCode) => {
    return client.put('/sym/ccm/cca/EgovCcmCmmnCodeModify.do', code);
};

export const deleteCmmnCode = async (codeId: string) => {
    return client.delete(`/sym/ccm/cca/EgovCcmCmmnCodeRemove.do?codeId=${codeId}`);
};

// Detail Code
export const getDetailCodeList = async (params: SearchParams) => {
    const { data } = await client.get<PaginationResponse<CmmnDetailCode>>('/sym/ccm/cde/EgovCcmCmmnDetailCodeList.do', { params });
    return data;
};

export const getDetailCode = async (codeId: string, code: string) => {
    const { data } = await client.get<CmmnDetailCode>(`/sym/ccm/cde/EgovCcmCmmnDetailCodeDetail.do?codeId=${codeId}&code=${code}`);
    return data;
};

export const createDetailCode = async (code: CmmnDetailCode) => {
    return client.post('/sym/ccm/cde/EgovCcmCmmnDetailCodeRegist.do', code);
};

export const updateDetailCode = async (code: CmmnDetailCode) => {
    return client.put('/sym/ccm/cde/EgovCcmCmmnDetailCodeModify.do', code);
};

export const deleteDetailCode = async (codeId: string, code: string) => {
    return client.delete(`/sym/ccm/cde/EgovCcmCmmnDetailCodeRemove.do?codeId=${codeId}&code=${code}`);
};

