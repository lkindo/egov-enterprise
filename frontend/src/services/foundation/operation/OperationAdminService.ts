import { ApiService } from '@/services/core/ApiService';
import type { PageResponse } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  createExternalHrOperation,
  createRewardOperation,
  deleteExternalHrOperation,
  deleteRewardOperation,
  updateExternalHrOperation,
  updateRewardOperation,
  getAllExternalHrOperation,
  getAllRewardsOperation,
} from '@/types/generated-operations';

/** 외부인사정보: OpenAPI ExternalHrDto를 단일 원본으로 사용한다. */
export type ExternalHr = components['schemas']['ExternalHrDto'];

/** 포상정보: OpenAPI RewardManageDto를 단일 원본으로 사용한다. */
export type Reward = components['schemas']['RewardManageDto'];

/** Spring Pageable의 0-based page를 그대로 받는 exact query. */
export type OperationSearchParams = NonNullable<operations['getAllExternalHr']['parameters']['query']>;

function requireOperationPage<T>(
  response: { list?: T[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<T> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('운영지원 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list,
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/** 운영지원(외부인사·포상) 관리자 서비스. */
class OperationAdminService extends ApiService {
  constructor() {
    super('/admin/operation');
  }

  async getExternalHrList(
    params: OperationSearchParams = {},
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<ExternalHr>> {
    const response = await this.executeGenerated(getAllExternalHrOperation, { query: params, config });
    return requireOperationPage(response);
  }

  async createExternalHr(data: ExternalHr, config?: AxiosRequestConfig): Promise<ExternalHr> {
    return this.executeGenerated(createExternalHrOperation, { body: data, config });
  }

  async getRewardList(
    params: OperationSearchParams = {},
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<Reward>> {
    const response = await this.executeGenerated(getAllRewardsOperation, { query: params, config });
    return requireOperationPage(response);
  }

  async createReward(data: Reward, config?: AxiosRequestConfig): Promise<Reward> {
    return this.executeGenerated(createRewardOperation, { body: data, config });
  }

  /*
   * [2026-09-05 DEC-OPS-036] 정정 경로 — 종전에는 외부인사·포상 모두 등록만 되고 고칠 수 없었다(감사 D11-01).
   * 외부인사 식별자는 복합키(evntSn·otsdHrId)라 경로에 둘 다 싣는다.
   */
  async updateExternalHr(evntSn: number, otsdHrId: string, data: ExternalHr, config?: AxiosRequestConfig): Promise<ExternalHr> {
    return this.executeGenerated(updateExternalHrOperation, { path: { evntSn, otsdHrId }, body: data, config });
  }

  async deleteExternalHr(evntSn: number, otsdHrId: string, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(deleteExternalHrOperation, { path: { evntSn, otsdHrId }, config });
  }

  async updateReward(rwrdSn: number, data: Reward, config?: AxiosRequestConfig): Promise<Reward> {
    return this.executeGenerated(updateRewardOperation, { path: { rwrdSn }, body: data, config });
  }

  async deleteReward(rwrdSn: number, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(deleteRewardOperation, { path: { rwrdSn }, config });
  }
}

export const operationAdminService = new OperationAdminService();

/** 빈 페이지 응답 (초기 로드 실패 시 안전 폴백) */
export function emptyPage<T>(size = 10): PageResponse<T> {
  return { list: [], total: 0, page: 1, size, totalPage: 0 };
}
