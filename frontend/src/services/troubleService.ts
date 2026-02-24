import client from '@/lib/api/client';

export interface Trouble {
  troblId: string;
  troblNm: string;
  troblKnd: string;
  troblKndNm?: string;
  troblDc: string;
  troblOccrrncTime?: string;
  troblRqesterNm?: string;
  troblRequstTime?: string;
  troblProcessResult?: string;
  troblOpetrNm?: string;
  troblProcessTime?: string;
  processSttus: string; // R:?좎껌, P:泥섎━以? C:?꾨즺
  processSttusNm?: string;
}

export const troubleService = {
  getTroubles: async (params: { page?: number; size?: number; strTroblNm?: string; strTroblKnd?: string; strProcessSttus?: string }) => {
    const response = await client.get('/admin/system/troubles', { params });
    return response;
  },

  getTrouble: async (id: string) => {
    const response = await client.get(`/admin/system/troubles/${id}`);
    return response;
  },

  createTrouble: async (data: Partial<Trouble>) => {
    const response = await client.post('/admin/system/troubles', data);
    return response;
  },

  updateTrouble: async (id: string, data: Partial<Trouble>) => {
    const response = await client.put(`/admin/system/troubles/${id}`, data);
    return response;
  },

  processTrouble: async (id: string, data: Partial<Trouble>) => {
    const response = await client.patch(`/admin/system/troubles/${id}/process`, data);
    return response;
  },

  deleteTrouble: async (id: string) => {
    const response = await client.delete(`/admin/system/troubles/${id}`);
    return response;
  }
};

