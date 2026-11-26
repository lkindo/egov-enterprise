import { normalizeAuthUser, type UserInfo } from '@/services/foundation/auth/authService';

export const VERIFIED_USER_HEADER = 'x-nuri-verified-user';

const FORWARD_TTL_MS = 5_000;
const MAX_FORWARD_HEADER_LEN = 16_384;
const VERIFIED_USER_CACHE_MAX_ENTRIES = 128;
const EPHEMERAL_SECRET_SYMBOL = Symbol.for('nuri.verifiedUserForward.ephemeralSecret');

const encoder = new TextEncoder();
const decoder = new TextDecoder();
const hmacKeyCache = new Map<string, Promise<CryptoKey>>();

interface ForwardSecretMaterial {
  cacheId: string;
  keyBytes: Uint8Array<ArrayBuffer>;
}
const verifiedPageUsers = new Map<string, { user: UserInfo; exp: number }>();

/**
 * `loadPageAuthorization` 이 방금 파싱한 정상 사용자 스냅샷을 짧게 보관해 동일 요청의 `proxy` 가 재사용하게 한다.
 */
export function rememberVerifiedPageUser(accessToken: string, data: unknown): void {
  try {
    const user = normalizeAuthUser(data);
    const now = Date.now();
    for (const [key, entry] of verifiedPageUsers) {
      if (entry.exp <= now) {
        verifiedPageUsers.delete(key);
      }
    }
    while (verifiedPageUsers.size >= VERIFIED_USER_CACHE_MAX_ENTRIES) {
      const oldestKey = verifiedPageUsers.keys().next().value;
      if (oldestKey === undefined) break;
      verifiedPageUsers.delete(oldestKey);
    }
    verifiedPageUsers.set(accessToken, { user, exp: now + FORWARD_TTL_MS });
  } catch {
    // 일부 테스트 픽스처나 축약 응답은 display name 이 없어 normalizeAuthUser 를 건너뛴다 — null 로 안전 폴백.
  }
}

/**
 * 직전 `loadPageAuthorization` 호출에서 보관한 정상 사용자 스냅샷을 1회 소비한다.
 */
export function consumeVerifiedPageUser(accessToken: string): UserInfo | null {
  const entry = verifiedPageUsers.get(accessToken);
  verifiedPageUsers.delete(accessToken);
  if (!entry || entry.exp <= Date.now()) {
    return null;
  }
  return entry.user;
}

interface VerifiedUserEnvelope {
  user: UserInfo;
  exp: number;
  tokenHash: string;
}

function resolveEphemeralSecret(): Uint8Array<ArrayBuffer> | null {
  const randomValues = globalThis.crypto?.getRandomValues?.bind(globalThis.crypto);
  if (!randomValues) {
    return null;
  }
  const globalStore = globalThis as typeof globalThis & Record<symbol, Uint8Array<ArrayBuffer> | undefined>;
  let existing = globalStore[EPHEMERAL_SECRET_SYMBOL];
  if (!existing) {
    existing = randomValues(new Uint8Array(new ArrayBuffer(32)));
    globalStore[EPHEMERAL_SECRET_SYMBOL] = existing;
  }
  return existing;
}

