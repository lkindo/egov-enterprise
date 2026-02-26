import client from '@/lib/api/client';
import { ConnectStats, MenuStats, SummaryStats } from '@/types/stats';

export const statsService = {
  getConnectStats: async (params: { startDate: string; endDate: string }, config?: any) => {
    return client.get<ConnectStats[]>('/stats/connect', { ...config, params });
  },

  getMenuStats: async (config?: any) => {
    return client.get<MenuStats[]>('/stats/menu', config);
  },

  getSummary: async (config?: any) => {
    return client.get<SummaryStats>('/admin/dashboard/summary', config);
  }
};

