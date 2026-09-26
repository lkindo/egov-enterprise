import { PAGE_PERMISSIONS } from '@/types/generated-permissions';
import type { PermissionCode } from '@/types/generated-permissions';
import { authorizationStateSchema, type AuthorizationState } from '@/lib/auth/authorization-state';
import { canAnyPermission } from '@/lib/auth/permissions';
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

/** Exact page ownership: an authenticated parent shell never opens unregistered children. */
export function canEnterRegisteredPage(pathname: string, subject: PageAccessSubject | null | undefined): boolean {
  const entry = registeredPageEntry(pathname);
  if (!entry) return false;
  const required = entry[1];
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
