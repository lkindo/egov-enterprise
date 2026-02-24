import client from '@/lib/api/client';

export interface Term {
  stplatId: string;
  stplatNm: string;
  stplatCn: string;
  lastUpdusrPnttm: string;
}

export const termsService = {
  getTerms: async () => {
    const response = await client.get('/admin/terms');
    return response;
  },
  
  updateTerm: async (id: string, content: string) => {
    const response = await client.put(`/admin/terms/${id}`, { stplatCn: content });
    return response;
  }
};

