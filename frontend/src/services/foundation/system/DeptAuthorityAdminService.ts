import type { AxiosRequestConfig } from 'axios';
import { AdminService } from '@/services/core/ApiService';
import type { PageResponse } from '@/types/foundation/system';
import type { components } from '@/types/generated-api';
import {
  getDeptAuthoritiesOperation,
  saveDeptUserAuthoritiesOperation,
} from '@/types/generated-operations';

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

function requireDeptAuthor(
  item: components['schemas']['DeptAuthorProjection'],
): DeptAuthorProjection {
  if (
    typeof item.deptCode !== 'string'
    || typeof item.deptNm !== 'string'
    || typeof item.userId !== 'string'
    || typeof item.userNm !== 'string'
    || typeof item.authrtId !== 'string'
    || typeof item.scrtyDcsnTrgtId !== 'string'
    || typeof item.regYn !== 'string'
  ) {
    throw new Error('부서 권한 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    deptCode: item.deptCode,
    deptNm: item.deptNm,
    userId: item.userId,
    userNm: item.userNm,
    authrtId: item.authrtId,
    scrtyDcsnTrgtId: item.scrtyDcsnTrgtId,
    regYn: item.regYn,
  };
}

function requireDeptAuthorityPage(
  response: {
    list?: components['schemas']['DeptAuthorProjection'][];
    total?: number;
    page?: number;
    size?: number;
    totalPage?: number;
  },
): PageResponse<DeptAuthorProjection> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('부서 권한 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list.map(requireDeptAuthor),
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/** 부서 권한 관리 서비스 (Admin). */
class DeptAuthorityAdminService extends AdminService {
  constructor() {
    super('/dept-authorities');
  }

  async getDeptAuthorities(
    deptId: string,
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<DeptAuthorProjection>> {
    const response = await this.executeGenerated(getDeptAuthoritiesOperation, {
      path: { deptId },
      config,
    });
    return requireDeptAuthorityPage(response);
  }

  async updateDeptAuthorities(data: DeptAuthorBatchRequest, config?: AxiosRequestConfig): Promise<void> {
    return this.executeGenerated(saveDeptUserAuthoritiesOperation, { body: data, config });
  }
}

export const deptAuthorityAdminService = new DeptAuthorityAdminService();
