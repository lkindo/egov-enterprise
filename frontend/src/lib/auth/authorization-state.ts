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

/** A signal carries no identity, tokens or client-supplied grants. Consumers re-fetch /auth/me. */
export function notifyAuthorizationChanged(): void {
  if (typeof window !== 'undefined') window.dispatchEvent(new Event(AUTHORIZATION_CHANGED_EVENT));
}
