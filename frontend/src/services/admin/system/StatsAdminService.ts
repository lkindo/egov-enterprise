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

    /** 요약 통계 조회 */
    async getSummary(config?: any) {
        return this.get<any>('/summary', config);
    }

    /** 접속 통계 조회 */
    async getConnectStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: any) {
        return this.get<StatsDto[]>('/connect', { ...config, params });
    }

    /** 게시판 통계 조회 */
    async getBbsStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: any) {
        return this.get<StatsDto[]>('/bbs', { ...config, params });
    }

    /** 사용자 통계 조회 */
    async getUserStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: any) {
        return this.get<StatsDto[]>('/user', { ...config, params });
    }

    /** 요청(화면) 통계 조회 */
    async getScreenStats(params?: { fromDate?: string; toDate?: string; statsKind?: string }, config?: any) {
        return this.get<StatsDto[]>('/screen', { ...config, params });
    }

    /** 메뉴 통계 조회 */
    async getMenuStats(config?: any) {
        return this.get<any[]>('/menu', config);
    }
}

export const statsAdminService = new StatsAdminService();
