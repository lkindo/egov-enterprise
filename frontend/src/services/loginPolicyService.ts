import client from '@/lib/api/client';

export interface LoginPolicy {
    emplyrId: string;
    emplyrNm: string;
    ipInfo: string;
    dplctPermAt: 'Y' | 'N';
    lmttAt: 'Y' | 'N';
    regYn: 'Y' | 'N';
    lastUpdusrId?: string;
}

interface PageResult<T> { content: T[]; totalElements: number; totalPages: number; }

export const loginPolicyService = {
    getPolicies: async (params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<LoginPolicy>> =>
        client.get<PageResult<LoginPolicy>>('/admin/user/login-policies', {
            params: {
                pageIndex: (params.page || 0) + 1,
                searchKeyword: params.searchWrd || '',
            },
        }),

    getPolicy: async (emplyrId: string): Promise<LoginPolicy> =>
        client.get<LoginPolicy>(`/admin/user/login-policies/${emplyrId}`),

    updatePolicy: async (emplyrId: string, data: Partial<LoginPolicy>): Promise<void> =>
        client.put(`/admin/user/login-policies/${emplyrId}`, data),
};
