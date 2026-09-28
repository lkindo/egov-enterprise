// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NextRequest } from 'next/server';
import axios from 'axios';
import { POST, GET } from '../mfa/[...path]/route';
import { authenticationResponse } from '@/lib/auth/auth-session-response';

vi.mock('axios', () => ({ default: { post: vi.fn(), get: vi.fn(), isAxiosError: (value: unknown) => !!value && typeof value === 'object' && 'response' in value } }));
const challenge = 'c'.repeat(43);
const replacement = 'r'.repeat(43);
const expiry = () => new Date(Date.now() + 240_000).toISOString();
const envelope = (data: unknown) => ({ success: true, status: 200, code: 'SUCCESS', message: 'ok', data, timestamp: '2026-09-28T00:00:00' });
const ctx = (path: string) => ({ params: Promise.resolve({ path: path.split('/') }) });
const request = (path: string, body: unknown, cookie = `mfa_challenge=${challenge}; accessToken=stale-access`) => new NextRequest(`https://example.test/api/auth/mfa/${path}`, {
  method: 'POST', headers: { 'Content-Type': 'application/json', Origin: 'https://example.test', cookie }, body: JSON.stringify(body),
});

describe('MFA BFF restricted session boundary', () => {
  beforeEach(() => vi.clearAllMocks());

  it('binds only an expiring restricted cookie and omits every token from challenge JSON', async () => {
    const response = authenticationResponse(request('verify', {}), {
      authenticationStage: 'MFA_REQUIRED', mfaChallenge: challenge, mfaChallengeExpiresAt: expiry(),
      groups: [], permissions: [], authorizationVersion: 'v1', role: null, accessToken: null,
    });
    const json = JSON.stringify(await response.json());
    expect(json).not.toContain(challenge);
    expect(json).not.toContain('accessToken');
    const cookie = response.headers.getSetCookie().find(value => value.startsWith(`mfa_challenge=${challenge}`))!;
    expect(cookie).toContain('HttpOnly'); expect(cookie).toContain('Secure'); expect(cookie).toContain('SameSite=strict'); expect(cookie).toContain('Path=/api/auth');
    expect(response.cookies.get('accessToken')?.value).toBe('');
    expect(response.cookies.get('refreshToken')?.value).toBe('');
    expect(response.headers.get('Cache-Control')).toBe('no-store');
  });

  it.each(['enrollment/prepare', 'enrollment/confirm', 'verify'])('injects cookie proof for %s without forwarding a stale access JWT', async path => {
    const data = path === 'enrollment/prepare'
      ? { secret: 'LOCALKEY', otpauthUri: 'otpauth://totp/fixture', challengeToken: replacement, expiresAt: expiry() }
      : { authenticationStage: 'ENROLLMENT_REQUIRED', mfaChallenge: replacement, mfaChallengeExpiresAt: expiry(), groups: [], permissions: [], authorizationVersion: 'v1', role: null, accessToken: null };
    vi.mocked(axios.post).mockResolvedValue({ data: envelope(data), headers: {} });
    const result = await POST(request(path, path === 'enrollment/prepare' ? {} : { code: '012345' }), ctx(path));
    expect(result.status).toBe(200);
    expect(axios.post).toHaveBeenCalledWith(expect.any(String), expect.objectContaining({ challengeToken: challenge }), expect.objectContaining({ headers: expect.not.objectContaining({ Authorization: expect.anything() }) }));
    expect(JSON.stringify(await result.json())).not.toContain(replacement);
  });

  it('rejects caller-controlled challenge tokens, unknown fields, and expired cookies before transport', async () => {
    expect((await POST(request('verify', { code: '012345', challengeToken: 'attacker' }), ctx('verify'))).status).toBe(400);
    expect((await POST(request('verify', { code: '012345' }, ''), ctx('verify'))).status).toBe(401);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('requires recent proof for recovery approval and keeps references bounded', async () => {
    expect((await POST(request('recovery/admin', { esntlId: 'target', verificationReference: 'TICKET-123' }, 'accessToken=session'), ctx('recovery/admin'))).status).toBe(401);
    expect((await POST(request('recovery/admin', { esntlId: 'target', verificationReference: 'name@example.test' }, 'accessToken=session; mfa_reauth=proof'), ctx('recovery/admin'))).status).toBe(400);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('rejects cross-origin requests and unauthenticated status requests', async () => {
    const cross = new NextRequest('https://example.test/api/auth/mfa/verify', { method: 'POST', headers: { Origin: 'https://elsewhere.test' }, body: '{}' });
    expect((await POST(cross, ctx('verify'))).status).toBe(403);
    expect((await GET(new NextRequest('https://example.test/api/auth/mfa/status'), ctx('status'))).status).toBe(401);
    expect(axios.post).not.toHaveBeenCalled(); expect(axios.get).not.toHaveBeenCalled();
  });

  it.each(['http://127.0.0.1:3001', 'http://[::1]:3001'])('accepts the actual same origin when Next normalizes %s', async origin => {
    const local = new NextRequest(`${origin}/api/auth/mfa/enrollment/start`, {
      method: 'POST', headers: { Origin: origin, Host: new URL(origin).host, cookie: 'accessToken=fixture-session' },
      body: JSON.stringify({ password: 'synthetic-password-fixture' }),
    });
    expect(local.nextUrl.hostname).toBe('localhost');
    expect(local.nextUrl.origin).not.toBe(origin);
    vi.mocked(axios.post).mockResolvedValue({ data: envelope({
      secret: 'LOCALKEY', otpauthUri: 'otpauth://totp/fixture', challengeToken: replacement, expiresAt: expiry(),
    }), headers: {} });
    expect((await POST(local, ctx('enrollment/start'))).status).toBe(200);
    expect(axios.post).toHaveBeenCalledOnce();
  });

  it.each([
    ['https://example.test', 'elsewhere.test', 'https://elsewhere.test', {}],
    ['https://example.test', 'example.test:444', 'https://example.test:444', {}],
    ['http://127.0.0.1:3001', '127.0.0.1:3001', 'http://localhost:3001', {}],
    ['http://127.0.0.1:3001', '127.0.0.1:3001', 'http://127.0.0.1:3002', {}],
    ['https://example.test', 'example.test,elsewhere.test', 'https://example.test', {}],
    ['https://example.test', 'example.test:0', 'https://example.test:0', {}],
    ['https://example.test', 'example.test:65536', 'https://example.test', {}],
    ['https://example.test', 'example.test/path', 'https://example.test', {}],
    ['https://example.test', 'attacker@example.test', 'https://example.test', {}],
    ['https://example.test', 'example.test', 'https://elsewhere.test', { 'x-forwarded-host': 'elsewhere.test' }],
    ['http://example.test', 'example.test', 'https://example.test', { 'x-forwarded-proto': 'https' }],
  ] as const)('rejects inconsistent request origin/host/port and untrusted forwarded overrides (%s, %s, %s)', async (url, host, origin, forwarded) => {
    const denied = new NextRequest(`${url}/api/auth/mfa/enrollment/start`, {
      method: 'POST', headers: { Host: host, Origin: origin, cookie: 'accessToken=fixture-session', ...forwarded },
      body: JSON.stringify({ password: 'synthetic-password-fixture' }),
    });
    expect((await POST(denied, ctx('enrollment/start'))).status).toBe(403);
    expect(axios.post).not.toHaveBeenCalled();
  });

  it('uses the established HTTPS request scheme for a TLS-terminated request and keeps cookies Secure', async () => {
    const secured = new NextRequest('https://example.test/api/auth/mfa/enrollment/start', {
      method: 'POST', headers: { Origin: 'https://example.test', Host: 'example.test',
        'x-forwarded-host': 'example.test', 'x-forwarded-proto': 'https', cookie: 'accessToken=fixture-session' },
      body: JSON.stringify({ password: 'synthetic-password-fixture' }),
    });
    vi.mocked(axios.post).mockResolvedValue({ data: envelope({
      secret: 'LOCALKEY', otpauthUri: 'otpauth://totp/fixture', challengeToken: replacement, expiresAt: expiry(),
    }), headers: {} });
    const response = await POST(secured, ctx('enrollment/start'));
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().find(value => value.startsWith('mfa_challenge='))).toContain('Secure');
  });

  it('rejects an already expired challenge returned by upstream', () => {
    expect(() => authenticationResponse(request('verify', {}), { authenticationStage: 'MFA_REQUIRED', mfaChallenge: 'opaque', mfaChallengeExpiresAt: '2000-01-01T00:00:00Z', groups: [], permissions: [], authorizationVersion: 'v1', role: null, accessToken: null })).toThrow();
  });
});
