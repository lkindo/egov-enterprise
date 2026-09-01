import { AdminService } from '@/services/core/ApiService';
import { PageResponse } from '@/types/foundation/system';
import { AxiosRequestConfig } from 'axios';
import type { components, operations } from '@/types/generated-api';
import { getSysLogListOperation } from '@/types/generated-operations';

/**
 * 감사 로그 DTO — `/logs/system` 이 반환하는 백엔드 `SysLogDto` 그 자체다.
 * [FE 헌법] `generated-api.d.ts` 가 API 계약의 SSOT 이며, 로컬 인터페이스 재선언은 금지한다.
 * (과거 로컬 `AuditLog { requstId, occrrncDe, processSeCode, rqesterId ... }` 재선언이
 *  실제 계약 `{ sysLogSn, dmndId, ocrnYmd, prcsSeCd, dmndUserId }` 와 불일치하여
 *  타임라인 필드 전량 공백 + `undefined === undefined` 로 전 카드가 선택 강조되는 결함을 낳았다.)
 */
export type AuditLog = components['schemas']['SysLogDto'];
type AuditLogQuery = NonNullable<operations['getSysLogList']['parameters']['query']>;

function toAuditLogQuery(params: {
  page?: number;
  size?: number;
  pageUnit?: number;
  searchKeyword?: string;
  searchKeywordFrom?: string;
  searchKeywordTo?: string;
}): AuditLogQuery {
  const query: AuditLogQuery = {};
  if (params.page !== undefined) query.pageIndex = params.page + 1;
  if (params.pageUnit !== undefined || params.size !== undefined) {
    query.pageUnit = params.pageUnit ?? params.size;
  }
  if (params.size !== undefined) query.recordCountPerPage = params.size;
  if (params.searchKeyword !== undefined) query.searchKeyword = params.searchKeyword;
  if (params.searchKeywordFrom !== undefined) query.searchKeywordFrom = params.searchKeywordFrom;
  if (params.searchKeywordTo !== undefined) query.searchKeywordTo = params.searchKeywordTo;
  return query;
}

function requireAuditPage(
  response: components['schemas']['PageResponseSysLogDto'],
): PageResponse<AuditLog> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('감사 로그 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as PageResponse<AuditLog>;
}

/**
 * 감사 로그 관리 서비스 (Admin)
 */
class AuditAdminService extends AdminService {
  constructor() {
    super('/logs/system');
  }

  /**
   * 감사 로그 목록 조회.
   *
   * ⚠ [2026-08-26 실측 수정] 종전 시그니처는 `keyword` 였다. 그러나 이 엔드포인트(`/logs/system`)는
   *   `@ModelAttribute BaseSearchDto` 로 바인딩하고 그 필드명은 `searchKeyword` 다 — `keyword` 는
   *   어떤 필드에도 매칭되지 않아 **검색어가 통째로 무시됐다**(모니터링 허브 '보안 감사 매트릭스'
   *   탭에서 무엇을 입력해도 결과가 그대로였다). 오류가 아니라 조용한 무시라 화면만 봐서는
   *   판정할 수 없다.
   *
   * 기간(`searchKeywordFrom`/`searchKeywordTo`)은 `YYYYMMDD` 형식이다 — 저장소가
   * `ocrnYmd`(8자리) 와 하이픈 제거 없이 문자열 비교한다(period-filter.tsx 표 참조).
   */
  async getAuditLogs(
    params: {
      page?: number;
      size?: number;
      pageUnit?: number;
      searchKeyword?: string;
      searchKeywordFrom?: string;
      searchKeywordTo?: string;
    },
    config?: AxiosRequestConfig,
  ): Promise<PageResponse<AuditLog>> {
    // 화면의 0-base page/size를 BaseSearchDto의 생성 query 계약으로 변환한다.
    // 생성 스키마에 없는 legacy 키(page/size)는 transport에 넘기지 않는다.
    const response = await this.executeGenerated(getSysLogListOperation, {
      query: toAuditLogQuery(params),
      config,
    });
    return requireAuditPage(response);
  }
}

export const auditAdminService = new AuditAdminService();
