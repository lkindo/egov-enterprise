import { afterEach, describe, expect, it } from 'vitest';
import {
  assertRequestAllowedWhileSignedOut,
  authorizationStateSchema,
  isSignedOut,
  markSignedIn,
  markSignedOut,
  normalizeAuthorizationState,
} from '../authorization-state';

describe('authorization display state', () => {
  it('keeps groups separate from functional permissions, including a group without grants', () => {
    expect(normalizeAuthorizationState({ groups: ['ROLE_SYSTEM', 'REVIEW'], permissions: [], authorizationVersion: 'v2' }))
      .toEqual({ groups: ['ROLE_SYSTEM', 'REVIEW'], permissions: [], authorizationVersion: 'v2' });
  });

  it('never translates a legacy administrator role into permissions', () => {
    expect(normalizeAuthorizationState({ role: 'ROLE_ADMIN' }))
      .toEqual({ groups: [], permissions: [], authorizationVersion: '' });
  });

  it.each([
    { groups: ['EDITOR'] },
    { groups: [], permissions: ['EXAMPLE_READ'], authorizationVersion: '' },
    { groups: ['ROLE_SYSTEM', 'ROLE_SYSTEM'], permissions: [], authorizationVersion: 'v1' },
    { groups: [], permissions: [' EXAMPLE_READ'], authorizationVersion: 'v1' },
    { groups: [], permissions: [true], authorizationVersion: 'v1' },
  ])('rejects malformed or incomplete state instead of partially trusting it', (value) => {
    expect(() => normalizeAuthorizationState(value)).toThrow();
  });

  describe('로그아웃 뒤 요청 차단 (DIP B4)', () => {
    afterEach(() => markSignedIn());

    it('로그아웃 전에는 어떤 요청도 막지 않는다', () => {
      expect(isSignedOut()).toBe(false);
      expect(() => assertRequestAllowedWhileSignedOut('/admin/system/users')).not.toThrow();
    });

    it('로그아웃 뒤에는 인증 경로 밖의 요청을 CanceledError 로 막는다', () => {
      markSignedOut();
      for (const url of ['/admin/system/users', '/api/v1/admin/system/authorities', '/menus/head', '/authorities', undefined]) {
        expect(() => assertRequestAllowedWhileSignedOut(url), String(url)).toThrow(expect.objectContaining({ name: 'CanceledError' }));
      }
    });

    it('로그아웃 뒤에도 인증 경로와 health 는 보낸다 — 다시 로그인할 길이다', () => {
      markSignedOut();
      for (const url of ['/auth/me', '/api/v1/auth/me', '/api/auth/login', '/api/auth/logout', '/api/auth/reissue', '/health', '/api/v1/health?x=1']) {
        expect(() => assertRequestAllowedWhileSignedOut(url), url).not.toThrow();
      }
    });

    it('다시 로그인하면 막지 않는다', () => {
      markSignedOut();
      markSignedIn();
      expect(() => assertRequestAllowedWhileSignedOut('/admin/system/users')).not.toThrow();
    });
  });

  it('rejects undeclared token fields in a browser authorization response', () => {
    expect(authorizationStateSchema.safeParse({ groups: [], permissions: [], authorizationVersion: 'v1', accessToken: 'unexpected' }).success).toBe(false);
  });
});
