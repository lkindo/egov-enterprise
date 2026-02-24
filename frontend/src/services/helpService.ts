import client from '@/lib/api/client';

export interface FAQ {
  faqId: string;
  qestnSj: string;
  qestnCn: string;
  answerCn: string;
  inqireCo: number;
  lastUpdusrPnttm: string;
}

export interface QNA {
  qaId: string;
  qestnSj: string;
  qestnCn: string;
  answerCn?: string;
  writngPassword?: string;
  wrterNm: string;
  writngDe: string;
  qnaProcessSttusCode: string; // 1:?묒닔, 2:?듬?以? 3:?듬??꾨즺
}

export const helpService = {
  getFaqs: async (params: { searchWrd?: string }) => {
    const response = await client.get('/faqs', { params });
    return response;
  },
  
  getQnas: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/qnas', { params });
    return response;
  },

  createQna: async (data: Partial<QNA>) => {
    const response = await client.post('/qnas', data);
    return response;
  }
};

