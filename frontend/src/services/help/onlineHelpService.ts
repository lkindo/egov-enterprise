import client from '@/lib/api/client';
import { PaginationResponse } from '@/types/system';
import { FaqVO, QnaVO, OnlineHelpSearchParams } from '@/types/onlineHelp';

// FAQ Management
export const getFaqList = async (params: OnlineHelpSearchParams) => {
    const { data } = await client.get<PaginationResponse<FaqVO>>('/uss/olh/faq/selectFaqList.do', { params });
    return data;
};

export const getFaq = async (faqId: string) => {
    const { data } = await client.get<FaqVO>(`/uss/olh/faq/selectFaqDetail.do?faqId=${faqId}`);
    return data;
};

export const createFaq = async (faq: FaqVO) => {
    return client.post('/uss/olh/faq/insertFaq.do', faq);
};

export const updateFaq = async (faq: FaqVO) => {
    return client.post('/uss/olh/faq/updateFaq.do', faq);
};

export const deleteFaq = async (faqId: string) => {
    return client.post(`/uss/olh/faq/deleteFaq.do?faqId=${faqId}`);
};

// Q&A Management
export const getQnaList = async (params: OnlineHelpSearchParams) => {
    const { data } = await client.get<PaginationResponse<QnaVO>>('/uss/olh/qna/selectQnaList.do', { params });
    return data;
};

export const getQna = async (qaId: string) => {
    const { data } = await client.get<QnaVO>(`/uss/olh/qna/selectQnaDetail.do?qaId=${qaId}`);
    return data;
};

export const createQna = async (qna: QnaVO) => {
    return client.post('/uss/olh/qna/insertQna.do', qna);
};

export const updateQna = async (qna: QnaVO) => {
    return client.post('/uss/olh/qna/updateQna.do', qna);
};

export const deleteQna = async (qaId: string) => {
    return client.post(`/uss/olh/qna/deleteQna.do?qaId=${qaId}`);
};

// Q&A Answer Management
export const getQnaAnswerList = async (params: OnlineHelpSearchParams) => {
    const { data } = await client.get<PaginationResponse<QnaVO>>('/uss/olh/qna/selectQnaAnswerList.do', { params });
    return data;
};

export const updateQnaAnswer = async (qna: QnaVO) => {
    return client.post('/uss/olh/qna/updateQnaAnswer.do', qna);
};
