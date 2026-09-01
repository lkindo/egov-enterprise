import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import type { GeneratedOperationRequest } from '@/types/generated-operations';
import {
  deleteLoginPolicyOperation,
  getLoginPolicyListOperation,
  getLoginPolicyOperation,
  updateLoginPolicyOperation,
} from '@/types/generated-operations';

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
  lastMdfrId?: string;
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
    const pageIndex = params?.pageIndex
      ?? params?.pageNo
      ?? (params?.page !== undefined ? params.page + 1 : 1);
    const recordCountPerPage = typeof params?.recordCountPerPage === 'number'
      ? params.recordCountPerPage
      : undefined;
    const pageUnit = params?.pageUnit
      ?? recordCountPerPage
      ?? params?.size
      ?? (typeof params?.pageSize === 'number' ? params.pageSize : undefined);
    const generatedConfig = config ? { ...config } : undefined;
    if (generatedConfig) delete generatedConfig.params;
    return this.executeGenerated(getLoginPolicyListOperation, {
      query: {
        pageIndex,
        ...(pageUnit !== undefined ? { pageUnit } : {}),
        ...(params?.searchCondition !== undefined ? { searchCondition: params.searchCondition } : {}),
        searchKeyword: params?.searchKeyword || params?.searchWrd || '',
      },
      config: generatedConfig,
    }) as Promise<PageResponse<LoginPolicy>>;
  }

  /** 로그인 정책 상세 조회 */
  async getLoginPolicy(userId: string, config?: AxiosRequestConfig): Promise<LoginPolicy> {
    return this.executeGenerated(getLoginPolicyOperation, {
      path: { userId },
      config,
    }) as Promise<LoginPolicy>;
  }

  /** 로그인 정책 수정(등록/수정) */
  async saveLoginPolicy(userId: string, data: Partial<LoginPolicy>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateLoginPolicyOperation, {
      path: { userId },
      body: { ...data, userId } as GeneratedOperationRequest<'updateLoginPolicy'>,
      config,
    });
  }

  /** 로그인 정책 삭제 */
  async deleteLoginPolicy(userId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteLoginPolicyOperation, {
      path: { userId },
      config,
    });
  }
}

export const loginPolicyAdminService = new LoginPolicyAdminService();
