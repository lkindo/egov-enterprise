import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';

interface DeptAuthorBatchRequest {
  deptId: string;
  authrtId: string;
  allMembers: boolean;
  userIds?: string[];
}

interface DeptAuthorProjection {
  deptCode: string;
  deptNm: string;
  userId: string;
  userNm: string;
  authrtId: string;
  scrtyDcsnTrgtId: string;
  regYn: string;
}

/**
 * 遺님권한 관리님쒕퉬님(Admin)
 */
class DeptAuthorityAdminService extends AdminService {
  constructor() {
    super('/dept-authorities');
  }

  /** 특정 遺쒖쓽 ъ슜?먮퀎 권한 목록 조회 */
  async getDeptAuthorities(deptId: string, config?: AxiosRequestConfig): Promise<DeptAuthorProjection[]> {
    return this.get<DeptAuthorProjection[]>(`/${deptId}`, config);
  }

  /** 遺님권한 일괄 ㅼ젙 */
  async updateDeptAuthorities(data: DeptAuthorBatchRequest, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('/batch', data, config);
  }
}

export const deptAuthorityAdminService = new DeptAuthorityAdminService();
