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
    // [2026-08-15] 종전에는 여기서 `setDebouncedValue(value)` 를 직접 호출했다
    //   (react-hooks/set-state-in-effect 위반). 이펙트 본문의 setState 는 렌더를 한 번 더 돌리고,
    //   그 왕복이 PPR 정적 셸과 클라이언트 첫 렌더가 어긋나는 통로가 된다 — 이 저장소는
    //   같은 계열의 하이드레이션 불일치(React #418)로 E2E 가 간헐 실패한 이력이 있다.
    //
    //   지연이 없다는 것은 **디바운스할 것이 없다**는 뜻이므로, 상태를 거칠 이유 자체가 없다.
    //   아래 return 에서 원본을 그대로 돌려주면 결과는 같고 렌더는 한 번 줄어든다
    //   (파생 상태는 이펙트가 아니라 렌더 중에 계산한다).
    if (delay <= 0) return;

    const timer = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timer);
  }, [value, delay]);

  // ⚠ delay 가 0 이하인 동안에는 debouncedValue 가 갱신되지 않으므로 원본을 돌려준다.
  //   런타임에 delay 를 0 ↔ 양수로 바꾸면 전환 직후 한 주기 동안 옛 값이 보일 수 있는데,
  //   실측상 호출부 25곳이 전부 `useDebouncedValue(x, 300)` 형태의 **상수 지연**이라
  //   그 전환은 발생하지 않는다. 가변 지연이 필요해지면 이 주석과 함께 재판정할 것.
  return delay <= 0 ? value : debouncedValue;
}
