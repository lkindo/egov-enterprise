import { ApiService } from '@/services/core/ApiService';
import { ConnectStats, MenuStats, SummaryStats, StatsVO, StatsSearchParams } from '@/types/stats';

class StatsAdminService extends ApiService {
    constructor() {
        super(''); // Endpoints have different base paths
    }

    // Summary stats (legacy)
    async getSummary(config?: any): Promise<SummaryStats> {
        return this.get<SummaryStats>('/admin/dashboard/summary', config);
    }

    // Summary stats (new)
    async getAdminSummary(config?: any): Promise<SummaryStats> {
        return this.get<SummaryStats>('/admin/stats/summary', config);
    }

    // Connection stats (legacy)
    async getConnectStats(params: { startDate: string; endDate: string }, config?: any): Promise<ConnectStats[]> {
        return this.get<ConnectStats[]>('/stats/connect', { ...config, params });
    }

    // Connection stats (new)
    async getAdminConnectStats(params: { startDate: string; endDate: string }, config?: any): Promise<ConnectStats[]> {
        return this.get<ConnectStats[]>('/admin/stats/connect', { ...config, params });
    }

    // Menu stats (legacy)
    async getMenuStats(config?: any): Promise<MenuStats[]> {
        return this.get<MenuStats[]>('/stats/menu', config);
    }

    // Menu stats (new)
    async getAdminMenuStats(config?: any): Promise<MenuStats[]> {
        return this.get<MenuStats[]>('/admin/stats/menu', config);
    }

    // User stats
    async getUserStats(params: StatsSearchParams, config?: any): Promise<{ list: StatsVO[]; statsVO: StatsVO }> {
        return this.get('/admin/stats/user', { ...config, params });
    }

    // Screen stats
    async getScrinStats(params: StatsSearchParams, config?: any): Promise<{ scrinStats: StatsVO[]; statsInfo: StatsVO }> {
        return this.get('/admin/stats/screen', { ...config, params });
    }
}

export const statsAdminService = new StatsAdminService();