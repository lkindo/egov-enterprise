import client from '@/lib/api/client';

/**
 * 통계 관리 서비스 (Admin)
 * 백엔드: com.company.project.api.controller.stats.StatisticsApiController
 */
export interface StatsDto {
    statsDate: string;
    statsCo: number;
    creatCo: number;
    inqireCo: number;
    updtCo: number;
    deleteCo: number;
    errorCo: number;
    [key: string]: any;
}

const BASE_URL = '/admin/stats';

export const statsAdminService = {
    /** 접속 통계 조회 */
    getConnectStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }) => {
        return client.get<StatsDto[]>(`${BASE_URL}/connect`, { params });
    },

    /** 게시물 통계 조회 */
    getBbsStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }) => {
        return client.get<StatsDto[]>(`${BASE_URL}/bbs`, { params });
    },

    /** 사용자 통계 조회 */
    getUserStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }) => {
        return client.get<StatsDto[]>(`${BASE_URL}/user`, { params });
    },
};