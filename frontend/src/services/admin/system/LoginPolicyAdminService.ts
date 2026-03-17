import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/system';

export interface LoginPolicy {
    emplyrId: string;
    emplyrNm: string;
    ipInfo: string;
    dplctPermAt: 'Y' | 'N';
    lmttAt: 'Y' | 'N';
    regYn: 'Y' | 'N';
    lastUpdusrId?: string;
}

/**
 * 로그인 정책 관리 서비스 (Admin)
 */
class LoginPolicyAdminService extends AdminService {
    constructor() {
        super('/login-policies');
    }

    /** 로그인 정책 목록 조회 */
    async getLoginPolicyList(params?: SearchParams, config?: any): Promise<PageResponse<LoginPolicy>> {
        return this.get<PageResponse<LoginPolicy>>('', {
            ...config,
            params: {
                ...params,
                pageIndex: params?.pageIndex || (params?.page ? params.page + 1 : 1),
                searchKeyword: params?.searchKeyword || params?.searchWrd || '',
            },
        });
    }

    /** 로그인 정책 상세 조회 */
    async getLoginPolicy(emplyrId: string, config?: any): Promise<LoginPolicy> {
        return this.get<LoginPolicy>(`/${emplyrId}`, config);
    }

    /** 로그인 정책 저장 (등록/수정) */
    async saveLoginPolicy(emplyrId: string, data: Partial<LoginPolicy>, config?: any): Promise<void> {
        return this.put(`/${emplyrId}`, data, config);
    }

    /** 로그인 정책 삭제 */
    async deleteLoginPolicy(emplyrId: string, config?: any): Promise<void> {
        return this.delete(`/${emplyrId}`, config);
    }
}

export const loginPolicyAdminService = new LoginPolicyAdminService();
