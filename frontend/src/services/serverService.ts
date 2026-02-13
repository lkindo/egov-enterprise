import client from '@/lib/api/client';

export interface ServerInfo {
  serverId: string;
  serverNm: string;
  serverIp: string;
  serverKnd: string; // 1:WAS, 2:DB, 3:WEB
  serverKndNm?: string;
  svcSttus: string; // 01:정상, 02:중지
}

export const serverService = {
  getServers: async (params: { searchWrd?: string }) => {
    const response = await client.get('/admin/system/server', { params });
    return response.data;
  },
  
  getServer: async (id: string) => {
    const response = await client.get(`/admin/system/server/${id}`);
    return response.data;
  }
};
