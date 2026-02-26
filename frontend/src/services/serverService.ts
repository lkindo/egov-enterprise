import client from '@/lib/api/client';

export interface ServerInfo {
  serverId: string;
  serverNm: string;
  serverKnd: string; // 1:WAS, 2:DB, 3:WEB
  serverKndNm?: string;
  regstYmd?: string;
  lastUpdusrPnttm?: string;
}

interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export const serverService = {
  getServers: async (params: { page?: number; size?: number; serverNm?: string }, config?: any): Promise<PageResult<ServerInfo>> =>
    client.get<PageResult<ServerInfo>>('/admin/system/servers', { ...config, params }),
  
  getServer: async (id: string, config?: any): Promise<ServerInfo> =>
    client.get<ServerInfo>(`/admin/system/servers/${id}`, config),

  createServer: async (data: Omit<ServerInfo, 'serverId'>, config?: any): Promise<void> =>
    client.post('/admin/system/servers', data, config),

  updateServer: async (id: string, data: Partial<ServerInfo>, config?: any): Promise<void> =>
    client.put(`/admin/system/servers/${id}`, data, config),

  deleteServer: async (id: string, config?: any): Promise<void> =>
    client.delete(`/admin/system/servers/${id}`, config),
};
