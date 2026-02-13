import client from '@/lib/api/client';

export interface Trouble {
  troblId: string;
  troblNm: string;
  troblKind: string; // 1:서버, 2:DB...
  troblDe: string;
  troblRequstTime: string;
  troblProcessSttus: string; // 1:접수, 2:처리중, 3:완료
  troblRqesterId: string;
}

export const troubleService = {
  getTroubles: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/system/troubles', { params });
    return response.data;
  },

  reportTrouble: async (data: Partial<Trouble>) => {
    const response = await client.post('/admin/system/troubles', data);
    return response.data;
  }
};
