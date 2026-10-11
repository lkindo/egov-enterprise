import { ApiService } from '@/services/core/ApiService';
import { copyPageResponse } from '@/services/core/page-response';
import type { PageResponse } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import type { components, operations } from '@/types/generated-api';
import {
  createExternalHrOperation,
  deleteExternalHrOperation,
  updateExternalHrOperation,
  getAllExternalHrOperation,
} from '@/types/generated-operations';
import { ExternalHrDtoRequestSchema } from '@/types/generated-zod';

/** 외부인사정보: OpenAPI ExternalHrDto를 단일 원본으로 사용한다. */
export type ExternalHr = components['schemas']['ExternalHrDto'];

/** 외부인사 요청 입력(등록·수정 공통): OpenAPI readOnly 감사 필드는 요청 타입에서도 제외한다. */
export type ExternalHrRequestInput = z.input<typeof ExternalHrDtoRequestSchema>;
/** 등록 입력 — 수정과 같은 요청 계약이다({@link ExternalHrRequestInput}). */
export type ExternalHrCreateInput = ExternalHrRequestInput;

/** Spring Pageable의 0-based page를 그대로 받는 exact query. */
export type ExternalHrSearchParams = NonNullable<operations['getAllExternalHr']['parameters']['query']>;

/**
 * 행사 외부인사 관리자 서비스. 포상 서비스(RewardAdminService)와 한 파일에 두지 않는다 — 행사·포상은 따로 고르는 기능이라
 * 한 파일에 섞으면 행사만 고른 생성물에 포상 API 호출이 죽은 채 남는다.
 */
class ExternalHrAdminService extends ApiService {
  async getExternalHrList(
    params: ExternalHrSearchParams = {},
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<ExternalHr>> {
    const response = await this.executeGenerated(getAllExternalHrOperation, { query: params, config });
    return copyPageResponse<ExternalHr>(response, '운영지원');
  }

  async createExternalHr(data: ExternalHrCreateInput, config?: AxiosRequestConfig): Promise<ExternalHr> {
    return this.executeGenerated(createExternalHrOperation, { body: data, config });
  }

  /*
   * [2026-09-05 DEC-OPS-036] 정정 경로 — 종전에는 외부인사가 등록만 되고 고칠 수 없었다(감사 D11-01).
   * 외부인사 식별자는 복합키(evntSn·otsdHrId)라 경로에 둘 다 싣는다.
   */
  async updateExternalHr(evntSn: number, otsdHrId: string, data: ExternalHrRequestInput, config?: AxiosRequestConfig): Promise<ExternalHr> {
    return this.executeGenerated(updateExternalHrOperation, { path: { evntSn, otsdHrId }, body: data, config });
  }

  async deleteExternalHr(evntSn: number, otsdHrId: string, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(deleteExternalHrOperation, { path: { evntSn, otsdHrId }, config });
  }
}

export const externalHrAdminService = new ExternalHrAdminService();
