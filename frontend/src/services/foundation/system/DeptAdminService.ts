import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

export interface Department {
  ognzId: string;
  ognzNm: string;
  ognzExpln?: string;
}

/**
 * 遺님관리님쒕퉬님(Admin)
 */
class DeptAdminService extends AdminService {
  constructor() {
    super('/departments');
  }

  /** 遺님목록 조회 */
  async getDeptList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Department>> {
    return this.get<PageResponse<Department>>('', { ...config, params });
  }

  /** 遺상세 조회 */
  async getDept(deptId: string, config?: AxiosRequestConfig): Promise<Department> {
    return this.get<Department>(`/${deptId}`, config);
  }

  /** 遺님등록 */
  async createDept(data: Partial<Department>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /** 遺님수정 */
  async updateDept(deptId: string, data: Partial<Department>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${deptId}`, data, config);
  }

  /** 遺...젣 */
  async deleteDept(deptId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${deptId}`, config);
  }
}

export const deptAdminService = new DeptAdminService();
