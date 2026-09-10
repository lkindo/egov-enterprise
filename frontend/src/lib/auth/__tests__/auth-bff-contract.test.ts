import { describe, expect, it } from 'vitest';

import {
  authLoginDataSchema,
  authLoginResponseSchema,
  authLogoutDataSchema,
  authLogoutResponseSchema,
  authReissueResponseSchema,
} from '../auth-bff-contract';

const authorization = { groups: ['USER'], permissions: [], authorizationVersion: 'v1' };

describe('local auth BFF Zod contract', () => {
  it('accepts only the redacted login role payload', () => {
    expect(authLoginDataSchema.parse({ role: 'ROLE_USER', ...authorization })).toEqual({ role: 'ROLE_USER', ...authorization });
    expect(authLoginDataSchema.safeParse({
      role: 'ROLE_USER',
      ...authorization,
      accessToken: 'must-not-enter-js-state',
    }).success).toBe(false);
  });

  it('keeps login success and failure envelopes strict', () => {
    expect(authLoginResponseSchema.safeParse({
      success: true,
      data: { role: 'ROLE_ADMIN', ...authorization },
    }).success).toBe(true);
    expect(authLoginResponseSchema.safeParse({
      success: false,
      code: 'LOGIN_PROXY_ERROR',
      message: 'safe message',
      debug: 'internal trace',
    }).success).toBe(false);
  });

  it('forbids token material in the reissue response', () => {
    expect(authReissueResponseSchema.safeParse({ success: true, data: authorization }).success).toBe(true);
    expect(authReissueResponseSchema.safeParse({
      success: true,
      data: { ...authorization, accessToken: 'must-not-enter-js-state' },
    }).success).toBe(false);
  });

  it('rejects incomplete authorization snapshots on login and refresh', () => {
    expect(authLoginDataSchema.safeParse({ role: 'ROLE_ADMIN' }).success).toBe(false);
    expect(authReissueResponseSchema.safeParse({ success: true, data: {} }).success).toBe(false);
    expect(authLoginDataSchema.safeParse({ role: 'USER', ...authorization, groups: undefined }).success).toBe(false);
  });

  it('uses one strict logout acknowledgement for success and fail-safe clearing', () => {
    const acknowledgement = { cleared: true };
    expect(authLogoutDataSchema.parse(acknowledgement)).toEqual(acknowledgement);
    expect(authLogoutResponseSchema.safeParse({ success: true, data: acknowledgement }).success).toBe(true);
    expect(authLogoutDataSchema.safeParse({ ...acknowledgement, token: 'private' }).success).toBe(false);
  });
});
