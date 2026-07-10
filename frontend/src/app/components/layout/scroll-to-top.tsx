'use client';

import { useEffect } from 'react';
import { usePathname, useSearchParams } from 'next/navigation';

/**
 * 페이지 전환 시 스크롤을 최상단으로 이동시키는 컴포넌트
 */
export function ScrollToTop() {
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // Effect disabled to allow native/default Next.js scroll restoration behavior
  /*
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      window.scrollTo(0, 0);
    }, 10);

    return () => clearTimeout(timeoutId);
  }, [pathname, searchParams]);
  */

  return null;
}
