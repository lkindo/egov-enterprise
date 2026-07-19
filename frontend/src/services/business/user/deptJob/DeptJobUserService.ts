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
      /** 1-based 페이지 번호 */
      pageIndex?: number;
      /** 페이지당 건수 */
      pageUnit?: number;
      searchWrd?: string;
      /** '0' 업무명 · '1' 업무내용 · '2' 담당자. 미지정 시 서버가 업무명으로 처리한다. */
      searchCondition?: string;
      deptJobbxId?: string;
      deptId?: string;
    },
    config?: AxiosRequestConfig
  ): Promise<PageResponse<DeptJobVO>> {
    // ⚠ page/size 로 보내지 않는다. ApiService 의 자동 매핑은 size → recordCountPerPage 인데
    //   이 엔드포인트(및 형제 /boxes)는 pageUnit 을 읽으므로, 자동 매핑에 기대면 페이지 크기가
    //   조용히 무시되고 서버 기본값 10건에 고정된다. 서버가 실제로 읽는 이름으로 직접 보낸다.
    return this.get<PageResponse<DeptJobVO>>('', {
      ...config,
      params: {
        pageIndex: params.pageIndex ?? 1,
        pageUnit: params.pageUnit ?? 10,
        ...(params.searchWrd ? { searchWrd: params.searchWrd } : {}),
        ...(params.searchCondition ? { searchCondition: params.searchCondition } : {}),
        ...(params.deptJobbxId ? { deptJobbxId: params.deptJobbxId } : {}),
        ...(params.deptId ? { deptId: params.deptId } : {}),
      },
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
  async createDeptJob(data: Partial<DeptJobVO>, config?: AxiosRequestConfig): Promise<string> {
    // 서버가 채번한 식별자를 돌려준다(등록 직후 상세로 이동하기 위해 필요).
    return this.post<string>('', data, config);
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
