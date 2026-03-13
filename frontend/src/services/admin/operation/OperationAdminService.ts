import client from '@/lib/api/client';

const BASE_URL = '/admin/operation';

export const operationAdminService = {
    // 외부인사정보
    getExternalHrList: async (params?: any): Promise<any[]> => {
        return client.get<any[]>(`${BASE_URL}/external-hr`, { params });
    },
    createExternalHr: async (data: any): Promise<any> => {
        return client.post<any>(`${BASE_URL}/external-hr`, data);
    },

    // 포상관리
    getRewardList: async (params?: any): Promise<any[]> => {
        return client.get<any[]>(`${BASE_URL}/rewards`, { params });
    },
    createReward: async (data: any): Promise<any> => {
        return client.post<any>(`${BASE_URL}/rewards`, data);
    }
};
