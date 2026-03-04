import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { StplatManageVO, TermsSearchParams } from '@/types/terms';

export const getTermsList = async (params: TermsSearchParams): Promise<PaginationResponse<StplatManageVO>> => {
    const res: any = await client.get('/admin/terms', { params });
    return {
        resultList: res.list || [],
        paginationInfo: res.paginationInfo || {}
    };
};

export const getTermsDetail = async (useStplatId: string): Promise<StplatManageVO> => {
    const res: any = await client.get(`/admin/terms/${useStplatId}`);
    return res.data;
};

export const createTerms = async (terms: StplatManageVO): Promise<void> => {
    return client.post('/admin/terms', terms);
};

export const updateTerms = async (terms: StplatManageVO): Promise<void> => {
    return client.put(`/admin/terms/${terms.useStplatId}`, terms);
};

export const deleteTerms = async (useStplatId: string): Promise<void> => {
    return client.delete(`/admin/terms/${useStplatId}`);
};