import type { QueryClient } from '@tanstack/react-query';

/**
 * 브라우저에서 앱 공급자가 만든 QueryClient(2026-11-25 품질 평가).
 *
 * <p>브레드크럼처럼 공급자 밖에서도 그려지고 수많은 화면 시험이 함께 그리는 공용 부품이, 머리글·사이드바가 이미 받은 조회 캐시를
 * 같이 쓰게 한다. React 컨텍스트로 읽으면 {@code @tanstack/react-query} 를 대역으로 바꾼 화면 시험마다 컨텍스트 내보내기를
 * 요구하게 된다. 서버에서는 기억하지 않는다 — 요청마다 다른 클라이언트라 모듈 변수에 두면 요청 사이에 남는다.
 */
let browserClient: QueryClient | undefined;

/** 공급자가 만든 클라이언트를 기억하고 그대로 돌려준다. undefined 를 넘기면 잊는다(시험 정리용). */
export function rememberBrowserQueryClient<T extends QueryClient | undefined>(client: T): T {
  if (typeof window !== 'undefined') browserClient = client;
  return client;
}

/** 기억한 클라이언트 — 공급자 밖·서버·시험 대역에서는 undefined 다. */
export function browserQueryClient(): QueryClient | undefined {
  return browserClient;
}
