import { AdminService } from '@/services/core/ApiService';
import type { AxiosRequestConfig } from 'axios';

export interface SystemPolicy {
  plcyTypeCd?: string;
  plcyTtl?: string;
  plcyCn?: string;
}

/**
 * 정책 수정 요청 본문
 * 백엔드 PolicyUpdateRequest(plcyTtl/plcyCn, 둘 다 필수)와 1:1로 대응한다.
 * Partial<SystemPolicy>로 두면 필드 누락·오타가 컴파일 타임에 걸러지지 않아 계약을 좁힌다.
 */
export interface PolicyUpdateRequest {
  plcyTtl: string;
  plcyCn: string;
}

/**
 * 시스템정책 관리 서비스(Admin)
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
  async updatePolicy(type: string, data: PolicyUpdateRequest, config?: AxiosRequestConfig): Promise<void> {
    return this.put(`/${type}`, data, config);
  }
}

export const policyAdminService = new PolicyAdminService();
