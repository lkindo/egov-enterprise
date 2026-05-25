import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

/**
 * 정책 정보 DTO
 */
export interface PolicyDto {
  plcyTypeCd?: string;
  plcyTtl?: string;
  plcyCn?: string;
}

class PolicyAdminService extends AdminService {
  constructor() {
    super('/policies');
  }

  /** 정책 이용 조회 */
  async getPolicy(type: 'privacy' | 'copyright', config?: AxiosRequestConfig) {
    return this.get<PolicyDto>(`/${type}`, config);
  }

  /** 정책 이용 수정 */
  async updatePolicy(type: 'privacy' | 'copyright', dto: Partial<PolicyDto>, config?: AxiosRequestConfig) {
    return this.put<void>(`/${type}`, dto, config);
  }
}

export const policyAdminService = new PolicyAdminService();
