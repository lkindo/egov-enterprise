import { PERMISSION_CODES, type PermissionCode } from '@/types/generated-permissions';

interface PermissionSubject {
  permissions?: readonly string[];
  authorizationVersion?: string;
}

const registeredPermissions: ReadonlySet<string> = new Set(PERMISSION_CODES);

export function isPermissionCode(value: string): value is PermissionCode {
  return registeredPermissions.has(value);
}

/** Functional affordance only; ownership, participation and server enforcement remain separate. */
export function canPermission(subject: PermissionSubject | null | undefined, permission: string): boolean {
  return isPermissionCode(permission) &&
    typeof subject?.authorizationVersion === 'string' && subject.authorizationVersion.length > 0 &&
    Array.isArray(subject.permissions) && subject.permissions.includes(permission);
}

export function canAnyPermission(subject: PermissionSubject | null | undefined, permissions: readonly string[]): boolean {
  return permissions.some((permission) => canPermission(subject, permission));
}
