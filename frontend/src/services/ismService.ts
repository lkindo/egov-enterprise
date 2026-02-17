import client from '@/lib/api/client';

export interface InfrmlSanctn {
  infrmlSanctnId: string;
  jobSe?: string;
  jobSeCode: string;
  applcntId: string;
  confmrerId?: string; // sanctnerId in backend
  sanctnerId?: string;
  confmAt: 'Y' | 'N' | 'R' | 'A'; // 승인, 대기, 반려, 신청중
  sancltNm: string;
  returnResn?: string;
  reqstDe?: string;
  frstRegisterId?: string;
  lastUpdusrId?: string;
}

export const ismService = {
  getInfrmlSanctnList: async (params: { page?: number; size?: number; sanctnerId?: string }) => {
    const response = await client.get('/admin/system/ism', { params });
    return response.data;
  },

  getInfrmlSanctn: async (id: string) => {
    const response = await client.get(`/admin/system/ism/${id}`);
    return response.data;
  },

  createInfrmlSanctn: async (data: Partial<InfrmlSanctn>) => {
    const response = await client.post('/admin/system/ism', data);
    return response.data;
  },

  updateInfrmlSanctn: async (id: string, data: Partial<InfrmlSanctn>) => {
    const response = await client.put(`/admin/system/ism/${id}`, data);
    return response.data;
  },

  confirmInfrmlSanctn: async (id: string, confmAt: string, returnResn?: string) => {
    const response = await client.patch(`/admin/system/ism/${id}/confirm`, null, {
      params: { confmAt, returnResn }
    });
    return response.data;
  },

  deleteInfrmlSanctn: async (id: string) => {
    const response = await client.delete(`/admin/system/ism/${id}`);
    return response.data;
  }
};
