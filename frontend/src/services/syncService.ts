import client from '@/lib/api/client';

export interface SyncServer {
  serverId: string;
  serverNm: string;
  serverIp: string;
  serverPort: number;
  targetDrctry: string;
  syncDt: string;
  syncAt: 'Y' | 'N';
}

interface PageResult<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
}

export const syncService = {
  getSyncServers: async (config?: any): Promise<SyncServer[]> =>
    client.get<SyncServer[]>('/admin/system/sync-servers', config),

  executeSync: async (id: string, config?: any): Promise<void> =>
    client.post(`/admin/system/sync-servers/${id}/execute`, {}, config),

  createSyncServer: async (data: Omit<SyncServer, 'serverId'>, config?: any): Promise<void> =>
    client.post('/admin/system/sync-servers', data, config),

  updateSyncServer: async (id: string, data: Partial<SyncServer>, config?: any): Promise<void> =>
    client.put(`/admin/system/sync-servers/${id}`, data, config),

  deleteSyncServer: async (id: string, config?: any): Promise<void> =>
    client.delete(`/admin/system/sync-servers/${id}`, config),
};
