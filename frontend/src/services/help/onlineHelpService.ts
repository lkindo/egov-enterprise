import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { FaqVO, OnlineHelpSearchParams } from '@/types/onlineHelp';

export const getFaqList = async (params: OnlineHelpSearchParams): Promise<PaginationResponse<FaqVO>> =>
 client.get<PaginationResponse<FaqVO>>('/uss/olh/faq/selectFaqList.do', { params });

export const getFaq = async (faqId: string): Promise<FaqVO> =>
 client.get<FaqVO>(`/uss/olh/faq/selectFaqDetail.do?faqId=${faqId}`);

export const createFaq = async (faq: FaqVO): Promise<void> =>
 client.post('/uss/olh/faq/insertFaq.do', faq);

export const updateFaq = async (faq: FaqVO): Promise<void> =>
 client.post('/uss/olh/faq/updateFaq.do', faq);

export const deleteFaq = async (faqId: string): Promise<void> =>
 client.post(`/uss/olh/faq/deleteFaq.do?faqId=${faqId}`);
