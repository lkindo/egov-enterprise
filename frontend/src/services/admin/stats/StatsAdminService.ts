import { ApiService } from '@/services/core/ApiService';
import { ConnectStats, MenuStats, SummaryStats, StatsVO, StatsSearchParams } from '@/types/stats';
import { AxiosRequestConfig } from 'axios';

/**
 * 통계 관리 서비스 (Admin)
 */
class StatsAdminService extends ApiService {
    constructor() {
        super('/admin/stats');
    }

    /**
     * 관리자 대시보드 요약 정보 조회
     */
    async getAdminSummary(config?: AxiosRequestConfig): Promise<SummaryStats> {
        return this.get<SummaryStats>('/summary', config);
    }

    /**
     * 접속 통계 조회
     */
    async getAdminConnectStats(params: { startDate: string; endDate: string }, config?: AxiosRequestConfig): Promise<ConnectStats[]> {
        return this.get<ConnectStats[]>('/connect', { ...config, params });
    }

    /**
     * 메뉴별 이용 통계 조회
     */
    async getAdminMenuStats(config?: AxiosRequestConfig): Promise<MenuStats[]> {
        return this.get<MenuStats[]>('/menu', config);
    }

    /**
     * 사용자별 이용 통계 조회
     */
    async getUserStats(params: StatsSearchParams, config?: AxiosRequestConfig): Promise<{ list: StatsVO[]; statsVO: StatsVO }> {
        return this.get<{ list: StatsVO[]; statsVO: StatsVO }>('/user', { ...config, params });
    }

    /**
     * 화면별 이용 통계 조회
     */
    async getScrinStats(params: StatsSearchParams, config?: AxiosRequestConfig): Promise<{ scrinStats: StatsVO[]; statsInfo: StatsVO }> {
        return this.get<{ scrinStats: StatsVO[]; statsInfo: StatsVO }>('/screen', { ...config, params });
    }

    // --- Legacy / Compatibility ---
    /** @deprecated Use getAdminSummary */
    async getSummary(config?: AxiosRequestConfig): Promise<SummaryStats> {
        return this.get<SummaryStats>('/summary', config);
    }
}

export const statsAdminService = new StatsAdminService();
