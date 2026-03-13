import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { CnsltVO, CnsltSearchParams } from '@/types/consult';

const BASE_URL = '/api/v1/consultations';

export const getCnsltList = async (params: CnsltSearchParams): Promise<PaginationResponse<CnsltVO>> => {
    const response = await client.get<any>(BASE_URL, {
        params: {
            keyword: params.searchKeyword,
            page: (params.pageIndex || 1) - 1,
            size: 10
        }
    });
    
    return {
        resultList: response.content || [],
        paginationInfo: {
            totalRecordCount: response.totalElements || 0,
            currentPageNo: (params.pageIndex || 1),
            recordCountPerPage: 10,
            pageSize: 10,
            totalPageCount: Math.ceil((response.totalElements || 0) / 10),
            firstPageNoOnPageList: 1,
            lastPageNoOnPageList: 1,
            firstRecordIndex: 0,
            lastRecordIndex: 0
        }
    } as any;
};

export const getCnslt = async (cnsltId: string): Promise<CnsltVO> =>
    client.get<CnsltVO>(`${BASE_URL}/${cnsltId}`);

export const createCnslt = async (cnslt: CnsltVO): Promise<void> =>
    client.post(BASE_URL, cnslt);

export const answerCnslt = async (cnsltId: string, answerCn: string): Promise<void> =>
    client.patch(`${BASE_URL}/${cnsltId}/answer`, answerCn, {
        headers: { 'Content-Type': 'text/plain' }
    });

export const deleteCnslt = async (cnsltId: string): Promise<void> =>
    client.delete(`${BASE_URL}/${cnsltId}`);
