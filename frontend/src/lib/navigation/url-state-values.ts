/**
 * 주소(쿼리)에서 읽은 값을 화면이 쓰기 전에, 그리고 다시 실을 때 같은 규칙으로 닫는다(2026-11-08, URL 상태 소급 확인).
 *
 * 화면이 해석한 값과 주소에 다시 싣는 값이 다르면 두 가지가 생긴다.
 * - 화면은 기본값을 보이는데 주소에는 형식이 아닌 원래 값이 계속 실린다(메모 보고·모니터링 허브).
 * - 입력은 통과했는데 읽을 때 버려져 조회 조건이 조용히 빠진다(댓글 관리 글 번호).
 * 그래서 읽기·입력·다시 싣기가 이 파일의 같은 함수를 쓴다. 공통 기반 경로라 어느 기능이 써도 기능 사이 import 가 생기지 않는다.
 */

/** 1 이상의 안전 정수를 나타내는 10진 문자열(앞의 0·부호·소수점·지수 없음). */
const POSITIVE_INTEGER_TEXT = /^[1-9]\d{0,15}$/;

/** 1 이상의 안전 정수 문자열인가 — 글 번호처럼 서버가 정수로 받는 식별자의 입력·주소 값 검사. */
export function isPositiveIntegerText(value: string | null | undefined): value is string {
  return typeof value === 'string' && POSITIVE_INTEGER_TEXT.test(value) && Number.isSafeInteger(Number(value));
}

/** 주소의 page 를 1 이상의 안전 정수로 읽는다. 형식이 아니면 1 이다(`2.5`·`Infinity`·`1e3`·`-2` 모두 1). */
export function parsePositivePage(value: string | null | undefined): number {
  return isPositiveIntegerText(value) ? Number(value) : 1;
}

/**
 * 게시판 ID 처럼 영문·숫자·`_`·`-` 로 된 경로 키(1~40자)인가. 주소에 다시 실을 때 구분자(`&`·`=`·`?`·`#`)가 섞이지 않게 하는
 * 문자 제한이다 — 게시판을 만들 때의 ID 규칙을 대신하지 않는다.
 */
const ROUTE_KEY = /^[A-Za-z0-9_-]{1,40}$/;

/** 경로 키 형식이면 그 값을, 아니면 null 을 돌려준다. */
export function normalizeRouteKey(value: string | null | undefined): string | null {
  return typeof value === 'string' && ROUTE_KEY.test(value) ? value : null;
}
