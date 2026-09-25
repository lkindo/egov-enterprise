export const LOGIN_FAILURE_MESSAGE = '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.';
export const LOGIN_UNAVAILABLE_MESSAGE = '로그인 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';
export const LOGIN_RATE_LIMITED_MESSAGE = '로그인 요청이 많습니다. 잠시 후 다시 시도해주세요.';

/**
 * 로그인 화면에 보일 문구를 고른다(2026-09-25 DIP D2).
 *
 * <p>화면이 따로 말하는 실패는 둘뿐이다 — 요청 제한(429)과 서비스 장애(5xx·연결 실패). 둘 다 사용자가 할 수
 * 있는 일이 "잠시 후 다시" 로 달라서다. 그 밖의 모든 실패(없는 계정·잠김·정책 거부·OTP)는 같은 문구다 —
 * 서버도 같은 401 을 돌려주므로 화면이 계정 상태를 추측해 말하지 않는다. 종전에는 두 경우도 모두
 * "아이디 또는 비밀번호를 확인해주세요" 로 뭉개져, 서버가 멈춰 있어도 사용자는 비밀번호를 의심했다.
 */
export function loginErrorMessage(error: unknown): string {
  const message = error instanceof Error ? error.message : undefined;
  if (message === LOGIN_RATE_LIMITED_MESSAGE || message === LOGIN_UNAVAILABLE_MESSAGE) {
    return message;
  }
  if (isNetworkFailure(error)) {
    return LOGIN_UNAVAILABLE_MESSAGE;
  }
  return LOGIN_FAILURE_MESSAGE;
}

/** 응답 자체를 받지 못한 axios 실패(연결 거부·시간 초과). */
function isNetworkFailure(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const candidate = error as { isAxiosError?: unknown; response?: unknown };
  return candidate.isAxiosError === true && candidate.response === undefined;
}

export interface SafeLoginFailure {
  status: number;
  body: {
    success: false;
    code: 'LOGIN_INVALID_CREDENTIALS' | 'LOGIN_RATE_LIMITED' | 'LOGIN_PROXY_ERROR';
    message: string;
  };
}

export function safeLoginFailure(status: number | undefined): SafeLoginFailure {
  if (status === 429) {
    return {
      status,
      body: {
        success: false,
        code: 'LOGIN_RATE_LIMITED',
        message: LOGIN_RATE_LIMITED_MESSAGE,
      },
    };
  }

  // 403 도 일반 실패 문구다(DIP D2). 서버는 정책 거부를 401 로 돌려주지만, 다른 경로의 403 이
  // "관리자에게 문의" 같은 별도 문구로 계정 상태를 드러내지 않게 한다.

  if (status !== undefined && status >= 400 && status < 500) {
    return {
      status,
      body: {
        success: false,
        code: 'LOGIN_INVALID_CREDENTIALS',
        message: LOGIN_FAILURE_MESSAGE,
      },
    };
  }

  return {
    status: status !== undefined && status >= 500 ? 502 : 500,
    body: {
      success: false,
      code: 'LOGIN_PROXY_ERROR',
      message: LOGIN_UNAVAILABLE_MESSAGE,
    },
  };
}
