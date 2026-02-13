import client from '@/lib/api/client';
import { ConnectStats, MenuStats, SummaryStats } from '@/types/stats';

export const statsService = {
  /**
   * 접속 통계 조회
   */
  getConnectStats: async (params: { startDate: string; endDate: string }) => {
    const response = await client.get<ConnectStats[]>('/stats/connect', { params });
    return response.data;
  },

  /**
   * 메뉴별 사용 통계
   */
  getMenuStats: async () => {
    const response = await client.get<MenuStats[]>('/stats/menu');
    return response.data;
  },

  /**
   * 시스템 요약 정보 (Admin Dashboard용)
   */
  getSummary: async () => {
    const response = await client.get<SummaryStats>('/admin/dashboard/summary');
    return response.data;
  }
};
