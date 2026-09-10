import { describe, expect, it } from 'vitest';
import { authorizationStateSchema, normalizeAuthorizationState } from '../authorization-state';

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

  it('rejects undeclared token fields in a browser authorization response', () => {
    expect(authorizationStateSchema.safeParse({ groups: [], permissions: [], authorizationVersion: 'v1', accessToken: 'unexpected' }).success).toBe(false);
  });
});
