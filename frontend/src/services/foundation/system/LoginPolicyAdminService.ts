import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

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
  async getLoginPolicyList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LoginPolicy>> {
    return this.get<PageResponse<LoginPolicy>>('', {
      ...config,
      params: {
        ...params,
        page번호: params?.page번호 || (params?.page ? params.page + 1 : 1),
        searchKeyword: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 로그인 정책 상세 조회 */
  async getLoginPolicy(emplyrId: string, config?: AxiosRequestConfig): Promise<LoginPolicy> {
    return this.get<LoginPolicy>(`/${emplyrId}`, config);
  }

  /** 로그인 정책 저장 (등록/수정) */
  async saveLoginPolicy(emplyrId: string, data: Partial<LoginPolicy>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${emplyrId}`, data, config);
  }

  /** 로그인 정책 삭제 */
  async deleteLoginPolicy(emplyrId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${emplyrId}`, config);
  }
}

export const loginPolicyAdminService = new LoginPolicyAdminService();
