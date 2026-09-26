import { authorizationStateSchema, type AuthorizationState } from '@/lib/auth/authorization-state';
import { executeGeneratedFetchOperation } from '@/lib/api/generated-api-client';
import { getCurrentUserOperation } from '@/types/generated-operations';

// 판정 자체는 순수 모듈에 둔다 — 화면의 링크 노출이 같은 함수를 쓴다(page-access.ts).
export { canEnterRegisteredPage } from '@/lib/auth/page-access';

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
