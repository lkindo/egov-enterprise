/**
 * @deprecated Legacy role spelling compatibility only. It is not an authorization source.
 * Current UI and page authorization use permissions.ts and the current server snapshot.
 */
export const ADMINISTRATIVE_ROLES = ['ADMIN', 'SYSTEM', 'ROLE_ADMIN', 'ROLE_SYSTEM'] as const;

const ADMINISTRATIVE_ROLE_SET: ReadonlySet<string> = new Set(ADMINISTRATIVE_ROLES);

/** Normalize only legacy display values; never use this result to grant a capability. */
export function isAdministrativeRole(role: string | null | undefined): boolean {
  return ADMINISTRATIVE_ROLE_SET.has((role ?? '').toUpperCase());
}

/** Retained compatibility parser. Group assignment uses the versioned membership API. */
export function toManagedUserRole(role: string): 'USER' | 'ADMIN' {
  const normalized = role.trim().toUpperCase().replace(/^ROLE_/, '');
  if (normalized === 'USER' || normalized === 'ADMIN') return normalized;
  throw new Error('사용자 권한은 USER 또는 ADMIN만 허용됩니다.');
}
