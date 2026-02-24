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

export const syncService = {
  /**
   * ?숆린???쒕쾭 紐⑸줉 議고쉶
   */
  getSyncServers: async () => {
    const response = await client.get('/admin/system/sync-servers');
    return response;
  },

  /**
   * ?쒕쾭 ?숆린??媛뺤젣 ?ㅽ뻾
   */
  executeSync: async (id: string) => {
    const response = await client.post(`/admin/system/sync-servers/${id}/execute`);
    return response;
  },

  /**
   * ?숆린???쒕쾭 ?앹꽦
   */
  createSyncServer: async (data: Omit<SyncServer, 'serverId'>) => {
    const response = await client.post('/admin/system/sync-servers', data);
    return response;
  },

  /**
   * ?숆린???쒕쾭 ?섏젙
   */
  updateSyncServer: async (id: string, data: Partial<SyncServer>) => {
    const response = await client.put(`/admin/system/sync-servers/${id}`, data);
    return response;
  },

  /**
   * ?숆린???쒕쾭 ??젣
   */
  deleteSyncServer: async (id: string) => {
    const response = await client.delete(`/admin/system/sync-servers/${id}`);
    return response;
  }
};

