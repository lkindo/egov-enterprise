import client from '@/lib/api/client';

/**
 * 네트워크 인프라 관리 서비스 (Admin)
 */
export interface Network {
    ntwrkId: string;
    manageIem: string;
    ntwrkIp: string;
    gtwy: string;
    subnet: string;
    domnServer: string;
    userNm: string;
    useAt: string;
}

const BASE_URL = '/admin/system/network';

export const networkAdminService = {
    /** 네트워크 목록 조회 */
    getNetworks: async (params?: any, config?: any) => {
        return client.get<Network[]>(BASE_URL, { params, ...config });
    },

    /** 네트워크 등록 */
    createNetwork: async (data: Network, config?: any) => {
        return client.post(BASE_URL, data, config);
    },

    /** 네트워크 수정 */
    updateNetwork: async (id: string, data: Partial<Network>, config?: any) => {
        return client.put(`${BASE_URL}/${id}`, data, config);
    },

    /** 네트워크 삭제 */
    deleteNetwork: async (id: string, config?: any) => {
        return client.delete(`${BASE_URL}/${id}`, config);
    },
};
