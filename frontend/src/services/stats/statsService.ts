import client from '@/lib/api/client';
import { StatsVO, StatsSearchParams, SummaryStats, ConnectStats, MenuStats } from '@/types/stats';

const statsService = {
    // 요약 통계 조회
    getSummary: async () => {
        const response = await client.get<SummaryStats>('/sts/selectSummaryStats.do');
        return response.data;
    },

    // 접속 통계 조회
    getConnectStats: async (params: { startDate: string; endDate: string }) => {
        const response = await client.get<ConnectStats[]>('/sts/selectConnectStats.do', { params });
        return response.data;
    },

    // 메뉴 통계 조회
    getMenuStats: async () => {
        const response = await client.get<MenuStats[]>('/sts/selectMenuStats.do');
        return response.data;
    },

    // 사용자 통계 조회
    getUserStats: async (params: StatsSearchParams) => {
        const response = await client.get('/sts/ust/selectUserStats.do', { params });
        return {
            success: true,
            list: response.data.list as StatsVO[],
            statsVO: response.data.statsVO as StatsVO
        };
    },

    // 화면 통계 조회
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
