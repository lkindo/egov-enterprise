export const LOGIN_FAILURE_MESSAGE = '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.';
export const LOGIN_UNAVAILABLE_MESSAGE = '로그인 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해주세요.';

export interface SafeLoginFailure {
  status: number;
  body: {
    success: false;
    code: 'LOGIN_INVALID_CREDENTIALS' | 'LOGIN_NOT_ALLOWED' | 'LOGIN_RATE_LIMITED' | 'LOGIN_PROXY_ERROR';
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
        message: '로그인 요청이 많습니다. 잠시 후 다시 시도해주세요.',
      },
    };
  }

  if (status === 403) {
    return {
      status,
      body: {
        success: false,
        code: 'LOGIN_NOT_ALLOWED',
        message: '로그인을 완료할 수 없습니다. 시스템 관리자에게 문의해주세요.',
      },
    };
  }

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
