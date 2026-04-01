import { AdminService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';

export interface SystemPolicy {
  id?: string;
  type: string;
  title: string;
  content: string;
}

/**
 * ?쒖뒪님?뺤콉 愿由님쒕퉬님(Admin)
 */
class PolicyAdminService extends AdminService {
  constructor() {
    super('/policies');
  }

  /** ?뺤콉 紐⑸줉 조회 */
  async getPolicies(config?: AxiosRequestConfig): Promise<SystemPolicy[]> {
    return this.get<SystemPolicy[]>('', config);
  }

  /** ?뺤콉 ?곸꽭 조회 */
  async getPolicy(type: string, config?: AxiosRequestConfig): Promise<SystemPolicy> {
    return this.get<SystemPolicy>(`/${type}`, config);
  }

  /** ?뺤콉 ?섏젙 */
  async updatePolicy(type: string, data: Partial<SystemPolicy>, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${type}`, data, config);
  }
}

export const policyAdminService = new PolicyAdminService();
