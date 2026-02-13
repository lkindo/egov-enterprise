import client from '@/lib/api/client';

export interface NetworkServiceStatus {
  sysIp: string;
  sysPort: string;
  sysNm: string;
  svcSttus: string; // 01:정상, 02:비정상
  logDt: string;
}

export const networkService = {
  /**
   * 네트워크 서비스 모니터링 로그 조회
   */
  getNetworkLogs: async (params: { page?: number; size?: number; searchWrd?: string }) => {
    const response = await client.get('/admin/system/monitoring/network/logs', { params });
    return response.data;
  },

  /**
   * 실시간 상태 체크 실행
   */
  checkNow: async (serverId: string) => {
    const response = await client.post(`/admin/system/monitoring/network/check?serverId=${serverId}`);
    return response.data;
  }
};
