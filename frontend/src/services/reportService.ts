import client from '@/lib/api/client';

export interface WorkReport {
  reprtId: string;
  reprtSj: string;
  reprtSe: string; // 1:주간, 2:월간
  reprtDe: string;
  wrterId: string;
  wrterNm?: string;
  reportrId: string;
  reportrNm?: string;
  reprtThswikCn: string;
  reprtLesseeCn: string;
  confmDt?: string;
  sttus: 'R' | 'Y' | 'N';
}

export const reportService = {
  getReports: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/reports', { params });
    return response.data;
  },

  getReport: async (id: string) => {
    const response = await client.get(`/reports/${id}`);
    return response.data;
  },

  createReport: async (data: Partial<WorkReport>) => {
    const response = await client.post('/reports', data);
    return response.data;
  },

  confirmReport: async (id: string, confmAt: 'Y' | 'N') => {
    const response = await client.put(`/reports/${id}/confirm`, { confmAt });
    return response.data;
  }
};
