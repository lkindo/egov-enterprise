import client from '@/lib/api/client';

export interface Duty {
  dutyId: string;
  dutyDe: string;
  dutyUserNm: string;
  dutyUserId: string;
  postNm: string;
  telNo: string;
}

export const dutyService = {
  getDuties: async (params: { month?: string }) => {
    const response = await client.get('/uss/ion/duties', { params });
    return response.data;
  },

  saveDuty: async (data: Partial<Duty>) => {
    const response = await client.post('/uss/ion/duties', data);
    return response.data;
  },

  deleteDuty: async (id: string) => {
    const response = await client.delete(`/uss/ion/duties/${id}`);
    return response.data;
  }
};
