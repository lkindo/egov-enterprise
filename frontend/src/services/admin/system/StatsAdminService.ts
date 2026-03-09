import client from '@/lib/api/client';

/**
 * ?????온????뺥돩??(Admin)
 * 獄쏄퉮肉?? com.company.project.api.controller.stats.StatisticsApiController
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
    /** ?臾믩꺗 ????鈺곌퀬??*/
    getConnectStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }) => {
        return client.get<StatsDto[]>(`${BASE_URL}/connect`, { params });
    },

    /** 野껊슣?녻눧?????鈺곌퀬??*/
    getBbsStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }) => {
        return client.get<StatsDto[]>(`${BASE_URL}/bbs`, { params });
    },

    /** ?????????鈺곌퀬??*/
    getUserStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }) => {
        return client.get<StatsDto[]>(`${BASE_URL}/user`, { params });
    },
};
