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
 * 遺님沅뚰븳 관리님쒕퉬님(Admin)
 */
class DeptAuthorityAdminService extends AdminService {
  constructor() {
    super('/dept-authorities');
  }

  /** ?뱀젙 遺쒖쓽 ъ슜?먮퀎 沅뚰븳 紐⑸줉 조회 */
  async getDeptAuthorities(deptId: string, config?: AxiosRequestConfig): Promise<DeptAuthorProjection[]> {
    return this.get<DeptAuthorProjection[]>(`/${deptId}`, config);
  }

  /** 遺님沅뚰븳 ?쇨큵 ㅼ젙 */
  async updateDeptAuthorities(data: DeptAuthorBatchRequest, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('/batch', data, config);
  }
}

export const deptAuthorityAdminService = new DeptAuthorityAdminService();
