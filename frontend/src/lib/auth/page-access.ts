import { PAGE_PERMISSIONS } from '@/types/generated-permissions';
import { canAnyPermission } from '@/lib/auth/permissions';

/**
 * 화면 진입 판정 — 라우트 게이트(proxy.ts)와 화면의 링크·버튼 노출이 같은 함수를 쓴다.
 *
 * ⚠ 이 모듈은 순수 함수만 둔다. 서버 조회(`loadPageAuthorization`)는 page-authorization.ts 에 남겨
 *   클라이언트 번들이 BFF 조회 코드를 끌고 오지 않게 한다.
 *
 * [2026-09-26 DIP B4 P1] 종전에는 화면마다 버튼 노출을 제각각 판정했다. 워크허브의 '메모보고 관리'
 * 는 `DEPT_BOX_READ` 로 버튼을 보였지만 목적지 라우트는 `MEMO_RPT_READ_ALL` 을 요구해, 버튼을 누르면
 * 홈으로 튕겼다. 라우트는 막는데 화면만 보이는 비대칭은 조용히 죽는 결함이다(DEC-OPS-023 ②).
 */

interface PageAccessSubject {
  permissions?: readonly string[];
  authorizationVersion?: string;
}

function isDynamicSegment(segment: string): boolean {
  return /^\[[^.[\]]+\]$/.test(segment);
}

/**
 * 라우트가 요구하는 기능권한. 등록되지 않은 경로는 null 이다(라우트 게이트는 거부한다).
 * 빈 배열은 인증된 누구나 들어갈 수 있다는 뜻이다.
 */
export function registeredPagePermissions(pathname: string): readonly string[] | null {
  const normalizedPath = pathname.replace(/\/$/, '');
  const segments = normalizedPath.split('/');
  const exact = PAGE_PERMISSIONS[normalizedPath];
  if (exact) return exact;
  // Next resolves static routes before sibling dynamic routes such as [id].
  // An authenticated detail route must never shadow a protected management page.
  const entry = Object.entries(PAGE_PERMISSIONS).find(([route]) => {
    const routeSegments = route.replace(/\/$/, '').split('/');
    return routeSegments.length === segments.length && routeSegments.every((segment, index) =>
      isDynamicSegment(segment) ? segments[index].length > 0 : segment === segments[index],
    );
  });
  return entry ? entry[1] : null;
}

/** Exact page ownership: an authenticated parent shell never opens unregistered children. */
export function canEnterRegisteredPage(pathname: string, subject: PageAccessSubject | null | undefined): boolean {
  const required = registeredPagePermissions(pathname);
  if (!required) return false;
  return required.length === 0 || canAnyPermission(subject, required);
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
