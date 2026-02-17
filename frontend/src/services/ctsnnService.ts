import client from '@/lib/api/client';

export interface CtsnnManage {
  ctsnnId: string;
  usid: string;
  ctsnnCode: string;
  ctsnnNm: string;
  occrrncDe: string;
  trgetNm: string;
  relate: string;
  brthdy?: string;
  adres?: string;
  detailAdres?: string;
  remark?: string;
  confmAt: 'Y' | 'N';
  sancltId?: string;
}

export const ctsnnService = {
  getCtsnnList: async (params: { page?: number; size?: number; usid?: string }) => {
    const response = await client.get('/admin/system/ctsnn', { params });
    return response.data;
  },

  getCtsnn: async (id: string) => {
    const response = await client.get(`/admin/system/ctsnn/${id}`);
    return response.data;
  },

  createCtsnn: async (data: Partial<CtsnnManage>) => {
    const response = await client.post('/admin/system/ctsnn', data);
    return response.data;
  },

  updateCtsnn: async (id: string, data: Partial<CtsnnManage>) => {
    const response = await client.put(`/admin/system/ctsnn/${id}`, data);
    return response.data;
  },

  deleteCtsnn: async (id: string) => {
    const response = await client.delete(`/admin/system/ctsnn/${id}`);
    return response.data;
  },

  approveCtsnn: async (id: string) => {
    const response = await client.post(`/admin/system/ctsnn/${id}/approve`);
    return response.data;
  }
};
