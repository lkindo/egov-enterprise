import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 遺님?뺣낫 DTO
 */
export interface DeptDto {
  orgnztId?: string;
  orgnztNm: string;
  orgnztDc: string;
}

class DeptAdminService extends AdminService {
  constructor() {
    super('/depts');
  }

  /** 遺님紐⑸줉 ?섏씠吏조회 */
  async getDeptList(params?: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<DeptDto>>('', { ...config, params });
  }

  /** 遺님상세 조회 */
  async getDept(deptId: string, config?: AxiosRequestConfig) {
    return this.get<DeptDto>(`/${deptId}`, config);
  }

  /** 遺님등록 */
  async createDept(dto: DeptDto, config?: AxiosRequestConfig) {
    return this.post<void>('', dto, config);
  }

  /** 遺님?섏젙 */
  async updateDept(deptId: string, dto: DeptDto, config?: AxiosRequestConfig) {
    return this.put<void>(`/${deptId}`, dto, config);
  }

  /** 遺님님젣 */
  async deleteDept(deptId: string, config?: AxiosRequestConfig) {
    return this.delete<void>(`/${deptId}`, config);
  }
}

export const deptAdminService = new DeptAdminService();
