import { describe, expect, it } from 'vitest';

import {
  INSECURE_LOOPBACK_CLIENT_ADDRESSES,
  INSECURE_LOOPBACK_ENVIRONMENTS,
  INSECURE_LOOPBACK_HOSTNAMES,
  shouldUseSecureSessionCookie,
} from '../session-cookie-policy';

function requestFor(
  url: string,
  headerOverrides: Record<string, string | null> = {},
) {
  const nextUrl = new URL(url);
  const defaults: Record<string, string | null> = {
    host: nextUrl.host,
    'x-forwarded-host': nextUrl.host,
    'x-forwarded-proto': nextUrl.protocol.slice(0, -1),
    'x-forwarded-for': nextUrl.hostname === '[::1]'
      ? '::1'
      : nextUrl.hostname === 'localhost'
        ? '127.0.0.1'
        : nextUrl.hostname,
    forwarded: null,
  };
  const values = new Map(Object.entries({ ...defaults, ...headerOverrides }));

  return {
    nextUrl,
    headers: { get: (name: string) => values.get(name.toLowerCase()) ?? null },
  };
}

describe('shouldUseSecureSessionCookie', () => {
  it('예외 환경과 hostname 집합은 ADR의 exact allowlist와 같다', () => {
    expect([...INSECURE_LOOPBACK_ENVIRONMENTS]).toEqual(['development', 'test']);
    expect([...INSECURE_LOOPBACK_HOSTNAMES]).toEqual(['localhost', '127.0.0.1', '[::1]']);
    expect([...INSECURE_LOOPBACK_CLIENT_ADDRESSES]).toEqual([
      '127.0.0.1',
      '::1',
      '[::1]',
      '::ffff:127.0.0.1',
    ]);
  });

  it.each([
    { nodeEnv: 'development', url: 'http://localhost:3001', optIn: true, expected: false, caseName: 'development localhost HTTP with opt-in' },
    { nodeEnv: 'development', url: 'http://127.0.0.1:3001', optIn: true, expected: false, caseName: 'development IPv4 loopback HTTP with opt-in' },
    { nodeEnv: 'development', url: 'http://[::1]:3001', optIn: true, expected: false, caseName: 'development IPv6 loopback HTTP with opt-in' },
    { nodeEnv: 'test', url: 'http://localhost:3001', optIn: true, expected: false, caseName: 'test localhost HTTP with opt-in' },
    { nodeEnv: 'production', url: 'http://localhost:3001', optIn: true, expected: true, caseName: 'production localhost HTTP' },
    { nodeEnv: 'preview', url: 'http://localhost:3001', optIn: true, expected: true, caseName: 'preview is not an exception environment' },
    { nodeEnv: undefined, url: 'http://localhost:3001', optIn: true, expected: true, caseName: 'missing environment' },
    { nodeEnv: 'development', url: 'http://localhost:3001', optIn: false, expected: true, caseName: 'missing explicit opt-in' },
    { nodeEnv: 'development', url: 'https://localhost:3001', optIn: true, expected: true, caseName: 'development localhost HTTPS' },
    { nodeEnv: 'development', url: 'http://localhost.example.test:3001', optIn: true, expected: true, caseName: 'localhost suffix host' },
    { nodeEnv: 'development', url: 'http://localhost.:3001', optIn: true, expected: true, caseName: 'trailing-dot localhost' },
    { nodeEnv: 'development', url: 'http://127.0.0.2:3001', optIn: true, expected: true, caseName: 'other IPv4 host' },
    { nodeEnv: 'development', url: 'http://[::ffff:127.0.0.1]:3001', optIn: true, expected: true, caseName: 'IPv4-mapped IPv6 URL host' },
  ])('$caseName => Secure=$expected', ({ nodeEnv, url, optIn, expected }) => {
    expect(shouldUseSecureSessionCookie(requestFor(url), nodeEnv, optIn)).toBe(expected);
  });

  it.each([
    ['missing Host', { host: null }],
    ['external Host', { host: '192.0.2.10:3001' }],
    ['userinfo Host', { host: 'user@localhost:3001' }],
    ['zero-port Host', { host: 'localhost:0' }],
    ['out-of-range Host port', { host: 'localhost:65536' }],
    ['missing forwarded host', { 'x-forwarded-host': null }],
    ['external forwarded host', { 'x-forwarded-host': 'app.example.test:3001' }],
    ['forwarded host chain', { 'x-forwarded-host': 'localhost:3001, proxy.internal' }],
    ['missing forwarded protocol', { 'x-forwarded-proto': null }],
    ['HTTPS forwarded protocol', { 'x-forwarded-proto': 'https' }],
    ['forwarded protocol chain', { 'x-forwarded-proto': 'http, https' }],
    ['missing forwarded client', { 'x-forwarded-for': null }],
    ['external forwarded client', { 'x-forwarded-for': '192.0.2.20' }],
    ['forwarded client chain', { 'x-forwarded-for': '127.0.0.1, 192.0.2.20' }],
    ['RFC Forwarded header present', { forwarded: 'for=127.0.0.1;host=localhost;proto=http' }],
  ])('%s이면 Secure로 fail-closed 한다', (_, headers) => {
    expect(shouldUseSecureSessionCookie(
      requestFor('http://localhost:3001', headers),
      'development',
      true,
    )).toBe(true);
  });
});
