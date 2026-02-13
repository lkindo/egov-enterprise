import client from '@/lib/api/client';

export interface SyncServer {
  serverId: string;
  serverNm: string;
  serverIp: string;
  targetDrctry: string;
  syncDt: string;
  syncAt: 'Y' | 'N';
}

export const syncService = {
  /**
   * 동기화 서버 목록 조회
   */
  getSyncServers: async () => {
    const response = await client.get('/admin/system/sync-servers');
    return response.data;
  },

  /**
   * 서버 동기화 강제 실행
   */
  executeSync: async (id: string) => {
    const response = await client.post(`/admin/system/sync-servers/${id}/execute`);
    return response.data;
  }
};
