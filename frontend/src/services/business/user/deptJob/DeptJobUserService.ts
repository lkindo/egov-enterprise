import { UserService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { DeptJobVO, DeptJobBxVO } from '@/types/business/deptJob';
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

  /**
   * 부서 업무 목록 조회
   */
  async getDeptJobList(
    params: { 
      page?: number; 
      size?: number; 
      searchWrd?: string;
      deptJobbxId?: string;
    }, 
    config?: AxiosRequestConfig
  ): Promise<PageResponse<DeptJobVO>> {
    return this.get<PageResponse<DeptJobVO>>('', { 
      ...config, 
      params 
    });
  }

  /**
   * 부서 업무 상세 조회
   */
  async getDeptJob(id: string, config?: AxiosRequestConfig): Promise<DeptJobVO> {
    return this.get<DeptJobVO>(`/${id}`, config);
  }

  /**
   * 부서 업무 등록
   */
  async createDeptJob(data: Partial<DeptJobVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.post<void>('', data, config);
  }

  /**
   * 부서 업무 수정
   */
  async updateDeptJob(id: string, data: Partial<DeptJobVO>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${id}`, data, config);
  }

  /**
   * 부서 업무 삭제
   */
  async deleteDeptJob(id: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${id}`, config);
  }
}

export const deptJobUserService = new DeptJobUserService();

// Individual function exports for legacy/functional styles
export const getDeptJobBoxes = deptJobUserService.getDeptJobBoxes.bind(deptJobUserService);
export const getDeptJobBox = deptJobUserService.getDeptJobBox.bind(deptJobUserService);
export const createDeptJobBox = deptJobUserService.createDeptJobBox.bind(deptJobUserService);
export const updateDeptJobBox = deptJobUserService.updateDeptJobBox.bind(deptJobUserService);
export const deleteDeptJobBox = deptJobUserService.deleteDeptJobBox.bind(deptJobUserService);

export const getDeptJobList = deptJobUserService.getDeptJobList.bind(deptJobUserService);
export const getDeptJob = deptJobUserService.getDeptJob.bind(deptJobUserService);
export const createDeptJob = deptJobUserService.createDeptJob.bind(deptJobUserService);
export const updateDeptJob = deptJobUserService.updateDeptJob.bind(deptJobUserService);
export const deleteDeptJob = deptJobUserService.deleteDeptJob.bind(deptJobUserService);
