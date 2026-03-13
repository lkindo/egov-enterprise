import { AdminService } from '@/services/core/ApiService';

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

class StatsAdminService extends AdminService {
    constructor() {
        super('/statistics');
    }

    /** 접속 통계 조회 */
    async getConnectStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }) {
        return this.get<StatsDto[]>('/connect', { params });
    }

    /** 게시판 통계 조회 */
    async getBbsStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }) {
        return this.get<StatsDto[]>('/bbs', { params });
    }

    /** 사용자 통계 조회 */
    async getUserStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }) {
        return this.get<StatsDto[]>('/user', { params });
    }

    /** 요청(화면) 통계 조회 */
    async getScreenStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }) {
        return this.get<StatsDto[]>('/screen', { params });
    }
}

export const statsAdminService = new StatsAdminService();
