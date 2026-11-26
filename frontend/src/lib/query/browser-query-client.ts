import type { QueryClient } from '@tanstack/react-query';

/**
 * 브라우저에서 앱 공급자가 만든 QueryClient(2026-11-25 품질 평가).
 *
 * <p>브레드크럼처럼 공급자 밖에서도 그려지고 수많은 화면 시험이 함께 그리는 공용 부품이, 머리글·사이드바가 이미 받은 조회 캐시를
 * 같이 쓰게 한다. React 컨텍스트로 읽으면 {@code @tanstack/react-query} 를 대역으로 바꾼 화면 시험마다 컨텍스트 내보내기를
 * 요구하게 된다. 서버에서는 기억하지 않는다 — 요청마다 다른 클라이언트라 모듈 변수에 두면 요청 사이에 남는다.
 * 공급자는 효과에서 기억하므로 첫 마운트의 자식 효과보다 늦다 — 읽는 쪽은 {@link subscribeBrowserQueryClient} 로 등록을 구독한다.
 */
let browserClient: QueryClient | undefined;
const listeners = new Set<() => void>();

/** 공급자가 만든 클라이언트를 기억하고 그대로 돌려준다. undefined 를 넘기면 잊는다(언마운트·시험 정리). */
export function rememberBrowserQueryClient<T extends QueryClient | undefined>(client: T): T {
  if (typeof window !== 'undefined' && browserClient !== client) {
    browserClient = client;
    listeners.forEach((listener) => listener());
  }
  return client;
}

/** 기억한 클라이언트 — 공급자 밖·서버·시험 대역에서는 undefined 다. */
export function browserQueryClient(): QueryClient | undefined {
  return browserClient;
}

/** 기억한 클라이언트가 바뀔 때 부른다(useSyncExternalStore 구독). 돌려준 함수로 구독을 푼다. */
export function subscribeBrowserQueryClient(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
