'use client';

import { useEffect, useState } from 'react';

/**
 * 값의 변화를 지정한 지연 시간만큼 늦춰 반환하는 훅.
 *
 * 검색어처럼 타이핑 한 글자마다 서버 요청이 나가는 화면에서,
 * `queryKey`/요청 파라미터에는 이 훅이 반환한 디바운스 값만 넣는다.
 * 입력 컨트롤(`value`)에는 원본 상태를 그대로 바인딩해야 입력 지연이 생기지 않는다.
 *
 * 페이지 리셋(`setPage(1)`)은 이 훅의 책임이 아니다.
 * 검색어를 바꾸는 `onChange` 핸들러에서 함께 호출한다
 * (3페이지에서 검색 시 빈 화면이 되는 문제 방지).
 *
 * @example
 * const [keyword, setKeyword] = useState('');
 * const debouncedKeyword = useDebouncedValue(keyword, 300);
 * const { data } = useQuery({
 *   queryKey: ['users', debouncedKeyword, page],
 *   queryFn: () => UserService.search({ keyword: debouncedKeyword, page }),
 * });
 * // <Input value={keyword} onChange={(e) => { setKeyword(e.target.value); setPage(1); }} />
 *
 * @param value 디바운스 대상 값
 * @param delay 지연 시간(ms). 0 이하이면 즉시 반영한다. 기본 300ms.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    if (delay <= 0) {
      setDebouncedValue(value);
      return;
    }

    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}
