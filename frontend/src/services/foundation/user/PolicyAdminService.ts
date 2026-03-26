import { AdminService } from '@/services/core/ApiService';

/**
 * 정책 정보 DTO
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

 /** 정책 내용 조회 */
 async getPolicy(type: 'privacy' | 'copyright', config?: any) {
 return this.get<PolicyDto>(`/${type}`, config);
 }

 /** 정책 내용 수정 */
 async updatePolicy(type: 'privacy' | 'copyright', dto: Partial<PolicyDto>, config?: any) {
 return this.put<void>(`/${type}`, dto, config);
 }
}

export const policyAdminService = new PolicyAdminService();
