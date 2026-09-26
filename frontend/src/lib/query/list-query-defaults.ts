import { QueryClient, type Query } from '@tanstack/react-query';

/**
 * 목록 쿼리의 공통 상태 규칙(2026-09-26 DIP C1·C2).
 *
 * 페이지 응답(`{ list: [], total }`)을 받는 목록 화면은 페이지·검색어가 바뀌면 query key 가 바뀐다. 새 key 에는
 * 아직 데이터가 없으므로 종전에는 조회 중에 `total` 이 0 이 되어 '총 0건' 을 읽고 페이저가 사라졌다가 다시
 * 나타났다(C1). 같은 이유로 새 key 의 5xx 는 "최초 로드 실패" 로 판정돼, 이전 페이지가 멀쩡히 보이던 화면 전체가
 * 오류 경계로 교체됐다(C2).
 *
 * 두 규칙 모두 **페이지 모양 응답에만** 적용한다. 배열이나 단건 응답은 항목별 하위 목록·상세인 경우가 많아,
 * 이전 데이터를 남기면 다른 항목의 행·내용이 잠시 새 항목의 것처럼 보인다.
 */
export function isPageShaped(data: unknown): boolean {
  if (typeof data !== 'object' || data === null) return false;
  const record = data as { list?: unknown; total?: unknown };
  return Array.isArray(record.list) && typeof record.total === 'number';
}

/** C1 — 새 페이지를 불러오는 동안 이전 페이지를 유지한다(페이지 모양일 때만). */
export function keepPreviousPageData<T>(previousData: T | undefined): T | undefined {
  return isPageShaped(previousData) ? previousData : undefined;
}

/**
 * HTTP 상태 코드를 추출한다.
 *
 * `lib/api/client.ts` 의 응답 인터셉터는 AxiosError 를 그대로 reject 하거나(=`error.response.status` 보유),
 * 비-Error 객체일 때 `new Error(...)` 로 승격한 뒤 `Object.assign` 으로 원본 필드(`response` 포함)를 복사한다.
 * 따라서 `response.status` 가 1차 소스이고, 서버 액션 등에서 평탄화된 `status`/`statusCode` 도 보조로 본다.
 * 상태를 알 수 없는 에러(네트워크 단절, success=false 논리 실패 등)는 0 을 반환해 승격 대상에서 제외한다.
 */
export function getHttpStatus(error: unknown): number {
  if (typeof error !== 'object' || error === null) return 0;
  const record = error as { response?: unknown; status?: unknown; statusCode?: unknown };
  const response = record.response;
  if (typeof response === 'object' && response !== null && typeof (response as { status?: unknown }).status === 'number') {
    return (response as { status: number }).status;
  }
  if (typeof record.status === 'number') return record.status;
  if (typeof record.statusCode === 'number') return record.statusCode;
  return 0;
}

/** 같은 목록 계열(query key 첫 요소)에 화면이 이미 그린 페이지가 있는가. */
function hasRenderedPageSibling(client: QueryClient, query: Query): boolean {
  const family = query.queryKey[0];
  return client
    .getQueryCache()
    .findAll({ queryKey: [family] })
    .some((other) => other !== query && isPageShaped(other.state.data));
}

/**
 * 서버 오류(5xx)의 최초 로드 실패만 error boundary(각 세그먼트의 `error.tsx`)로 승격한다. (감사 P1-1(3))
 * - 4xx 는 승격하지 않는다: 401(세션 만료)은 인터셉터가 재발급/로그인 리다이렉트로 처리하고,
 *   403(권한 없음)·404 는 해당 화면 안에서 안내해야 한다. 전체 화면 교체는 과잉 반응이다.
 * - 상태 코드를 알 수 없는 에러(네트워크 단절, `success:false` 논리 실패)도 승격하지 않고
 *   화면의 `error`/`onRetry`(ErrorStateDisplay) 경로로 노출한다.
 * - 이미 데이터가 그려진 뒤의 백그라운드 refetch 실패로 화면이 통째로 날아가지 않도록
 *   `query.state.data === undefined`(최초 로드 실패)일 때만 승격한다.
 * - [C2] 같은 목록 계열의 다른 페이지가 이미 그려져 있으면 새 페이지의 실패는 최초 로드가 아니다 —
 *   표의 error/onRetry 로 처리한다.
 */
export function shouldPromoteQueryError(error: unknown, query: Query, client: QueryClient): boolean {
  if (query.state.data !== undefined) return false;
  if (getHttpStatus(error) < 500) return false;
  return !hasRenderedPageSibling(client, query);
}

/** 앱 전역 QueryClient. providers 와 계약 테스트가 같은 설정을 쓰도록 여기서 만든다. */
export function createAppQueryClient(): QueryClient {
  const client: QueryClient = new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000,
        retry: 1,
        refetchOnWindowFocus: false,
        // [C1] 페이지·검색어를 바꾸는 동안 이전 페이지를 유지한다(페이지 모양 응답만).
        placeholderData: keepPreviousPageData,
        throwOnError: (error, query) => shouldPromoteQueryError(error, query, client),
      },
    },
  });
  return client;
}
