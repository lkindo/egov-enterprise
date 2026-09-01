import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { SearchParams, PageResponse } from '@/types/foundation/system';
import type { components, operations } from '@/types/generated-api';
import { getStatusOperation } from '@/types/generated-operations';

export interface NetworkStatusDetailed {
  sysNm: string;
  sysIp: string;
  sysPort: string;
  svcSttus: string;
  logDt: string;
}

type NetworkStatusQuery = NonNullable<operations['getStatus']['parameters']['query']>;

const NETWORK_STATUS_QUERY_KEYS = new Set([
  'page',
  'size',
  'pageIndex',
  'pageUnit',
  'searchCondition',
  'searchKeyword',
  'searchUseYn',
  'pageSize',
  'firstIndex',
  'lastIndex',
  'recordCountPerPage',
  'searchKeywordFrom',
  'searchKeywordTo',
]);

function optionalNumber(value: unknown, name: string): number | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'number') throw new Error(`${name} 쿼리 값이 숫자가 아닙니다.`);
  return value;
}

function optionalString(value: unknown, name: string): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== 'string') throw new Error(`${name} 쿼리 값이 문자열이 아닙니다.`);
  return value;
}

function toNetworkStatusQuery(params?: SearchParams): NetworkStatusQuery | undefined {
  if (!params) return undefined;
  const unsupported = Object.keys(params).filter(
    (key) => params[key] !== undefined && !NETWORK_STATUS_QUERY_KEYS.has(key),
  );
  if (unsupported.length > 0) {
    throw new Error(`네트워크 상태 OpenAPI에 없는 쿼리입니다: ${unsupported.join(', ')}`);
  }
  if (params.page !== undefined && params.pageIndex !== undefined) {
    throw new Error('page와 pageIndex를 함께 지정할 수 없습니다.');
  }
  if (params.size !== undefined && params.pageUnit !== undefined) {
    throw new Error('size와 pageUnit을 함께 지정할 수 없습니다.');
  }

  const page = optionalNumber(params.page, 'page');
  const size = optionalNumber(params.size, 'size');
  const query: NetworkStatusQuery = {
    ...(page === undefined
      ? (params.pageIndex === undefined ? {} : { pageIndex: optionalNumber(params.pageIndex, 'pageIndex') })
      : { pageIndex: page + 1 }),
    ...(size === undefined
      ? (params.pageUnit === undefined ? {} : { pageUnit: optionalNumber(params.pageUnit, 'pageUnit') })
      : { pageUnit: size }),
    ...(params.searchCondition === undefined
      ? {} : { searchCondition: optionalString(params.searchCondition, 'searchCondition') }),
    ...(params.searchKeyword === undefined
      ? {} : { searchKeyword: optionalString(params.searchKeyword, 'searchKeyword') }),
  };
  for (const key of [
    'searchUseYn',
    'searchKeywordFrom',
    'searchKeywordTo',
  ] as const) {
    const value = optionalString(params[key], key);
    if (value !== undefined) query[key] = value;
  }
  for (const key of [
    'pageSize',
    'firstIndex',
    'lastIndex',
    'recordCountPerPage',
  ] as const) {
    const value = optionalNumber(params[key], key);
    if (value !== undefined) query[key] = value;
  }
  return query;
}

function requireNetworkStatus(
  item: components['schemas']['NetworkStatusDetailedDto'],
): NetworkStatusDetailed {
  if (
    typeof item.sysNm !== 'string'
    || typeof item.sysIp !== 'string'
    || typeof item.sysPort !== 'string'
    || typeof item.svcSttus !== 'string'
    || typeof item.logDt !== 'string'
  ) {
    throw new Error('네트워크 상태 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    sysNm: item.sysNm,
    sysIp: item.sysIp,
    sysPort: item.sysPort,
    svcSttus: item.svcSttus,
    logDt: item.logDt,
  };
}

function requireNetworkStatusPage(response: {
  list?: components['schemas']['NetworkStatusDetailedDto'][];
  total?: number;
  page?: number;
  size?: number;
  totalPage?: number;
}): PageResponse<NetworkStatusDetailed> {
  if (
    !Array.isArray(response.list)
    || typeof response.total !== 'number'
    || typeof response.page !== 'number'
    || typeof response.size !== 'number'
    || typeof response.totalPage !== 'number'
  ) {
    throw new Error('네트워크 상태 페이지 응답이 필수 계약과 일치하지 않습니다.');
  }
  return {
    list: response.list.map(requireNetworkStatus),
    total: response.total,
    page: response.page,
    size: response.size,
    totalPage: response.totalPage,
  };
}

/** 네트워크 토폴로지 화면이 사용하는 읽기 전용 모니터링 서비스. */
export const networkService = {
  /** 네트워크 서비스 상태 목록 조회 */
  getStatus: async (params?: SearchParams): Promise<PageResponse<NetworkStatusDetailed>> => {
    const response = await executeGeneratedOperation(getStatusOperation, {
      query: toNetworkStatusQuery(params),
    });
    return requireNetworkStatusPage(response);
  },
};
