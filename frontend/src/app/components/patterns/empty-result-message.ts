/**
 * G15 — `결과 없음`과 `데이터 없음`을 구분한다.
 *
 * 정본 스펙: docs/02-architecture/work-screen-grammar-catalog.md §3 G15.
 *
 * StandardDataTable 은 **자기가 검색창을 소유할 때만** 검색어를 아는 구조라, 조회 조건이
 * WorkListPage 의 조회 조건 영역(G2)으로 올라가면 표는 검색 여부를 알 수 없게 된다. 그대로 두면
 * "등록된 데이터가 없습니다"가 검색 결과가 없을 때도 뜨고, 사용자는 조건을 잘못 넣은 것인지
 * 데이터 자체가 없는 것인지 구분하지 못한다.
 *
 * 그래서 화면이 현재 적용된 검색어를 표에 문구로 내려준다 — 표의 계약(emptyMessage)은 그대로 두고
 * 판단만 화면이 한다.
 */
export function emptyResultMessage(keyword: string | undefined | null, fallback: string): string {
  const applied = keyword?.trim();
  return applied ? `"${applied}"에 대한 검색 결과가 없습니다.` : fallback;
}
