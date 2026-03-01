import { AdminService } from '@/services/core/ApiService';

export interface Network {
    ntwrkId: string;
    ntwrkIp: string;
    gtwy: string;
    subnet: string;
    domnServer: string;
    manageIem: string;
    userNm: string;
    useAt: 'Y' | 'N';
    regstYmd?: string;
    lastUpdusrPnttm?: string;
}

export type NetworkServiceStatus = {
    sysNm: string;
    sysIp: string;
    sysPort: string;
    svcSttus: string;
    logDt: string;
};

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

class NetworkAdminService extends AdminService {
    constructor() {
        super('/networks');
    }

    async getNetworks(params: { page?: number; size?: number; manageIem?: string; userNm?: string }, config?: any): Promise<PageResult<Network>> {
        return this.get<PageResult<Network>>('/', { ...config, params });
    }

    async getNetwork(id: string, config?: any): Promise<Network> {
        return this.get<Network>(`/${id}`, config);
    }

    async createNetwork(data: Omit<Network, 'ntwrkId'>, config?: any): Promise<void> {
        return this.post('/', data, config);
    }

    async updateNetwork(id: string, data: Partial<Network>, config?: any): Promise<void> {
        return this.put(`/${id}`, data, config);
    }

    async deleteNetwork(id: string, config?: any): Promise<void> {
        return this.delete(`/${id}`, config);
    }

    async getNetworkLogs(params: { ntwrkId: string; page?: number; size?: number }, config?: any): Promise<PageResult<NetworkServiceStatus>> {
        return this.get<PageResult<NetworkServiceStatus>>(`/${params.ntwrkId}/logs`, { ...config, params });
    }
}

export const networkAdminService = new NetworkAdminService();
