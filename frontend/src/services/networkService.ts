import client from '@/lib/api/client';

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

export const networkService = {
    getNetworks: async (params: { page?: number; size?: number; manageIem?: string; userNm?: string }, config?: any): Promise<PageResult<Network>> =>
        client.get<PageResult<Network>>('/admin/system/networks', { ...config, params }),

    getNetwork: async (id: string, config?: any): Promise<Network> =>
        client.get<Network>(`/admin/system/networks/${id}`, config),

    createNetwork: async (data: Omit<Network, 'ntwrkId'>, config?: any): Promise<void> =>
        client.post('/admin/system/networks', data, config),

    updateNetwork: async (id: string, data: Partial<Network>, config?: any): Promise<void> =>
        client.put(`/admin/system/networks/${id}`, data, config),

    deleteNetwork: async (id: string, config?: any): Promise<void> =>
        client.delete(`/admin/system/networks/${id}`, config),

    getNetworkLogs: async (params: { ntwrkId: string; page?: number; size?: number }, config?: any): Promise<PageResult<NetworkServiceStatus>> =>
        client.get<PageResult<NetworkServiceStatus>>(`/admin/system/networks/${params.ntwrkId}/logs`, { ...config, params }),
};
