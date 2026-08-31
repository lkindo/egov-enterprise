import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getJwtExpiryMs, cookieMaxAgeSecondsFrom } from '@/lib/auth/jwt';
import { authReissueResponseSchema } from '@/lib/auth/auth-bff-contract';
import {
  parseGeneratedOperationRequest,
  parseGeneratedOperationResponse,
} from '@/lib/api/generated-operation';
import { reissueOperation } from '@/types/generated-operations';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

const SESSION_EXPIRED_MESSAGE = '세션이 만료되었습니다. 다시 로그인해주세요.';
const REISSUE_UNAVAILABLE_MESSAGE = '세션 연장 서비스에 일시적으로 연결할 수 없습니다.';

function upstreamStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return undefined;
  const status = (response as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function safeReissueFailure(status?: number) {
  if (status === 401 || status === 403) {
    return {
      status,
      body: {
        success: false as const,
        code: 'SESSION_EXPIRED' as const,
        message: SESSION_EXPIRED_MESSAGE,
      },
    };
  }

  if (status === 429) {
    return {
      status,
      body: {
        success: false as const,
        code: 'REISSUE_RATE_LIMITED' as const,
        message: '세션 연장 요청이 많습니다. 잠시 후 다시 시도해주세요.',
      },
    };
  }

  return {
    status: status !== undefined && status >= 400 && status < 500 ? status : 502,
    body: {
      success: false as const,
      code: 'REISSUE_PROXY_ERROR' as const,
      message: REISSUE_UNAVAILABLE_MESSAGE,
    },
  };
}

function reissueResponse(body: unknown, status: number) {
  return NextResponse.json(authReissueResponseSchema.parse(body), { status });
}

export async function POST(request: NextRequest) {
  try {
    // 백엔드로 reissue 요청 (쿠키 포워딩)
    const cookieHeader = request.headers.get('cookie') || '';
    const upstreamRequest = parseGeneratedOperationRequest(reissueOperation, undefined);

    const response = await axios.post(`${BACKEND_URL}/auth/reissue`, upstreamRequest, {
      headers: {
        'Cookie': cookieHeader,
      },
    });

    let tokenResponse;
    try {
      tokenResponse = parseGeneratedOperationResponse(reissueOperation, response.data);
    } catch {
      const failure = safeReissueFailure(502);
      return reissueResponse(failure.body, failure.status);
    }

    const { accessToken } = tokenResponse;
    if (accessToken) {

      // Next.js Response 생성 — 클라이언트엔 성공여부만 응답(토큰 바디 미노출).
      // client.ts 인터셉터는 200/success 를 재발급 성공 신호로만 사용하고, 실제 토큰은
      // 아래 HttpOnly 쿠키로만 재설정된다. 바디로 토큰을 돌려주면 JS 메모리로 노출되므로 제거.
      const nextResponse = reissueResponse({
        success: true,
        data: {},
      }, 200);

      // [2026-08-15] login 과 동일 규약 — 쿠키 수명을 재발급된 토큰의 exp 에서 유도한다.
      //   재발급 경로에서 이것이 특히 중요하다: 24시간 고정이면 갱신할수록 쿠키만 계속 연장돼
      //   실제 토큰 수명과의 간극이 누적된다.
      const expMs = getJwtExpiryMs(accessToken);
      const maxAge = cookieMaxAgeSecondsFrom(expMs);

      // 신규 accessToken 을 HttpOnly 쿠키로 재설정
      const isProd = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: '/',
        maxAge,
      });

      // 비민감 만료힌트 갱신 (login 과 동일 규약)
      if (expMs) {
        nextResponse.cookies.set('session_exp', String(expMs), {
          httpOnly: false,
          secure: isProd,
          sameSite: 'strict',
          path: '/',
          maxAge,
        });
      }

      // 백엔드가 돌려준 Set-Cookie가 있으면 포워딩
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        setCookieHeader.forEach((cookieStr) => {
          nextResponse.headers.append('Set-Cookie', cookieStr);
        });
      }

      return nextResponse;
    }

    const failure = safeReissueFailure(502);
    return reissueResponse(failure.body, failure.status);
  } catch (error: unknown) {
    const failure = safeReissueFailure(upstreamStatus(error));
    return reissueResponse(failure.body, failure.status);
  }
}
