import client from '@/lib/api/client';

export interface ServerInfo {
  serverId: string;
  serverNm: string;
  serverKnd: string; // 1:WAS, 2:DB, 3:WEB
  serverKndNm?: string;
  regstYmd?: string;
  lastUpdusrPnttm?: string;
}

export const serverService = {
  getServers: async (params: { page?: number; size?: number; serverNm?: string }) => {
    const response = await client.get('/admin/system/servers', { params });
    return response;
  },
  
  getServer: async (id: string) => {
    const response = await client.get(`/admin/system/servers/${id}`);
    return response;
  },

  createServer: async (data: Omit<ServerInfo, 'serverId'>) => {
    const response = await client.post('/admin/system/servers', data);
    return response;
  },

  updateServer: async (id: string, data: Partial<ServerInfo>) => {
    const response = await client.put(`/admin/system/servers/${id}`, data);
    return response;
  },

  deleteServer: async (id: string) => {
    const response = await client.delete(`/admin/system/servers/${id}`);
    return response;
  }
};

