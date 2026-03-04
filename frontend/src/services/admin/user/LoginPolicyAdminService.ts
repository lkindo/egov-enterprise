import { ApiService } from '@/services/core/ApiService';

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

class LoginPolicyAdminService extends ApiService {
    constructor() {
        super('/admin/user/login-policies'); // Note: not /admin/system, so extending ApiService with explicit path
    }

    async getPolicies(params: { page?: number; size?: number; searchWrd?: string }): Promise<PageResult<LoginPolicy>> {
        return this.get<PageResult<LoginPolicy>>('', {
            params: {
                pageIndex: (params.page || 0) + 1,
                searchKeyword: params.searchWrd || '',
            },
        });
    }

    async getPolicy(emplyrId: string): Promise<LoginPolicy> {
        return this.get<LoginPolicy>(`/${emplyrId}`);
    }

    async updatePolicy(emplyrId: string, data: Partial<LoginPolicy>): Promise<void> {
        return this.put(`/${emplyrId}`, data);
    }
}

export const loginPolicyAdminService = new LoginPolicyAdminService();
