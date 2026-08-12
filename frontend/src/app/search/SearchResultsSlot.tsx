import { SearchResultsContent } from './SearchClient';

/**
 * 검색어에 의존하는 **동적 슬롯**. PPR 의 홀(hole)에 해당한다.
 *
 * <p>[2026-08-12 신설] `searchParams` 를 **여기서** await 하는 것이 핵심이다.
 * page 함수에서 곧바로 await 하면 페이지 전체가 요청 시점 렌더가 되어 정적 셸이 사라진다
 * (실측: 그렇게 했을 때 `search.html` 이 2.6KB 로 줄어 검색 UI 가 통째로 홀이 됐다).
 * 요청 정보를 Suspense 안쪽에서 읽으면 셸은 그대로 프리렌더되고 이 부분만 스트리밍된다 —
 * 그것이 PPR 이 의도한 형태다.
 *
 * <p><b>왜 서버가 검색어를 해석하는가</b>: 종전에는 클라이언트가 렌더 도중
 * `useSearchParams()` 로 검색어를 다시 만들었고, 정적 셸은 검색어 없이 프리렌더되므로
 * 서버 HTML 과 클라이언트 첫 렌더가 어긋났다(`Minified React error #418`).
 * 서버가 단일 출처가 되면 **어긋날 값 자체가 존재하지 않는다.**
 */
export default async function SearchResultsSlot({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q = '' } = await searchParams;

  return (
    <SearchResultsContent
      // key={q}: 검색어가 바뀌면 트리를 새로 만든다. 재조정(reconcile)하면 이전 질의의
      //   입력값·결과가 잠시 섞인다 — 검색은 매 질의가 독립된 화면이다.
      key={q}
      // 첫 렌더의 결과는 항상 비어 있다 — 서버와 클라이언트가 같은 출발점을 갖게 고정한다.
      // 실제 결과는 마운트 이후 조회로 채워지며, 그것은 하이드레이션 **이후**의 상태 변경이라
      // 불일치와 무관하다. (검색어만은 서버가 준 값을 그대로 쓴다.)
      initialResults={{ articles: [], users: [], menus: [] }}
      query={q}
    />
  );
}