function resolveForwardSecret(): ForwardSecretMaterial | null {
  // JWT_VERIFY_KEYS_JSON 은 공개키 목록이므로 절대 HMAC 공유 시크릿으로 사용하지 않는다.
  // [ADR-0060 2차 · 2026-11-25] 토큰 서명 비밀(JWT_SECRET)은 Next 에서 걷었다 — 전용 비밀이 없으면 프로세스 임시 키를 쓰고,
  //   검증이 맞지 않으면 서버 컴포넌트는 백엔드 조회로 돌아간다(verifyVerifiedUserHeader 의 fail-closed).
  const dedicated = process.env.INTERNAL_USER_FORWARD_SECRET;
  if (dedicated) {
    return {
      cacheId: `dedicated:${dedicated}`,
      keyBytes: encoder.encode(`nuri-verified-user-forward-v1:dedicated:${dedicated}`),
    };
  }
  const ephemeral = resolveEphemeralSecret();
  if (!ephemeral) {
    return null;
  }
  return {
    cacheId: 'ephemeral',
    keyBytes: ephemeral,
  };
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(input: string): Uint8Array<ArrayBuffer> | null {
  if (!input || !/^[A-Za-z0-9_-]+$/.test(input)) {
    return null;
  }
  const padded = input.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (input.length % 4)) % 4);
  try {
    const binary = atob(padded);
    const bytes = new Uint8Array(new ArrayBuffer(binary.length));
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

async function sha256Base64Url(value: string): Promise<string> {
  const digest = await globalThis.crypto.subtle.digest('SHA-256', encoder.encode(value));
  return bytesToBase64Url(new Uint8Array(digest));
}

function getHmacKey(secret: ForwardSecretMaterial): Promise<CryptoKey> {
  const cached = hmacKeyCache.get(secret.cacheId);
  if (cached) {
    return cached;
  }
  const promise = (async () => {
    const derivedKeyBytes = await globalThis.crypto.subtle.digest('SHA-256', secret.keyBytes);
    return globalThis.crypto.subtle.importKey(
      'raw',
      derivedKeyBytes,
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign', 'verify'],
    );
  })();
  if (hmacKeyCache.size >= 8) {
    hmacKeyCache.clear();
  }
  hmacKeyCache.set(secret.cacheId, promise);
  return promise;
}

/**
 * proxy.ts가 이미 백엔드 `/api/v1/auth/me`로 검증한 사용자 스냅샷을
 * 동일 요청의 RSC `getServerUser()`에 1회 전달하기 위해 HMAC-SHA256으로 서명한다.
 */
export async function signVerifiedUserHeader(
  user: UserInfo,
  accessToken: string,
  options?: { nowMs?: number; ttlMs?: number },
): Promise<string | null> {
  if (!accessToken || typeof globalThis.crypto?.subtle === 'undefined') {
    return null;
  }
  const secret = resolveForwardSecret();
  if (!secret) {
    return null;
  }
  try {
    const normalizedUser = normalizeAuthUser(user);
    const now = options?.nowMs ?? Date.now();
    const ttlMs = options?.ttlMs ?? FORWARD_TTL_MS;
    const envelope: VerifiedUserEnvelope = {
      user: normalizedUser,
      exp: now + ttlMs,
      tokenHash: await sha256Base64Url(accessToken),
    };
    const encodedPayload = bytesToBase64Url(encoder.encode(JSON.stringify(envelope)));
    const key = await getHmacKey(secret);
    const signature = await globalThis.crypto.subtle.sign('HMAC', key, encoder.encode(encodedPayload));
    return `${encodedPayload}.${bytesToBase64Url(new Uint8Array(signature))}`;
  } catch {
    return null;
  }
}

/**
 * `x-nuri-verified-user` 헤더의 서명·만료·`accessToken` 바인딩을 검증한다.
 * 어떤 조건이라도 맞지 않으면 fail-closed(`null`)로 반환하여 정상 백엔드 조회로 폴백한다.
 */
export async function verifyVerifiedUserHeader(
  headerValue: string | null | undefined,
  accessToken: string,
  options?: { nowMs?: number },
): Promise<UserInfo | null> {
  if (
    !headerValue ||
    !accessToken ||
    headerValue.length > MAX_FORWARD_HEADER_LEN ||
    typeof globalThis.crypto?.subtle === 'undefined'
  ) {
    return null;
  }
  const secret = resolveForwardSecret();
  if (!secret) {
    return null;
  }
  const parts = headerValue.split('.');
  if (parts.length !== 2) {
    return null;
  }
  // 빈 조각은 base64UrlToBytes 가 null 로 돌려 아래에서 fail-closed 된다(길이 2 를 위에서 확인해 실제로는 늘 있다).
  const [encodedPayload = '', encodedSig = ''] = parts;
  const payloadBytes = base64UrlToBytes(encodedPayload);
  const sigBytes = base64UrlToBytes(encodedSig);
  if (!payloadBytes || !sigBytes) {
    return null;
  }
  try {
    const key = await getHmacKey(secret);
    const valid = await globalThis.crypto.subtle.verify('HMAC', key, sigBytes, encoder.encode(encodedPayload));
    if (!valid) {
      return null;
    }
    const parsed = JSON.parse(decoder.decode(payloadBytes)) as Partial<VerifiedUserEnvelope>;
    const now = options?.nowMs ?? Date.now();
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      typeof parsed.exp !== 'number' ||
      !Number.isFinite(parsed.exp) ||
      parsed.exp <= now ||
      typeof parsed.tokenHash !== 'string'
    ) {
      return null;
    }
    const expectedHash = await sha256Base64Url(accessToken);
    if (parsed.tokenHash !== expectedHash) {
      return null;
    }
    return normalizeAuthUser(parsed.user);
  } catch {
    return null;
  }
}
