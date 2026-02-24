import client from '@/lib/api/client';
import { ConnectStats, MenuStats, SummaryStats } from '@/types/stats';

export const statsService = {
  /**
   * ?묒냽 ?듦퀎 議고쉶
   */
  getConnectStats: async (params: { startDate: string; endDate: string }) => {
    const response = await client.get<ConnectStats[]>('/stats/connect', { params });
    return response;
  },

  /**
   * 硫붾돱蹂??ъ슜 ?듦퀎
   */
  getMenuStats: async () => {
    const response = await client.get<MenuStats[]>('/stats/menu');
    return response;
  },

  /**
   * ?쒖뒪???붿빟 ?뺣낫 (Admin Dashboard??
   */
  getSummary: async () => {
    const response = await client.get<SummaryStats>('/admin/dashboard/summary');
    return response;
  }
};

