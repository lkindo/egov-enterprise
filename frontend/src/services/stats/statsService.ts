import client from '@/lib/api/client';
import { StatsVO, StatsSearchParams } from '@/types/stats';

const statsService = {
    // 사용자 통계 조회
    getUserStats: async (params: StatsSearchParams) => {
        const response = await client.get('/sts/ust/selectUserStats.do', { params });
        return {
            success: true,
            list: response.data.list as StatsVO[], // 백엔드 응답 구조에 맞춰 조정 필요
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
