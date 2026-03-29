import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

export interface DeptAuthorBatchRequest {
  deptId: string;
  authorCode: string;
  allMembers: boolean;
  userIds?: string[];
}

export interface DeptAuthorProjection {
  deptCode: string;
  deptNm: string;
  userId: string;
  userNm: string;
  authorCode: string;
  uniqId: string;
  regYn: string;
}

/**
 * 부서 권한 관리 서비스 (Admin)
 */
class DeptAuthorityAdminService extends AdminService {
  constructor() {
    super('/dept-authorities');
  }

  /** 특정 부서의 사용자별 권한 목록 조회 */
  async getDeptAuthorities(deptId: string, config?: AxiosRequestConfig): Promise<DeptAuthorProjection[]> {
    return this.get<DeptAuthorProjection[]>(`/${deptId}`, config);
  }

  /** 부서 권한 일괄 설정 */
  async updateDeptAuthorities(data: DeptAuthorBatchRequest, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('/batch', data, config);
  }
}

export const deptAuthorityAdminService = new DeptAuthorityAdminService();
