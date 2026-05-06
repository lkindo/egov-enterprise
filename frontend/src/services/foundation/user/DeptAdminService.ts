import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';

/**
 * 부서 정보 DTO
 */
export interface DeptDto {
  orgnztId?: string;
  orgnztNm: string;
  orgnztDc: string;
}

class DeptAdminService extends AdminService {
  constructor() {
    super('/departments');
  }

  /** 부서 목록 페이지 조회 */
  async getDeptList(params?: { keyword?: string; page?: number; size?: number }, config?: AxiosRequestConfig) {
    return this.get<PageResponse<DeptDto>>('', { ...config, params });
  }

  /** 부서 상세 조회 */
  async getDept(deptId: string, config?: AxiosRequestConfig) {
    return this.get<DeptDto>(`/${deptId}`, config);
  }

  /** 부서 등록 */
  async createDept(dto: DeptDto, config?: AxiosRequestConfig) {
    return this.post<void>('', dto, config);
  }

  /** 부서 수정 */
  async updateDept(deptId: string, dto: DeptDto, config?: AxiosRequestConfig) {
    return this.put<void>(`/${deptId}`, dto, config);
  }

  /** 부서 삭제 */
  async deleteDept(deptId: string, config?: AxiosRequestConfig) {
    return this.delete<void>(`/${deptId}`, config);
  }

  /** 부서 계층 및 순서 일괄 수정 (현대화 트리 대응) */
  async updateDeptHierarchy(data: any[], config?: AxiosRequestConfig) {
    return this.put<void>('/batch-hierarchy', data, { ...config, timeout: 60000 });
  }
}

export const deptAdminService = new DeptAdminService();
