import { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import { PageResponse, SearchParams } from '@/types/foundation/system';
import type { operations } from '@/types/generated-api';
import {
  deleteDeptOperation,
  getDeptOperation,
  getDeptsOperation,
  getDeptTreeOperation,
  insertDeptOperation,
  type GeneratedOperationRequest,
  updateDeptOperation,
  updateDeptHierarchyOperation,
} from '@/types/generated-operations';

export interface Department {
  ognzId: string;
  ognzNm: string;
  ognzExpln?: string;
  /** 상위 부서 ID. 없으면 최상위(루트). [V2_26] */
  upOgnzId?: string;
  /** 동일 상위 내 정렬 순서. [V2_26] */
  sortOrdr?: number;
}

type DeptListQuery = NonNullable<operations['getDepts']['parameters']['query']>;

function toDeptListQuery(params?: SearchParams): DeptListQuery {
  if (!params) return {};
  const rawSort = params.sort;
  return {
    ...(params.keyword === undefined ? {} : { keyword: params.keyword }),
    ...(params.pageIndex !== undefined
      ? { page: Math.max(0, params.pageIndex - 1) }
      : params.page !== undefined
        ? { page: params.page }
        : params.pageNo !== undefined
          ? { page: Math.max(0, params.pageNo - 1) }
          : {}),
    ...(params.size !== undefined
      ? { size: params.size }
      : params.pageUnit !== undefined
        ? { size: params.pageUnit }
        : params.pageSize !== undefined
          ? { size: params.pageSize as number }
          : params.recordCountPerPage !== undefined
            ? { size: params.recordCountPerPage as number }
            : {}),
    ...(rawSort === undefined ? {} : { sort: rawSort as string[] }),
  };
}

function requireDeptPage(
  response: { list?: Department[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<Department> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('부서 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as PageResponse<Department>;
}

/** 부서(조직) 관리 API 클라이언트 — /api/v1/admin/system/departments */
class DeptAdminService extends AdminService {
  constructor() {
    super('/departments');
  }

  /** 부서 목록 조회 (페이징) */
  async getDeptList(params?: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<Department>> {
    const response = await this.executeGenerated(getDeptsOperation, {
      query: toDeptListQuery(params),
      config,
    });
    return requireDeptPage(response as PageResponse<Department>);
  }

  /**
   * 조직도(트리) 전용 전량 조회 — `/tree` 엔드포인트를 사용한다.
   * 페이징 파라미터 없이 서버가 Pageable.unpaged() 로 전량을 반환하므로,
   * size=1000 같은 임의값에 의존하지 않아도 된다(D-11).
   */
  async getDeptTree(keyword?: string, config?: AxiosRequestConfig): Promise<Department[]> {
    return this.executeGenerated(getDeptTreeOperation, {
      query: keyword ? { keyword } : {},
      config,
    }) as Promise<Department[]>;
  }

  /** 부서 상세 조회 */
  async getDept(deptId: string, config?: AxiosRequestConfig): Promise<Department> {
    return this.executeGenerated(getDeptOperation, { path: { deptId }, config }) as Promise<Department>;
  }

  /** 부서 등록. ognzId 는 서버가 채번하며 생성된 ID 를 반환한다. */
  async createDept(data: Partial<Department>, config?: AxiosRequestConfig): Promise<string> {
    return this.executeGenerated(insertDeptOperation, {
      body: data as GeneratedOperationRequest<'insertDept'>,
      config,
    });
  }

  /** 부서 정보 수정 */
  async updateDept(deptId: string, data: Partial<Department>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateDeptOperation, {
      path: { deptId },
      body: data as GeneratedOperationRequest<'updateDept'>,
      config,
    });
  }

  /**
   * 조직 계층 일괄 저장 — 조직도 편집(드래그앤드롭) 결과의 상위/순서를 반영한다.
   * 각 항목은 ognzId 가 필수이며 upOgnzId 가 없으면 최상위로 처리된다. [V2_26]
   */
  async updateDeptHierarchy(items: Array<Pick<Department, 'ognzId'> & { upOgnzId?: string; sortOrdr?: number }>, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(updateDeptHierarchyOperation, {
      body: items,
      config: { ...config, timeout: 60000 },
    });
  }

  /** 부서 삭제 (소속 사용자·하위 부서가 있으면 서버가 409 로 막는다) */
  async deleteDept(deptId: string, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(deleteDeptOperation, { path: { deptId }, config });
  }
}

export const deptAdminService = new DeptAdminService();
