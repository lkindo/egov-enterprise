import { describe, expect, it } from 'vitest';
import { forwardedClientIpHeaders, isTrustedEdgeProxyEnabled } from '../forwarded-client-ip';

/**
 * [2026-09-14 ADR-0019] 사용자 IP 전달의 안전 조건.
 *
 * 앞단 프록시가 X-Forwarded-For 를 접속 주소 하나로 덮어쓰는 형상에서만 전달한다. 꺼져 있거나 값이 그
 * 프록시를 거친 모양(단일 주소)이 아니면 넘기지 않는다 — 넘기면 백엔드가 신뢰 프록시(Next)가 보낸 값으로
 * 받아 로그인 IP 제한을 위조로 통과시킬 수 있다.
 */
const EDGE = 'true';
const headers = (value?: string) => new Headers(value === undefined ? {} : { 'x-forwarded-for': value });

describe('forwardedClientIpHeaders', () => {
  it('신뢰 앞단 프록시 형상에서 단일 IPv4·IPv6 주소를 넘긴다', () => {
    expect(forwardedClientIpHeaders(headers('203.0.113.9'), EDGE)).toEqual({ 'X-Forwarded-For': '203.0.113.9' });
    expect(forwardedClientIpHeaders(headers(' 2001:db8::7 '), EDGE)).toEqual({ 'X-Forwarded-For': '2001:db8::7' });
  });

  it('플래그가 정확히 true 가 아니면 넘기지 않는다', () => {
    for (const flag of [undefined, '', 'false', 'TRUE', '1']) {
      expect(isTrustedEdgeProxyEnabled(flag)).toBe(false);
      expect(forwardedClientIpHeaders(headers('203.0.113.9'), flag)).toEqual({});
    }
  });

  it('앞단 프록시를 거치지 않은 모양의 값은 넘기지 않는다', () => {
    for (const value of [undefined, '', '6.6.6.6, 203.0.113.9', 'unknown', '203.0.113.9;drop', 'a'.repeat(46)]) {
      expect(forwardedClientIpHeaders(headers(value), EDGE)).toEqual({});
    }
  });
});
