import { AdminService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';
import type { components } from '@/types/generated-api';
import {
  getPoliciesOperation,
  getPolicyOperation,
  updatePolicyOperation,
} from '@/types/generated-operations';

export type SystemPolicy = components['schemas']['Policy'];
export type PolicyUpdateRequest = components['schemas']['PolicyUpdateRequest'];

/** 시스템정책 관리 서비스(Admin). */
class PolicyAdminService extends AdminService {
  constructor() {
    super('/policies');
  }

  async getPolicies(config?: AxiosRequestConfig): Promise<SystemPolicy[]> {
    return this.executeGenerated(getPoliciesOperation, { config });
  }

  async getPolicy(type: string, config?: AxiosRequestConfig): Promise<SystemPolicy> {
    return this.executeGenerated(getPolicyOperation, { path: { type }, config });
  }

  async updatePolicy(type: string, data: PolicyUpdateRequest, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updatePolicyOperation, { path: { type }, body: data, config });
  }
}

export const policyAdminService = new PolicyAdminService();
