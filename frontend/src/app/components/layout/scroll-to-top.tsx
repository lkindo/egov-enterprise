'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * 페이지 전환 시 스크롤을 최상단으로 이동시키는 컴포넌트
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  useEffect(() => {
    // 페이지 경로가 바뀔 때마다 윈도우 스크롤을 상단으로 이동
    // setTimeout을 사용하여 렌더링 후 스크롤이 확실하게 동작하도록 유도
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [pathname, searchParams]);

  return null;
}
