'use client';

// [2026-08-09] usePathname/useSearchParams import 를 제거했다.
//   아래 useEffect 가 의도적으로 주석 처리돼 있어(네이티브 스크롤 복원에 맡김)
//   두 훅은 그 잔재로만 남아 있었다. 이 컴포넌트는 현재 아무 일도 하지 않는다 —
//   effect 를 되살릴 때 import 도 함께 되살릴 것.

/**
 * 페이지 전환 시 스크롤을 최상단으로 이동시키는 컴포넌트
 */
export function ScrollToTop() {

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
