import SearchShell from './SearchShell';
import SearchResultsSlot from './SearchResultsSlot';

/**
 * `/search` — 통합 검색.
 *
 * <p><b>[2026-08-12 구조 변경] 검색어 해석을 서버로 되돌린다.</b>
 *
 * 종전에는 이 서버 컴포넌트가 `searchParams` 를 **받지도 쓰지도 않고** 클라이언트에게 넘겼고,
 * 클라이언트가 렌더 도중 `useSearchParams()` 로 검색어를 다시 만들었다. 그런데 이 라우트는
 * PPR 대상이라(`next.config` `cacheComponents: true`) 정적 셸은 **검색어 없는 상태**로 프리렌더된다.
 * 즉 서버가 그리는 것과 클라이언트 첫 렌더가 **어긋나는 것이 설계**였고, 그래서
 * `Minified React error #418`(hydration mismatch)이 간헐적으로 터졌다.
 *
 * 종전 수정(#382)은 입력칸 값 하나만 맞췄다. 그것으로는 계열이 닫히지 않는다 —
 * 검색어에서 파생되는 렌더가 하나라도 늘면 같은 결함이 다시 열린다.
 * **서버가 검색어의 단일 출처가 되면 어긋날 값 자체가 사라진다.**
 *
 * <p>⚠ 이 함수는 <b>async 가 아니다</b>. `searchParams` 를 여기서 await 하면 페이지 전체가
 * 요청 시점 렌더가 되어 정적 셸이 사라진다. 프라미스를 그대로 넘겨 <b>Suspense 안쪽</b>
 * (`SearchResultsSlot`)에서 await 해야 셸은 프리렌더되고 검색어 의존 부분만 홀로 남는다.
 * PPR 을 포기하는 것이 아니라 의도대로 쓰는 것이다.
 *
 * <p>회귀 방어: `__tests__/SearchClient.hydration.test.tsx` — 렌더 도중 `useSearchParams()` 를
 * 읽으면 red 가 된다.
 */
export default function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  return (
    <SearchShell>
      <SearchResultsSlot searchParams={searchParams} />
    </SearchShell>
  );
}
