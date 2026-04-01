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
 * 濡쒓렇님?뺤콉 愿由님쒕퉬님(Admin)
 */
class LoginPolicyAdminService extends AdminService {
  constructor() {
    super('/login-policies');
  }

  /** 濡쒓렇님?뺤콉 紐⑸줉 조회 */
  async getLoginPolicyList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LoginPolicy>> {
    return this.get<PageResponse<LoginPolicy>>('', {
      ...config,
      params: {
        ...params,
        page踰덊샇: params?.page踰덊샇 || (params?.page ? params.page + 1 : 1),
        searchKeyword: params?.searchKeyword || params?.searchWrd || '',
      },
    });
  }

  /** 濡쒓렇님?뺤콉 ?곸꽭 조회 */
  async getLoginPolicy(emplyrId: string, config?: AxiosRequestConfig): Promise<LoginPolicy> {
    return this.get<LoginPolicy>(`/${emplyrId}`, config);
  }

  /** 濡쒓렇님?뺤콉 ?님(등록/?섏젙) */
  async saveLoginPolicy(emplyrId: string, data: Partial<LoginPolicy>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${emplyrId}`, data, config);
  }

  /** 濡쒓렇님?뺤콉 님젣 */
  async deleteLoginPolicy(emplyrId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete(`/${emplyrId}`, config);
  }
}

export const loginPolicyAdminService = new LoginPolicyAdminService();
