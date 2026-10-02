import type { QueryClient } from '@tanstack/react-query';

/**
 * 구성원을 바꾼 뒤 다시 읽을 조회(2026-10-02, 관리 콘솔 UX 2단계 D6) — 그룹 구성원 목록, 사용자별 배정, 부서 명부, 유효권한
 * 제공 그룹, 변경 이력. 그룹 스냅샷·카탈로그는 다시 읽지 않는다 — 구성원 변경은 그룹 버전을 바꾸지 않으므로(S1) 열린 권한
 * 초안을 흔들 이유가 없다.
 */
const MEMBERSHIP_QUERY_KINDS = new Set(['group-members', 'membership', 'department-memberships', 'effective-groups', 'history']);

export function invalidateMembershipQueries(queryClient: QueryClient): Promise<void> {
  return queryClient.invalidateQueries({
    predicate: (query) => query.queryKey[0] === 'authorization' && MEMBERSHIP_QUERY_KINDS.has(String(query.queryKey[3])),
  });
}

/** 서버가 동시 변경(409)으로 거부했는가 — 다른 곳에서 구성원이 바뀌었으니 목록을 다시 읽어야 한다. */
export function isConflict(error: unknown): boolean {
  if (typeof error !== 'object' || error === null || !('response' in error)) return false;
  const response = (error as { response?: unknown }).response;
  return typeof response === 'object' && response !== null && (response as { status?: unknown }).status === 409;
}
