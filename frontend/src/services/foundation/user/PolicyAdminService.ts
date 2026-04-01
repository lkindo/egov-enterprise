import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * ?뺤콉 ?뺣낫 DTO
 */
export interface PolicyDto {
  type: string;
  title: string;
  content: string;
}

class PolicyAdminService extends AdminService {
  constructor() {
    super('/policies');
  }

  /** ?뺤콉 ?댁슜 조회 */
  async getPolicy(type: 'privacy' | 'copyright', config?: AxiosRequestConfig) {
    return this.get<PolicyDto>(`/${type}`, config);
  }

  /** ?뺤콉 ?댁슜 ?섏젙 */
  async updatePolicy(type: 'privacy' | 'copyright', dto: Partial<PolicyDto>, config?: AxiosRequestConfig) {
    return this.put<void>(`/${type}`, dto, config);
  }
}

export const policyAdminService = new PolicyAdminService();
