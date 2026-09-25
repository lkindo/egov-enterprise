import { describe, expect, it } from 'vitest';
import {
  LOGIN_FAILURE_MESSAGE,
  LOGIN_RATE_LIMITED_MESSAGE,
  LOGIN_UNAVAILABLE_MESSAGE,
  loginErrorMessage,
  safeLoginFailure,
} from '../login-error';

/**
 * [2026-09-25 DIP D2] 로그인 화면은 요청 제한(429)과 서비스 장애(5xx·연결 실패)만 따로 말한다.
 * 그 밖의 실패(없는 계정·잠김·정책 거부·OTP)는 같은 문구다 — 서버가 같은 401 을 돌려주므로
 * 화면도 계정 상태를 추측해 말하지 않는다.
 */
describe('로그인 실패 문구', () => {
  it('BFF 는 403 도 일반 실패로 옮긴다 — "관리자에게 문의" 같은 별도 문구로 계정 상태를 드러내지 않는다', () => {
    const forbidden = safeLoginFailure(403);
    expect(forbidden.body.code).toBe('LOGIN_INVALID_CREDENTIALS');
    expect(forbidden.body.message).toBe(LOGIN_FAILURE_MESSAGE);
    expect(safeLoginFailure(401).body.message).toBe(LOGIN_FAILURE_MESSAGE);
  });

  it('BFF 는 429 와 5xx 를 각자의 문구로 옮긴다', () => {
    expect(safeLoginFailure(429).body).toMatchObject({ code: 'LOGIN_RATE_LIMITED', message: LOGIN_RATE_LIMITED_MESSAGE });
    expect(safeLoginFailure(503)).toMatchObject({ status: 502, body: { code: 'LOGIN_PROXY_ERROR', message: LOGIN_UNAVAILABLE_MESSAGE } });
  });

  it('화면은 요청 제한·서비스 장애 문구만 그대로 보이고 나머지는 같은 실패 문구다', () => {
    expect(loginErrorMessage(new Error(LOGIN_RATE_LIMITED_MESSAGE))).toBe(LOGIN_RATE_LIMITED_MESSAGE);
    expect(loginErrorMessage(new Error(LOGIN_UNAVAILABLE_MESSAGE))).toBe(LOGIN_UNAVAILABLE_MESSAGE);
    expect(loginErrorMessage(new Error(LOGIN_FAILURE_MESSAGE))).toBe(LOGIN_FAILURE_MESSAGE);
    // 서버가 무엇을 말하든 화면은 계정 상태를 옮기지 않는다.
    expect(loginErrorMessage(new Error('허용되지 않은 IP에서의 접속입니다.'))).toBe(LOGIN_FAILURE_MESSAGE);
    expect(loginErrorMessage('문자열')).toBe(LOGIN_FAILURE_MESSAGE);
    expect(loginErrorMessage(undefined)).toBe(LOGIN_FAILURE_MESSAGE);
  });

  it('응답을 받지 못한 연결 실패는 서비스 장애 문구다 — 비밀번호를 의심하게 하지 않는다', () => {
    expect(loginErrorMessage({ isAxiosError: true, message: 'Network Error' })).toBe(LOGIN_UNAVAILABLE_MESSAGE);
    expect(loginErrorMessage({ isAxiosError: true, response: { status: 401 } })).toBe(LOGIN_FAILURE_MESSAGE);
  });
});
