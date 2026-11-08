import { PAGE_PERMISSIONS, PAGE_PERMISSION_MODES } from '@/types/generated-permissions';
import type { PermissionCode } from '@/types/generated-permissions';
import { authorizationStateSchema, type AuthorizationState } from '@/lib/auth/authorization-state';
import { canAnyPermission, canPermission } from '@/lib/auth/permissions';
import { executeGeneratedFetchOperation } from '@/lib/api/generated-api-client';
import { getCurrentUserOperation } from '@/types/generated-operations';

interface PageAccessSubject {
  permissions?: readonly string[];
  authorizationVersion?: string;
}

/**
 * 경로를 소유한 등록 페이지 항목. 정확한 경로가 먼저이고, 없으면 세그먼트 수가 같은 동적 형제다. 등록되지 않았으면 null.
 * [2026-09-26 DIP B4 P1] 화면의 링크 노출(page-access.ts canOpenPage)과 census 가 같은 판정을 쓰도록 떼어 냈다.
 */
export function registeredPageEntry(pathname: string): readonly [string, readonly PermissionCode[]] | null {
  const normalizedPath = pathname.replace(/\/$/, '');
  const segments = normalizedPath.split('/');
  const exact = PAGE_PERMISSIONS[normalizedPath];
  // Next resolves static routes before sibling dynamic routes such as [id].
  // An authenticated detail route must never shadow a protected management page.
  const entry = exact ? [normalizedPath, exact] as const : Object.entries(PAGE_PERMISSIONS).find(([route]) => {
    const routeSegments = route.replace(/\/$/, '').split('/');
    return routeSegments.length === segments.length && routeSegments.every((segment, index) =>
      /^\[[^.[\]]+\]$/.test(segment) ? segments[index].length > 0 : segment === segments[index],
    );
  });
  return entry ?? null;
}

/**
 * 기능권한이 등록된 화면인가 — 라우트 게이트(proxy.ts)와 링크 노출(page-access.ts)은 `/admin` 전체와 함께 이런 화면을 막는다.
 * [2026-11-08] `/admin` 밖의 관리 조회 화면(설문 응답 목록·상세, SURVEY_RSP_READ)은 화면이 먼저 열린 뒤 데이터 API 가 403 으로
 * 막는 비대칭이었다. 권한이 빈 배열인 화면(인증만 요구)과 등록되지 않은 `/admin` 밖 화면은 대상이 아니다.
 *
 * 게이트에 넣을지만 정한다 — 들어갈 수 있는지는 canEnterRegisteredPage(대소문자 그대로, 정확한 경로 우선)가 정한다.
 * 그래서 대소문자를 가리지 않고 권한이 등록된 경로 모양과 맞으면 넣는다: `/Survey/Response` 같은 흉내는 게이트에 들어가
 * 등록되지 않은 경로로 거부된다(`/admin` 분기와 같은 원칙). 정확히 등록된 화면은 그 등록이 정한다 — 인증만 요구하는 정적 화면을
 * 같은 깊이의 동적 형제(권한 있음) 때문에 권한 조회에 묶으면, 조회가 실패할 때 정상 사용자가 막힌다(2026-11-08 Codex 13차).
 */
export function requiresRegisteredPermission(pathname: string): boolean {
  const normalizedPath = pathname.replace(/\/$/, '');
  const registered = PAGE_PERMISSIONS[normalizedPath];
  if (registered) return registered.length > 0;
  const segments = normalizedPath.toLowerCase().split('/');
  return Object.entries(PAGE_PERMISSIONS).some(([route, required]) => {
    if (required.length === 0) return false;
    const routeSegments = route.replace(/\/$/, '').toLowerCase().split('/');
    return routeSegments.length === segments.length && routeSegments.every((segment, index) =>
      /^\[[^.[\]]+\]$/.test(segment) ? segments[index].length > 0 : segment === segments[index],
    );
  });
}

/** Exact page ownership: an authenticated parent shell never opens unregistered children. */
export function canEnterRegisteredPage(pathname: string, subject: PageAccessSubject | null | undefined): boolean {
  const entry = registeredPageEntry(pathname);
  if (!entry) return false;
  const required = entry[1];
  if (PAGE_PERMISSION_MODES[entry[0]] === 'ALL') return required.length > 0 && required.every(permission => canPermission(subject, permission));
  return required.length === 0 || canAnyPermission(subject, required);
}

/** Read the current server snapshot, never a cached JWT role or browser-provided grants. */
export async function loadPageAuthorization(accessToken: string, subject: string): Promise<AuthorizationState | null> {
  const backend = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 5000);
  try {
    const data = await executeGeneratedFetchOperation(getCurrentUserOperation, {}, {
      baseUrl: backend,
      headers: { Authorization: `Bearer ${accessToken}`, Accept: 'application/json' },
      signal: controller.signal,
    });
    if (!data || typeof data !== 'object' || !('esntlId' in data) || data.esntlId !== subject) return null;
    const values = data as Record<string, unknown>;
    const parsed = authorizationStateSchema.safeParse({
      groups: values.groups,
      permissions: values.permissions,
      authorizationVersion: values.authorizationVersion,
    });
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  } finally {
    clearTimeout(timeout);
  }
}
