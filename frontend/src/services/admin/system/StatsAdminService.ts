import client from '@/lib/api/client';

/**
 * 통계 관리 서비스 (Admin)
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
    getConnectStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: any) => {
        return client.get<StatsDto[]>(`${BASE_URL}/connect`, { params, ...config });
    },

    /** 게시판 통계 조회 */
    getBbsStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: any) => {
        return client.get<StatsDto[]>(`${BASE_URL}/bbs`, { params, ...config });
    },

    /** 사용자 통계 조회 */
    getUserStats: async (params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: any) => {
        return client.get<StatsDto[]>(`${BASE_URL}/user`, { params, ...config });
    },

    /** 요약 정보 조회 */
    getSummary: async (config?: any) => {
        return client.get(`${BASE_URL}/summary`, config);
    },

    /** 메뉴 통계 조회 */
    getMenuStats: async (config?: any) => {
        return client.get(`${BASE_URL}/menu`, config);
    }
};
