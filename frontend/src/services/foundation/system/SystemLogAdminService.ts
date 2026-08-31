import { AdminService } from '@/services/core/ApiService';
import type {
  LoginLog,
  PageResponse,
  PrivacyLog,
  SearchParams,
  SysLog,
  UserLog,
  WebLog,
} from '@/types/foundation/system';
import type { AxiosRequestConfig } from 'axios';
import type { operations } from '@/types/generated-api';
import {
  getLoginLogListOperation,
  getLoginLogOperation,
  getPrivacyLogListOperation,
  getSysLogListOperation,
  getSysLogOperation,
  getUserLogListOperation,
  getWebLogListOperation,
} from '@/types/generated-operations';

type LogSearchQuery = NonNullable<operations['getSysLogList']['parameters']['query']>;

const LOG_QUERY_KEYS = [
  'searchCondition',
  'searchKeyword',
  'searchUseYn',
  'pageIndex',
  'pageUnit',
  'pageSize',
  'firstIndex',
  'lastIndex',
  'recordCountPerPage',
  'searchKeywordFrom',
  'searchKeywordTo',
] as const satisfies readonly (keyof LogSearchQuery)[];

/** 목록 화면의 0-base `page`를 API의 1-base `pageIndex` 계약으로 정규화한다. */
function normalizeLogSearchParams(params: SearchParams): LogSearchQuery {
  const query: LogSearchQuery = {};
  const generatedParams = params as Partial<LogSearchQuery>;
  for (const key of LOG_QUERY_KEYS) {
    const value = generatedParams[key];
    if (value !== undefined) Object.assign(query, { [key]: value });
  }
  query.pageIndex = params.pageIndex ?? (params.page ?? 0) + 1;
  if (params.pageUnit !== undefined || params.size !== undefined) {
    query.pageUnit = params.pageUnit ?? params.size;
  }
  query.searchKeyword = params.searchKeyword ?? params.searchWrd ?? '';
  return query;
}

function requireLogPage<T>(
  response: { list?: T[]; total?: number; page?: number; size?: number; totalPage?: number },
): PageResponse<T> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('로그 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return response as PageResponse<T>;
}

/**
 * 시스템 로그 관리 서비스 (Admin)
 */
class SystemLogAdminService extends AdminService {
  constructor() {
    super('/logs');
  }

  /**
   * 시스템 로그 목록 조회
   */
  async getSystemLogs(params: { page?: number; size?: number; searchWrd?: string } | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<SysLog>> {
    const response = await this.executeGenerated(getSysLogListOperation, {
      query: normalizeLogSearchParams(params),
      config,
    });
    return requireLogPage(response);
  }

  /**
   * 시스템 로그 상세 조회
   */
  async getSystemLog(sysLogSn: number, config?: AxiosRequestConfig): Promise<SysLog> {
    return this.executeGenerated(getSysLogOperation, { path: { sysLogSn }, config });
  }

  /**
   * 로그인 로그 목록 조회
   */
  async getLoginLogs(params: { page?: number; size?: number; searchWrd?: string } | SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<LoginLog>> {
    const response = await this.executeGenerated(getLoginLogListOperation, {
      query: normalizeLogSearchParams(params),
      config,
    });
    return requireLogPage(response);
  }

  /**
   * 로그인 로그 상세 조회
   */
  async getLoginLog(lgnSn: number, config?: AxiosRequestConfig): Promise<LoginLog> {
    return this.executeGenerated(getLoginLogOperation, { path: { lgnSn }, config });
  }

  /**
   * 개인정보 접근 로그 목록 조회
   */
  async getPrivacyLogs(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<PrivacyLog>> {
    const response = await this.executeGenerated(getPrivacyLogListOperation, {
      query: normalizeLogSearchParams(params),
      config,
    });
    return requireLogPage(response);
  }

  /**
   * 사용자 로그 목록 조회 (관리자용)
   */
  async getUserLogs(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<UserLog>> {
    const response = await this.executeGenerated(getUserLogListOperation, {
      query: normalizeLogSearchParams(params),
      config,
    });
    return requireLogPage(response);
  }

  /**
   * 웹 로그 목록 조회 (HTTP 요청 로그)
   */
  async getWebLogs(params: SearchParams, config?: AxiosRequestConfig): Promise<PageResponse<WebLog>> {
    const response = await this.executeGenerated(getWebLogListOperation, {
      query: normalizeLogSearchParams(params),
      config,
    });
    return requireLogPage(response);
  }

  /*
   * 전송 로그(getTransferLogs)는 두지 않는다 (2026-08-05 제거).
   *
   * 이 메서드는 `/transfer` 를 쳤으나 백엔드에 대응 엔드포인트가 없었고, 더 근본적으로
   * **테이블도 엔티티도 존재한 적이 없다**(DB 90개 테이블 전수 확인). 즉 "구현이 안 된 것"이
   * 아니라 **무엇을 전송 로그로 기록할지 정의된 적이 없는 것**이다.
   *
   * 화면(/admin/system/logs/transfer)과 타입(TransferLog)도 함께 제거했다. 남겨두면 다음 사람이
   * "백엔드만 붙이면 된다" 고 오인하는데, 실제로는 도메인 설계부터 필요하다.
   * 필요해지면 요구사항(무엇을·어디로 전송한 기록인가)부터 정의할 것.
   */
}

export const systemLogAdminService = new SystemLogAdminService();
