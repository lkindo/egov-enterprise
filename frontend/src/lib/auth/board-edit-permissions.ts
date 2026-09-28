import { canPermission } from './permissions';

/** 서버 설정으로 지정된 게시판의 추가 편집 권한. 기존 기능·소유권 검사는 호출부가 유지한다. */
export function canEditConfiguredBoard(
  user: { permissions?: readonly string[]; authorizationVersion?: string } | null | undefined,
  meta: { requiredEditPermissions?: readonly string[] } | null | undefined,
): boolean {
  return Array.isArray(meta?.requiredEditPermissions)
    && meta.requiredEditPermissions.every(permission => canPermission(user, permission));
}
