import { canEnterRegisteredPage, registeredPageEntry } from '@/lib/auth/page-authorization';

/**
 * 화면의 링크·버튼 노출 판정 — 라우트 게이트(proxy.ts)와 같은 함수(canEnterRegisteredPage)를 쓴다.
 *
 * [2026-09-26 DIP B4 P1] 종전에는 화면마다 버튼 노출을 제각각 판정했다. 워크허브의 '메모보고 관리' 는 `DEPT_BOX_READ` 로
 * 버튼을 보였지만 목적지 라우트는 `MEMO_RPT_READ_ALL` 을 요구해, 버튼을 누르면 홈으로 튕겼다. 라우트는 막는데 화면만
 * 보이는 비대칭은 조용히 죽는 결함이다(DEC-OPS-023 ②).
 *
 * 판정 구현은 page-authorization.ts 한 곳에 둔다 — 라우트 capability 계약이 그 파일의 판정을 결속한다.
 */

export { canEnterRegisteredPage };

interface PageAccessSubject {
  permissions?: readonly string[];
  authorizationVersion?: string;
}

/**
 * 라우트가 요구하는 기능권한. 등록되지 않은 경로는 null 이다(라우트 게이트는 거부한다).
 * 빈 배열은 인증된 누구나 들어갈 수 있다는 뜻이다.
 */
export function registeredPagePermissions(pathname: string): readonly string[] | null {
  return registeredPageEntry(pathname)?.[1] ?? null;
}

/** 라우트 게이트가 보는 부분만 남긴다 — 쿼리·해시는 판정에 쓰지 않는다. */
function pathOf(href: string): string {
  return href.split(/[?#]/, 1)[0];
}

/** proxy.ts 와 같은 경계: 소문자로 비교하되 세그먼트 경계를 지킨다(/administrators 는 대상이 아니다). */
function isGatedPath(path: string): boolean {
  const lower = path.toLowerCase();
  return lower === '/admin' || lower.startsWith('/admin/');
}

/**
 * 링크·버튼을 보여 줄지 판정한다. 라우트 게이트가 통과시킬 곳만 true 다.
 *
 * `/admin` 밖은 페이지 게이트가 없으므로 true 다(인증은 별도 경계). 판정은 노출일 뿐 인가가 아니다 —
 * 서버 권한은 이 함수와 무관하게 그대로 집행된다(H3).
 */
export function canOpenPage(subject: PageAccessSubject | null | undefined, href: string): boolean {
  const path = pathOf(href);
  if (!isGatedPath(path)) return true;
  return canEnterRegisteredPage(path, subject);
}
