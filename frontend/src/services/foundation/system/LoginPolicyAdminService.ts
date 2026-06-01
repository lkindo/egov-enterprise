import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

export interface LoginPolicy {
  userId: string;
  userNm: string;
  ipAddr: string;
  dpcnPrmYn: 'Y' | 'N';
  lmtYn: 'Y' | 'N';
  bgngTm?: string;
  endTm?: string;
  otpUseYn?: 'Y' | 'N';
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
        pageNo: params?.pageNo || (params?.page ? params.page + 1 : 1),
        searchKeyword: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 로그인 정책 상세 조회 */
  async getLoginPolicy(userId: string, config?: AxiosRequestConfig): Promise<LoginPolicy> {
    return this.get<LoginPolicy>(`/${userId}`, config);
  }

  /** 로그인 정책 수정(등록/수정) */
  async saveLoginPolicy(userId: string, data: Partial<LoginPolicy>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${userId}`, data, config);
  }

  /** 로그인 정책 삭제 */
  async deleteLoginPolicy(userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${userId}`, config);
  }
}

export const loginPolicyAdminService = new LoginPolicyAdminService();
