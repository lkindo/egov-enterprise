import { z } from 'zod';

const identifier = z.string().min(1).refine((value) => value === value.trim());
const identifiers = z.array(identifier).refine((values) => new Set(values).size === values.length);

/** Display state only. The server re-evaluates permissions for every protected operation. */
export const authorizationStateSchema = z.strictObject({
  groups: identifiers,
  permissions: identifiers,
  authorizationVersion: identifier,
});

export type AuthorizationState = z.infer<typeof authorizationStateSchema>;

/** Legacy identity responses may authenticate a user, but never synthesize functional grants. */
export function normalizeAuthorizationState(value: Record<string, unknown>): AuthorizationState {
  if (value.groups === undefined && value.permissions === undefined && value.authorizationVersion === undefined) {
    return { groups: [], permissions: [], authorizationVersion: '' };
  }
  return authorizationStateSchema.parse({
    groups: value.groups,
    permissions: value.permissions,
    authorizationVersion: value.authorizationVersion,
  });
}

export const AUTHORIZATION_CHANGED_EVENT = 'authorization-changed';

// Browser memory only; never a credential and never shared between server requests.
let requestEpoch = 0;

export function advanceAuthorizationRequestEpoch(): void {
  if (typeof window !== 'undefined') requestEpoch += 1;
}

export function getAuthorizationRequestEpoch(): number | undefined {
  return typeof window === 'undefined' ? undefined : requestEpoch;
}

export function assertCurrentAuthorizationRequest(epoch: number | undefined): void {
  if (epoch !== undefined && typeof window !== 'undefined' && epoch !== requestEpoch) {
    const error = new Error('인증 상태가 변경되어 이전 요청 결과를 취소했습니다.');
    error.name = 'CanceledError';
    throw error;
  }
}

/*
 * [2026-09-26 DIP B4] 로그아웃한 뒤 다음 로그인까지는 인증 경로 밖의 요청을 보내지 않는다.
 *
 * 로그아웃은 캐시를 비우는데(AuthContext.commitUser), 사용자 상태를 구독하는 화면은 그 순간 다시 렌더되며 비워진
 * 조회를 새로 시작한다. 그 요청은 쿠키가 지워진 뒤에 도착해 401 → 재발급 401 → `/login?expired=true` 로 번져,
 * 정상 로그아웃을 '세션 만료' 처럼 보이게 했다. 서버의 익명 허용 API 는 인증 경로와 health 뿐이라, 로그아웃
 * 상태의 다른 요청은 어차피 401 이다 — 네트워크에 보내기 전에 취소한다.
 */
let signedOut = false;
const SIGNED_OUT_ALLOWED_URL = /(?:^|\/)(?:auth\/|health(?:$|\?))/;

export function markSignedOut(): void {
  if (typeof window !== 'undefined') signedOut = true;
}

export function markSignedIn(): void {
  signedOut = false;
}

export function isSignedOut(): boolean {
  return typeof window !== 'undefined' && signedOut;
}

export function assertRequestAllowedWhileSignedOut(url: string | undefined): void {
  if (!isSignedOut() || SIGNED_OUT_ALLOWED_URL.test(url ?? '')) return;
  const error = new Error('로그아웃한 뒤의 요청이라 보내지 않았습니다.');
  error.name = 'CanceledError';
  throw error;
}

/** A signal carries no identity, tokens or client-supplied grants. Consumers re-fetch /auth/me. */
export function notifyAuthorizationChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTHORIZATION_CHANGED_EVENT));
}
