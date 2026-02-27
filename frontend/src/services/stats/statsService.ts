import client from '@/lib/api/client';
import { StatsVO, StatsSearchParams, SummaryStats, ConnectStats, MenuStats } from '@/types/stats';

const statsService = {
    // 요약 통계 조회
    getSummary: async () => {
        return client.get<SummaryStats>('/admin/stats/summary');
    },

    // 접속 통계 조회
    getConnectStats: async (params: { startDate: string; endDate: string }) => {
        return client.get<ConnectStats[]>('/admin/stats/connect', { params });
    },

    // 메뉴 통계 조회
    getMenuStats: async () => {
        return client.get<MenuStats[]>('/admin/stats/menu');
    },

    // 사용자 통계 조회
    getUserStats: async (params: StatsSearchParams): Promise<{ list: StatsVO[]; statsVO: StatsVO }> => {
        return client.get('/admin/stats/user', { params });
    },

    // 화면 통계 조회
    getScrinStats: async (params: StatsSearchParams): Promise<{ scrinStats: StatsVO[]; statsInfo: StatsVO }> => {
        return client.get('/admin/stats/screen', { params });
    }
};

export default statsService;

