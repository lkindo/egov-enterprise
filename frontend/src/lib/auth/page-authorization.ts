import { PAGE_PERMISSIONS } from '@/types/generated-permissions';
import { authorizationStateSchema, type AuthorizationState } from '@/lib/auth/authorization-state';
import { canAnyPermission } from '@/lib/auth/permissions';
import { executeGeneratedFetchOperation } from '@/lib/api/generated-api-client';
import { getCurrentUserOperation } from '@/types/generated-operations';

/** Exact page ownership: an authenticated parent shell never opens unregistered children. */
export function canEnterRegisteredPage(pathname: string, subject: AuthorizationState): boolean {
  const segments = pathname.replace(/\/$/, '').split('/');
  const entry = Object.entries(PAGE_PERMISSIONS).find(([route]) => {
    const routeSegments = route.replace(/\/$/, '').split('/');
    return routeSegments.length === segments.length && routeSegments.every((segment, index) =>
      /^\[[^.[\]]+\]$/.test(segment) ? segments[index].length > 0 : segment === segments[index],
    );
  });
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
