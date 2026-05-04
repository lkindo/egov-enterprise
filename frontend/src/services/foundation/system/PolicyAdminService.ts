import { AdminService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';

export interface SystemPolicy {
  id?: string;
  type: string;
  title: string;
  content: string;
}

/**
 * 시스템정책 관리님쒕퉬님(Admin)
 */
class PolicyAdminService extends AdminService {
  constructor() {
    super('/policies');
  }

  /** 정책 목록 조회 */
  async getPolicies(config?: AxiosRequestConfig): Promise<SystemPolicy[]> {
    return this.get<SystemPolicy[]>('', config);
  }

  /** 정책 상세 조회 */
  async getPolicy(type: string, config?: AxiosRequestConfig): Promise<SystemPolicy> {
    return this.get<SystemPolicy>(`/${type}`, config);
  }

  /** 정책 수정 */
  async updatePolicy(type: string, data: Partial<SystemPolicy>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${type}`, data, config);
  }
}

export const policyAdminService = new PolicyAdminService();
