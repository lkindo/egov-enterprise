// @vitest-environment node
import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  VERIFIED_USER_HEADER,
  signVerifiedUserHeader,
  verifyVerifiedUserHeader,
} from '@/lib/auth/verified-user-forward';
import type { UserInfo } from '@/services/foundation/auth/authService';

const FIXTURE_USER: UserInfo = {
  id: 'webmaster',
  esntlId: 'USRCNFRM_00000000001',
  name: '웹마스터',
  groups: ['ROLE_ADMIN'],
  permissions: ['MENU_READ', 'BBS_MST_READ'],
  authorizationVersion: 'v42',
};

describe('verified-user-forward', () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it('signs and verifies a short-lived user handoff bound to the accessToken', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_SECRET', 'unit-test-forward-secret-0123456789');

    const header = await signVerifiedUserHeader(FIXTURE_USER, 'token-alpha', { nowMs: 1_000_000 });
    expect(header).toBeTruthy();

    const verified = await verifyVerifiedUserHeader(header, 'token-alpha', { nowMs: 1_002_000 });
    expect(verified).toEqual(FIXTURE_USER);
  });

  it('rejects expired, tampered, wrong-token, and malformed headers fail-closed', async () => {
    vi.stubEnv('NODE_ENV', 'test');
    vi.stubEnv('JWT_SECRET', 'unit-test-forward-secret-0123456789');

    const header = await signVerifiedUserHeader(FIXTURE_USER, 'token-alpha', { nowMs: 1_000_000, ttlMs: 5_000 });
    expect(header).toBeTruthy();
    const [payloadB64, sigB64] = header!.split('.');

    // expired
    await expect(verifyVerifiedUserHeader(header, 'token-alpha', { nowMs: 1_005_000 })).resolves.toBeNull();
    // different token
    await expect(verifyVerifiedUserHeader(header, 'token-beta', { nowMs: 1_001_000 })).resolves.toBeNull();
    // tampered payload
    const forgedPayload = Buffer.from(
      JSON.stringify({
        user: { ...FIXTURE_USER, permissions: ['SUPER_ALL'] },
        exp: 1_005_000,
        tokenHash: 'tampered',
      }),
    ).toString('base64url');
    await expect(verifyVerifiedUserHeader(`${forgedPayload}.${sigB64}`, 'token-alpha', { nowMs: 1_001_000 })).resolves.toBeNull();
    // tampered signature
    await expect(verifyVerifiedUserHeader(`${payloadB64}.AAAA`, 'token-alpha', { nowMs: 1_001_000 })).resolves.toBeNull();
    // malformed header
    await expect(verifyVerifiedUserHeader('only-one-part', 'token-alpha', { nowMs: 1_001_000 })).resolves.toBeNull();
    expect(VERIFIED_USER_HEADER).toBe('x-nuri-verified-user');
  });

  it('uses an ephemeral CSPRNG secret when INTERNAL_USER_FORWARD_SECRET and JWT_SECRET are unset and rejects JWT_VERIFY_KEYS_JSON forgeries', async () => {
    const publicKeysJson = JSON.stringify({ k1: 'public-spki-fixture-value' });
    try {
      vi.stubEnv('INTERNAL_USER_FORWARD_SECRET', publicKeysJson);
      const forgedSameSecret = await signVerifiedUserHeader(FIXTURE_USER, 'token-alpha', { nowMs: 1_000_000 });
      expect(forgedSameSecret).toBeTruthy();

      vi.stubEnv('NODE_ENV', 'production');
      vi.stubEnv('INTERNAL_USER_FORWARD_SECRET', '');
      vi.stubEnv('JWT_SECRET', '');
      vi.stubEnv('JWT_VERIFY_KEYS_JSON', publicKeysJson);

      const ephemeralSigned = await signVerifiedUserHeader(FIXTURE_USER, 'token-alpha', { nowMs: 1_000_000 });
      expect(ephemeralSigned).toBeTruthy();
      await expect(
        verifyVerifiedUserHeader(ephemeralSigned, 'token-alpha', { nowMs: 1_001_000 }),
      ).resolves.toEqual(FIXTURE_USER);

      await expect(
        verifyVerifiedUserHeader(forgedSameSecret, 'token-alpha', { nowMs: 1_001_000 }),
      ).resolves.toBeNull();

      const [payloadPart] = (ephemeralSigned ?? '').split('.');
      const rawKey = await globalThis.crypto.subtle.importKey(
        'raw',
        new TextEncoder().encode(publicKeysJson),
        { name: 'HMAC', hash: 'SHA-256' },
        false,
        ['sign'],
      );
      const rawSig = await globalThis.crypto.subtle.sign('HMAC', rawKey, new TextEncoder().encode(payloadPart));
      const rawForged = `${payloadPart}.${Buffer.from(rawSig).toString('base64url')}`;
      await expect(
        verifyVerifiedUserHeader(rawForged, 'token-alpha', { nowMs: 1_001_000 }),
      ).resolves.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });

  it('prefers INTERNAL_USER_FORWARD_SECRET independently of JWT_SECRET', async () => {
    const dedicatedV1 = globalThis.crypto.randomUUID();
    const dedicatedV2 = globalThis.crypto.randomUUID();
    const jwtV1 = globalThis.crypto.randomUUID();
    const jwtV2 = globalThis.crypto.randomUUID();
    try {
      vi.stubEnv('INTERNAL_USER_FORWARD_SECRET', dedicatedV1);
      vi.stubEnv('JWT_SECRET', jwtV1);

      const signed = await signVerifiedUserHeader(FIXTURE_USER, 'token-alpha', { nowMs: 1_000_000 });
      expect(signed).toBeTruthy();

      vi.stubEnv('JWT_SECRET', jwtV2);
      await expect(
        verifyVerifiedUserHeader(signed, 'token-alpha', { nowMs: 1_001_000 }),
      ).resolves.toEqual(FIXTURE_USER);

      vi.stubEnv('INTERNAL_USER_FORWARD_SECRET', dedicatedV2);
      await expect(
        verifyVerifiedUserHeader(signed, 'token-alpha', { nowMs: 1_001_000 }),
      ).resolves.toBeNull();
    } finally {
      vi.unstubAllEnvs();
    }
  });
});
