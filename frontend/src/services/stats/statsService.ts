import client from '@/lib/api/client';
import { StatsVO, StatsSearchParams, SummaryStats, ConnectStats, MenuStats } from '@/types/stats';

const statsService = {
    // ?붿빟 ?듦퀎 議고쉶
    getSummary: async () => {
        const response = await client.get<SummaryStats>('/sts/selectSummaryStats.do');
        return response;
    },

    // ?묒냽 ?듦퀎 議고쉶
    getConnectStats: async (params: { startDate: string; endDate: string }) => {
        const response = await client.get<ConnectStats[]>('/sts/selectConnectStats.do', { params });
        return response;
    },

    // 硫붾돱 ?듦퀎 議고쉶
    getMenuStats: async () => {
        const response = await client.get<MenuStats[]>('/sts/selectMenuStats.do');
        return response;
    },

    // ?ъ슜???듦퀎 議고쉶
    getUserStats: async (params: StatsSearchParams) => {
        const response = await client.get('/sts/ust/selectUserStats.do', { params });
        return {
            success: true,
            list: response.data.list as StatsVO[],
            statsVO: response.data.statsVO as StatsVO
        };
    },

    // ?붾㈃ ?듦퀎 議고쉶
    getScrinStats: async (params: StatsSearchParams) => {
        const response = await client.get('/sts/sst/selectScrinStats.do', { params });
        return {
            success: true,
            list: response.data.scrinStats as StatsVO[],
            statsInfo: response.data.statsInfo as StatsVO
        };
    }
};

export default statsService;

