import { ApiService } from '@/services/core/ApiService';
import { copyPageResponse } from '@/services/core/page-response';
import type { PageResponse } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import {
  createRewardOperation,
  deleteRewardOperation,
  updateRewardOperation,
  getAllRewardsOperation,
} from '@/types/generated-operations';

/** 포상정보: OpenAPI RewardManageDto를 단일 원본으로 사용한다. */
export type Reward = components['schemas']['RewardManageDto'];

/** Spring Pageable의 0-based page를 그대로 받는 exact query. */
export type RewardSearchParams = NonNullable<operations['getAllRewards']['parameters']['query']>;

/** 포상 관리자 서비스. 외부인사 서비스(ExternalHrAdminService)와 따로 둔다 — 행사·포상은 따로 고르는 기능이다. */
class RewardAdminService extends ApiService {
  async getRewardList(
    params: RewardSearchParams = {},
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<Reward>> {
    const response = await this.executeGenerated(getAllRewardsOperation, { query: params, config });
    return copyPageResponse<Reward>(response, '운영지원');
  }

  async createReward(data: Reward, config?: AxiosRequestConfig): Promise<Reward> {
    return this.executeGenerated(createRewardOperation, { body: data, config });
  }

  /* [2026-09-05 DEC-OPS-036] 정정 경로 — 종전에는 포상이 등록만 되고 고칠 수 없었다(감사 D11-01). */
  async updateReward(rwrdSn: number, data: Reward, config?: AxiosRequestConfig): Promise<Reward> {
    return this.executeGenerated(updateRewardOperation, { path: { rwrdSn }, body: data, config });
  }

  async deleteReward(rwrdSn: number, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(deleteRewardOperation, { path: { rwrdSn }, config });
  }
}

export const rewardAdminService = new RewardAdminService();

/** 빈 페이지 응답 (초기 로드 실패 시 안전 폴백) */
export function emptyPage<T>(size = 10): PageResponse<T> {
  return { list: [], total: 0, page: 1, size, totalPage: 0 };
}
