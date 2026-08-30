/**
 * 페이지를 끝까지 따라가 **전량**을 모은다.
 *
 * <p>[왜 필요한가 — 2026-08-30] 서버가 `pageUnit` 에 `@Max(100)` 을 걸면서(BaseSearchDto),
 * "한 페이지에 전부 받기" 로 전량을 얻던 화면들이 400 을 받게 됐다. 그 값을 그냥 100 으로
 * 낮추면 **조용히 잘린 목록**이 되는데, 그중 일부는 그 목록을 그대로 되돌려 저장하는
 * 전체 교체 경로다 — 보지 못한 페이지가 저장 시 삭제된다(권한-롤 매핑이 정확히 그렇다).
 *
 * <p>그래서 값을 키우지도, 낮춰서 자르지도 않고 **끝까지 따라간다**. 서버 상한을 존중하면서
 * 완전성도 지키는 유일한 방법이다.
 *
 * <p>⚠ 상한에 걸리면 <b>조용히 자르지 않고 예외를 던진다.</b> 잘린 목록을 정상처럼 돌려주면
 * 호출부는 그것이 전부인 줄 알고 저장해 버린다 — 이 헬퍼가 막으려던 바로 그 사고다.
 */

/** 서버 페이지 응답의 최소 형태. 소비자마다 추가 필드가 있어도 무방하다. */
export interface PagedResult<T> {
  list: T[];
  total: number;
}

/** 서버가 허용하는 최대 페이지 크기(BaseSearchDto.MAX_PAGE_UNIT 와 같은 값). */
export const MAX_PAGE_UNIT = 100;

/**
 * 안전 상한 — 이 이상은 화면이 한 번에 다룰 양이 아니다.
 *
 * <p>무한 루프 방지가 아니라 **설계 신호**다. 여기 걸린다면 그 화면은 전량 로드가 아니라
 * 서버측 검색·페이징으로 바꿔야 한다.
 */
const MAX_TOTAL_ITEMS = 5_000;

/**
 * `fetchPage(pageIndex, pageUnit)` 를 1페이지부터 끝까지 호출해 항목을 이어 붙인다.
 *
 * @param fetchPage 1-base `pageIndex` 와 `pageUnit` 을 받아 페이지를 돌려주는 함수
 * @returns 모든 페이지의 항목을 순서대로 이어 붙인 배열
 * @throws Error 총 건수가 안전 상한을 넘으면 — 잘린 결과를 돌려주지 않는다
 */
export async function fetchAllPages<T>(
  fetchPage: (pageIndex: number, pageUnit: number) => Promise<PagedResult<T>>,
): Promise<T[]> {
  const collected: T[] = [];
  let expectedTotal: number | null = null;

  for (let pageIndex = 1; ; pageIndex += 1) {
    const page = await fetchPage(pageIndex, MAX_PAGE_UNIT);
    if (
      !page
      || !Array.isArray(page.list)
      || !Number.isSafeInteger(page.total)
      || page.total < 0
      || page.list.length > MAX_PAGE_UNIT
    ) {
      throw new Error('페이지 응답 형식이 올바르지 않습니다. 전량 조회를 완료할 수 없습니다.');
    }

    if (expectedTotal === null) {
      expectedTotal = page.total;
      if (expectedTotal > MAX_TOTAL_ITEMS) {
        throw new Error(
          `전량 조회가 안전 상한(${MAX_TOTAL_ITEMS}건)을 넘었습니다. `
          + '이 화면은 전량 로드가 아니라 서버측 검색·페이징으로 바꿔야 합니다.',
        );
      }
    } else if (page.total !== expectedTotal) {
      throw new Error('전체 건수가 페이지 사이에 변경되어 전량 조회를 완료할 수 없습니다.');
    }

    const items = page.list;
    if (collected.length + items.length > expectedTotal) {
      throw new Error('전체 건수와 페이지 응답이 일치하지 않습니다. 전량 조회를 완료할 수 없습니다.');
    }
    collected.push(...items);

    if (collected.length === expectedTotal) {
      return collected;
    }

    const expectedPages = Math.ceil(expectedTotal / MAX_PAGE_UNIT);
    if (items.length === 0 || items.length < MAX_PAGE_UNIT || pageIndex >= expectedPages) {
      throw new Error(
        '전체 건수와 페이지 응답이 일치하지 않습니다. 전량 조회를 완료할 수 없습니다.',
      );
    }
  }
}
