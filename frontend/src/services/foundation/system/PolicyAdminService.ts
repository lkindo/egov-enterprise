import { AdminService } from '@/services/core/ApiService';

export interface SystemPolicy {
  type: string;
  title: string;
  content: string;
}

/**
 * 시스템 정책 관리 서비스 (Admin)
 */
class PolicyAdminService extends AdminService {
  constructor() {
    super('/system/policies');
  }

  /** 정책 목록 조회 */
  async getPolicies(config?: any): Promise<SystemPolicy[]> {
    return this.get<SystemPolicy[]>('', config);
  }

  /** 정책 상세 조회 */
  async getPolicy(type: string, config?: any): Promise<SystemPolicy> {
    return this.get<SystemPolicy>(`/${type}`, config);
  }

  /** 정책 수정 */
  async updatePolicy(type: string, data: Partial<SystemPolicy>, config?: any): Promise<void> {
    return this.put(`/${type}`, data, config);
  }
}

export const policyAdminService = new PolicyAdminService();
