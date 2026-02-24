import client from '@/lib/api/client';

export interface Network {
  ntwrkId: string;
  ntwrkIp: string;
  gtwy: string;
  subnet: string;
  domnServer: string;
  manageIem: string;
  userNm: string;
  useAt: 'Y' | 'N';
  regstYmd?: string;
  lastUpdusrPnttm?: string;
}

export const networkService = {
  getNetworks: async (params: { page?: number; size?: number; manageIem?: string; userNm?: string }) => {
    const response = await client.get('/admin/system/networks', { params });
    return response;
  },

  getNetwork: async (id: string) => {
    const response = await client.get(`/admin/system/networks/${id}`);
    return response;
  },

  createNetwork: async (data: Omit<Network, 'ntwrkId'>) => {
    const response = await client.post('/admin/system/networks', data);
    return response;
  },

  updateNetwork: async (id: string, data: Partial<Network>) => {
    const response = await client.put(`/admin/system/networks/${id}`, data);
    return response;
  },

  deleteNetwork: async (id: string) => {
    const response = await client.delete(`/admin/system/networks/${id}`);
    return response;
  },

  getNetworkLogs: async (params: { ntwrkId: string; page?: number; size?: number }) => {
    const response = await client.get(`/admin/system/networks/${params.ntwrkId}/logs`, { params });
    return { success: true, data: { content: response.data } };
  }
};

export type NetworkServiceStatus = {
  sysNm: string;
  sysIp: string;
  sysPort: string;
  svcSttus: string;
  logDt: string;
};

