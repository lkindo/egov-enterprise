import client from '@/lib/api/client';
import { StatsVO, StatsSearchParams, SummaryStats, ConnectStats, MenuStats } from '@/types/stats';

const statsService = {
    // 요약 통계 조회
    getSummary: async () => {
        const response = await client.get<SummaryStats>('/sts/selectSummaryStats.do');
        return response;
    },

    // 접속 통계 조회
    getConnectStats: async (params: { startDate: string; endDate: string }) => {
        const response = await client.get<ConnectStats[]>('/sts/selectConnectStats.do', { params });
        return response;
    },

    // 메뉴 통계 조회
    getMenuStats: async () => {
        const response = await client.get<MenuStats[]>('/sts/selectMenuStats.do');
        return response;
    },

    // 사용자 통계 조회
    getUserStats: async (params: StatsSearchParams): Promise<{ list: StatsVO[]; statsVO: StatsVO }> => {
        return client.get('/sts/ust/selectUserStats.do', { params });
    },

    // 화면 통계 조회
    getScrinStats: async (params: StatsSearchParams): Promise<{ scrinStats: StatsVO[]; statsInfo: StatsVO }> => {
        return client.get('/sts/sst/selectScrinStats.do', { params });
    }
};

export default statsService;

