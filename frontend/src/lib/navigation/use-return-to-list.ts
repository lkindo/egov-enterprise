'use client';

import { useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { matchesRoute, previousRoute } from './previous-route';

export interface ReturnToListOptions {
  /** 목록에서 오지 않았을 때 갈 목록 경로. 실제 라우트여야 한다(page-redirect 역참조 가드가 본다). */
  fallback: string;
  /** 이 상세로 들어오는 목록 경로 패턴들(`/*` 로 끝나면 하위 포함). 직전 경로가 맞으면 뒤로 간다. */
  origins: readonly string[];
}

/**
 * 상세 화면의 '목록으로' 동작(2026-10-01). 목록에서 왔으면 방문 기록으로 되돌아가 목록의 페이지·검색 조건·스크롤을
 * 그대로 살리고, 딥링크·새 탭·다른 화면에서 왔으면 목록 경로로 간다. 방문 기록 밖으로 나가는 `router.back()` 을
 * 상세 화면이 직접 부르지 않게 한다.
 */
export function useReturnToList({ fallback, origins }: ReturnToListOptions): () => void {
  const router = useRouter();
  const originKey = origins.join('\n');
  return useCallback(() => {
    const previous = previousRoute();
    if (previous && originKey.split('\n').some((origin) => matchesRoute(previous, origin))) {
      router.back();
      return;
    }
    router.push(fallback);
  }, [fallback, originKey, router]);
}
