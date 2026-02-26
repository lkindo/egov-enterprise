import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { FaqVO, QnaVO, OnlineHelpSearchParams } from '@/types/onlineHelp';

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

export const getQnaList = async (params: OnlineHelpSearchParams): Promise<PaginationResponse<QnaVO>> =>
    client.get<PaginationResponse<QnaVO>>('/uss/olh/qna/selectQnaList.do', { params });

export const getQna = async (qaId: string): Promise<QnaVO> =>
    client.get<QnaVO>(`/uss/olh/qna/selectQnaDetail.do?qaId=${qaId}`);

export const createQna = async (qna: QnaVO): Promise<void> =>
    client.post('/uss/olh/qna/insertQna.do', qna);

export const updateQna = async (qna: QnaVO): Promise<void> =>
    client.post('/uss/olh/qna/updateQna.do', qna);

export const deleteQna = async (qaId: string): Promise<void> =>
    client.post(`/uss/olh/qna/deleteQna.do?qaId=${qaId}`);

export const getQnaAnswerList = async (params: OnlineHelpSearchParams): Promise<PaginationResponse<QnaVO>> =>
    client.get<PaginationResponse<QnaVO>>('/uss/olh/qna/selectQnaAnswerList.do', { params });

export const updateQnaAnswer = async (qna: QnaVO): Promise<void> =>
    client.post('/uss/olh/qna/updateQnaAnswer.do', qna);
