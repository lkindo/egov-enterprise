import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { StplatManageVO, TermsSearchParams } from '@/types/terms';

const BASE_URL = '/uss/sam/stp';

export const getTermsList = async (params: TermsSearchParams): Promise<PaginationResponse<StplatManageVO>> => {
    return client.get<PaginationResponse<StplatManageVO>>(`${BASE_URL}/StplatListInqire.do`, { params });
};

export const getTermsDetail = async (useStplatId: string): Promise<StplatManageVO> => {
    return client.get<StplatManageVO>(`${BASE_URL}/StplatDetailInqire.do?useStplatId=${useStplatId}`);
};

export const createTerms = async (terms: StplatManageVO): Promise<void> => {
    return client.post(`${BASE_URL}/StplatCnRegist.do`, terms);
};

export const updateTerms = async (terms: StplatManageVO): Promise<void> => {
    return client.post(`${BASE_URL}/StplatCnUpdt.do`, terms);
};

export const deleteTerms = async (useStplatId: string): Promise<void> => {
    return client.post(`${BASE_URL}/StplatCnDelete.do?useStplatId=${useStplatId}`);
};
