import { ApiService } from '@/services/core/ApiService';
import type { PageResponse } from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { z } from 'zod';
import type { components, operations } from '@/types/generated-api';
import {
  deleteIsgOperation,
  getIsgListOperation,
  getIsgOperation,
  registerIsgOperation,
  updateIsgOperation,
} from '@/types/generated-operations';
import { InternetSvcGuidanceDtoRequestSchema } from '@/types/generated-zod';

/** 인터넷 서비스 안내: OpenAPI InternetSvcGuidanceDto 를 단일 원본으로 사용한다. */
export type InternetSvcGuidance = components['schemas']['InternetSvcGuidanceDto'];

/**
 * 등록·수정 공통 요청 입력. 생성 Request 스키마가 readOnly 감사 필드
 * (`itntSrvcSn`·`lastMdfrId`·`mdfcnDt`)를 이미 제외한다 — 화면이 그 값을 보내지 않는다.
 */
export type InternetSvcGuidanceInput = z.input<typeof InternetSvcGuidanceDtoRequestSchema>;

/** Spring Pageable 의 0-based page 를 그대로 받는 exact query. */
export type InternetSvcGuidanceSearchParams = NonNullable<operations['getIsgList']['parameters']['query']>;

/**
 * 페이지 응답 필수 계약 검증. 형제 도메인(OperationAdminService)과 같은 규칙으로,
 * 서버가 계약을 어기면 빈 목록으로 흘려보내지 않고 즉시 드러낸다.
 */
function requireGuidancePage(
  response: { list?: InternetSvcGuidance[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<InternetSvcGuidance> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('인터넷 서비스 안내 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list,
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/**
 * 인터넷 서비스 안내 관리자 서비스.
 *
 * <p>[2026-09-07] 백엔드 5본은 2026-08 이전부터 완비돼 있었지만 이 저장소 전체에 호출부가 0 이었다
 * — 화면이 없어 등록조차 할 수 없었고, 그래서 {@code tb_intrn_svc} 는 구조적으로 항상 비어 있었다.
 * 이 서비스가 그 마지막 한 겹이다.
 */
class InternetSvcGuidanceAdminService extends ApiService {
  constructor() {
    super('/admin/system/isg');
  }

  async getGuidanceList(
    params: InternetSvcGuidanceSearchParams = {},
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<InternetSvcGuidance>> {
    const response = await this.executeGenerated(getIsgListOperation, { query: params, config });
    return requireGuidancePage(response);
  }

  async getGuidance(itntSrvcSn: number, config?: AxiosRequestConfig): Promise<InternetSvcGuidance> {
    return this.executeGenerated(getIsgOperation, { path: { itntSrvcSn }, config });
  }

  /** 등록은 생성된 일련번호를 돌려준다(서버 계약: ApiResponse&lt;Long&gt;). */
  async createGuidance(data: InternetSvcGuidanceInput, config?: AxiosRequestConfig): Promise<number> {
    return this.executeGenerated(registerIsgOperation, { body: data, config });
  }

  async updateGuidance(
    itntSrvcSn: number,
    data: InternetSvcGuidanceInput,
    config?: AxiosRequestConfig,
  ): Promise<void> {
    await this.executeGenerated(updateIsgOperation, { path: { itntSrvcSn }, body: data, config });
  }

  async deleteGuidance(itntSrvcSn: number, config?: AxiosRequestConfig): Promise<void> {
    await this.executeGenerated(deleteIsgOperation, { path: { itntSrvcSn }, config });
  }
}

export const internetSvcGuidanceAdminService = new InternetSvcGuidanceAdminService();
