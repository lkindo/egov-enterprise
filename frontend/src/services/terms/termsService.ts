import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { StplatManageVO, TermsSearchParams } from '@/types/terms';

const BASE_URL = '/uss/sam/stp';

export const getTermsList = async (params: TermsSearchParams) => {
    const { data } = await client.get<PaginationResponse<StplatManageVO>>(`${BASE_URL}/StplatListInqire.do`, { params });
    return data;
};

export const getTermsDetail = async (useStplatId: string) => {
    const { data } = await client.get<StplatManageVO>(`${BASE_URL}/StplatDetailInqire.do?useStplatId=${useStplatId}`);
    return data;
};

export const createTerms = async (terms: StplatManageVO) => {
    return client.post(`${BASE_URL}/StplatCnRegist.do`, terms);
};

export const updateTerms = async (terms: StplatManageVO) => {
    return client.post(`${BASE_URL}/StplatCnUpdt.do`, terms);
};

export const deleteTerms = async (useStplatId: string) => {
    return client.post(`${BASE_URL}/StplatCnDelete.do?useStplatId=${useStplatId}`);
};

