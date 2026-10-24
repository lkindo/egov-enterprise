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

/*
 * [2026-10-24] 일반 세션을 스스로 폐기하는 요청(추가 인증 등록 시작)이 진행 중인 동안의 표지. 서버는 그 요청을 처리하는 순간 세션을
 * 폐기하므로, 응답이 오기 전에 다른 조회가 401 을 받고 재발급까지 실패할 수 있다 — 그 실패는 세션 만료가 아니다. 인터셉터는 이 표지가
 * 있으면 만료 화면으로 보내지 않는다(PR #972 의 MFA flaky). 요청이 끝나면(성공·실패 모두) 표지를 걷는다.
 */
let sessionTransitions = 0;

/** 표지를 세우고, 걷는 함수를 돌려준다. 두 번 불러도 한 번만 걷는다. */
export function beginSessionTransition(): () => void {
  if (typeof window === 'undefined') return () => {};
  sessionTransitions += 1;
  let ended = false;
  return () => {
    if (ended) return;
    ended = true;
    sessionTransitions -= 1;
  };
}

export function isSessionTransitionPending(): boolean {
  return typeof window !== 'undefined' && sessionTransitions > 0;
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
