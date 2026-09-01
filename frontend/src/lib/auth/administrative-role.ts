/**
 * 관리자 역할 판정의 클라이언트 SSOT.
 *
 * `/auth/me` 의 `role` 은 사용자 등급이 아니라 **authority id 원문**이다(UserDto 매퍼:
 * `authority.getAuthrtId()`, 없으면 `"ROLE_" + Role.name()`). 따라서 실제 관리자 값은
 * 대개 `ROLE_ADMIN` 이며, 화면이 `role === 'ADMIN'` 하나만 보면 **권한이 있는 관리자에게
 * 기능이 사라진다**.
 *
 * 이 값 집합은 라우트 게이트(src/proxy.ts 의 /admin 판정)와 반드시 같아야 한다. 어긋나면
 * 라우트는 통과하는데 화면 액션만 사라지는 비대칭이 생기고, 그건 조용히 죽는 결함이다
 * (2026-08-25 실측: 게시판 마스터의 생성 마법사 진입이 관리자에게 렌더되지 않아 e2e red).
 *
 * ⚠ 이것은 **표시 판정**이지 인가가 아니다. 실제 인가는 proxy 의 라우트 게이트와 백엔드
 *   메서드 인가가 수행한다. 여기에 값을 더해 화면을 열어도 서버 권한은 넓어지지 않는다.
 */
export const ADMINISTRATIVE_ROLES = ['ADMIN', 'SYSTEM', 'ROLE_ADMIN', 'ROLE_SYSTEM'] as const;

const ADMINISTRATIVE_ROLE_SET: ReadonlySet<string> = new Set(ADMINISTRATIVE_ROLES);

/** 대소문자 차이는 서버 표기 흔들림이므로 흡수한다(proxy 와 동일 규칙). */
export function isAdministrativeRole(role: string | null | undefined): boolean {
  return ADMINISTRATIVE_ROLE_SET.has((role ?? '').toUpperCase());
}

/** 사용자 관리 API가 허용하는 두 역할을 authority id 표기와 정규 표기에서 정규화한다. */
export function toManagedUserRole(role: string): 'USER' | 'ADMIN' {
  const normalized = role.trim().toUpperCase().replace(/^ROLE_/, '');
  if (normalized === 'USER' || normalized === 'ADMIN') return normalized;
  throw new Error('사용자 권한은 USER 또는 ADMIN만 허용됩니다.');
}
