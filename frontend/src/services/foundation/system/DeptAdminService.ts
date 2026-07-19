import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';

export interface Department {
  ognzId: string;
  ognzNm: string;
  ognzExpln?: string;
  /** 상위 부서 ID. 없으면 최상위(루트). [V2_26] */
  upOgnzId?: string;
  /** 동일 상위 내 정렬 순서. [V2_26] */
  sortOrdr?: number;
}

/** 부서(조직) 관리 API 클라이언트 — /api/v1/admin/system/departments */
class DeptAdminService extends AdminService {
  constructor() {
    super('/departments');
  }

  /** 부서 목록 조회 */
  async getDeptList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Department>> {
    return this.get<PageResponse<Department>>('', { ...config, params });
  }

  /** 부서 상세 조회 */
  async getDept(deptId: string, config?: AxiosRequestConfig): Promise<Department> {
    return this.get<Department>(`/${deptId}`, config);
  }

  /** 부서 등록. ognzId 는 서버가 채번하며 생성된 ID 를 반환한다. */
  async createDept(data: Partial<Department>, config?: AxiosRequestConfig): Promise<string> {
    return this.post<string>('', data, config);
  }

  /** 부서 정보 수정 */
  async updateDept(deptId: string, data: Partial<Department>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>(`/${deptId}`, data, config);
  }

  /**
   * 조직 계층 일괄 저장 — 조직도 편집(드래그앤드롭) 결과의 상위/순서를 반영한다.
   * 각 항목은 ognzId 가 필수이며 upOgnzId 가 없으면 최상위로 처리된다. [V2_26]
   */
  async updateDeptHierarchy(items: Array<Pick<Department, 'ognzId'> & { upOgnzId?: string; sortOrdr?: number }>, config?: AxiosRequestConfig): Promise<void> {
    return this.put<void>('/batch-hierarchy', items, { ...config, timeout: 60000 });
  }

  /** 부서 삭제 (소속 사용자·하위 부서가 있으면 서버가 409 로 막는다) */
  async deleteDept(deptId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.delete<void>(`/${deptId}`, config);
  }
}

export const deptAdminService = new DeptAdminService();
