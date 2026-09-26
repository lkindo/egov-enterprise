import { useEffect, useRef } from 'react';

/**
 * 현재 페이지가 마지막 페이지를 넘었으면 마지막 페이지로 되돌린다(2026-09-26 DIP C4).
 *
 * 마지막 페이지의 마지막 항목을 지우거나 처리하면 목록을 다시 읽은 뒤 그 페이지는 비어 있다. 종전 화면은
 * 빈 페이지에 머물렀고, 전체가 한 페이지로 줄면 페이저까지 사라져 돌아갈 길이 없었다(결재 대기함).
 *
 * `ready` 는 **이번 조회 결과를 믿어도 되는가** 다 — 조회 중·오류일 때 총 페이지는 초기값(1 등)이라,
 * 그 값으로 되돌리면 딥링크로 연 3페이지가 로딩 중에 1페이지로 바뀐다. 같은 되돌림은 한 번만 요청한다
 * (호출부의 onPageChange 가 확인 대화를 거치거나 비동기로 반영돼도 반복 호출하지 않는다).
 */
export function clampPage(page: number, totalPages: number): number | null {
  const lastPage = Math.max(1, Math.floor(totalPages) || 1);
  return page > lastPage ? lastPage : null;
}

export function usePageClamp({
  page,
  totalPages,
  ready,
  onPageChange,
}: {
  page: number | undefined;
  totalPages: number;
  ready: boolean;
  onPageChange: ((page: number) => void) | undefined;
}): void {
  const target = ready && page !== undefined && onPageChange ? clampPage(page, totalPages) : null;
  const requestedRef = useRef<string | null>(null);
  const onPageChangeRef = useRef(onPageChange);
  useEffect(() => {
    onPageChangeRef.current = onPageChange;
  });
  useEffect(() => {
    if (target === null) {
      requestedRef.current = null;
      return;
    }
    const request = `${page}->${target}`;
    if (requestedRef.current === request) return;
    requestedRef.current = request;
    onPageChangeRef.current?.(target);
  }, [page, target]);
}
