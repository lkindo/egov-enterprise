import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/foundation/system';
import { CnsltVO, CnsltSearchParams } from '@/types/business/consult';

const BASE_URL = '/consultations';

export const getCnsltList = async (params: CnsltSearchParams): Promise<PaginationResponse<CnsltVO>> => {
 return client.get<PaginationResponse<CnsltVO>>(BASE_URL, {
 params: {
 ...params,
 keyword: params.searchKeyword || params.searchWrd || '',
 page: (params.page번호 || 1) - 1,
 size: params.pageUnit || 10
 }
 });
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
