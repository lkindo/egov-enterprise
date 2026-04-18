import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { DeptJobBxVO } from '@/types/business/deptJob';
import { AxiosRequestConfig } from 'axios';

/**
 * 부서업무 관리 서비스(User)
 * 백엔드 DeptJobApiController 연동 (/api/v1/dept-jobs)
 */
class DeptJobUserService extends UserService {
  constructor() {
    super('/dept-jobs');
  }

  /**
   * 부서 업무함 목록 조회
   */
  async getDeptJobBoxes(
    params: { 
      page?: number; 
      size?: number; 
      searchWrd?: string;
      deptId?: string;
    }, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<DeptJobBxVO>> {
    return this.get<PageResponse<DeptJobBxVO>>('/boxes', { 
      ...config, 
      params
    });
  }

  /**
   * 부서 업무함 상세 조회
   */
  async getDeptJobBox(id: string, config?: AxiosRequestConfig): Promise<DeptJobBxVO> {
    return this.get<DeptJobBxVO>(`/boxes/${id}`, config);
  }

  /**
   * 부서 업무함 등록
   */
  async createDeptJobBox(data: Partial<DeptJobBxVO>, config?: AxiosRequestConfig): Promise<string> {
    return this.post<string>('/boxes', data, config);
  }

  /**
   * 부서 업무함 수정
   */
  async updateDeptJobBox(id: string, data: Partial<DeptJobBxVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/boxes/${id}`, data, config);
  }

  /**
   * 부서 업무함 삭제
   */
  async deleteDeptJobBox(id: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/boxes/${id}`, config);
  }
}

export const deptJobUserService = new DeptJobUserService();

