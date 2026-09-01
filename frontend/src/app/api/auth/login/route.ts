import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getJwtExpiryMs, cookieMaxAgeSecondsFrom } from '@/lib/auth/jwt';
import { safeLoginFailure } from '@/lib/auth/login-error';
import { authLoginResponseSchema } from '@/lib/auth/auth-bff-contract';
import {
  parseGeneratedOperationRequest,
  parseGeneratedOperationResponse,
} from '@/lib/api/generated-operation';
import { loginOperation, type GeneratedOperationRequest } from '@/types/generated-operations';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

function upstreamStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return undefined;
  const status = (response as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

function loginResponse(body: unknown, status: number) {
  return NextResponse.json(authLoginResponseSchema.parse(body), { status });
}

export async function POST(request: NextRequest) {
  let upstreamRequest: GeneratedOperationRequest<'login'>;
  try {
    upstreamRequest = parseGeneratedOperationRequest(loginOperation, await request.json());
  } catch {
    return loginResponse({
      success: false,
      code: 'LOGIN_INVALID_REQUEST',
      message: '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.',
    }, 400);
  }

  try {
    // 백엔드 로그인 API 호출
    const response = await axios.post(`${BACKEND_URL}/auth/login`, upstreamRequest, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    let tokenResponse;
    try {
      tokenResponse = parseGeneratedOperationResponse(loginOperation, response.data);
    } catch {
      const failure = safeLoginFailure(502);
      return loginResponse(failure.body, failure.status);
    }

    const { accessToken, role } = tokenResponse;
    if (accessToken && role) {

      // Next.js Response 생성
      const nextResponse = loginResponse({
        success: true,
        data: { role },
      }, 200);

      // [2026-08-15] 쿠키 수명을 **토큰 수명에서 유도**한다. 종전 하드코딩 86400(24시간)은
      //   백엔드 기본 토큰 수명(1시간)과 어긋나, 토큰이 죽은 뒤에도 쿠키가 최대 23시간 남았다.
      const expMs = getJwtExpiryMs(accessToken);
      const maxAge = cookieMaxAgeSecondsFrom(expMs);

      // accessToken 을 HttpOnly, Secure, SameSite=Strict 쿠키로 설정
      const isProd = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: '/',
        maxAge,
      });

      // 비민감 만료힌트(session_exp): 토큰이 아닌 만료시각(ms)만 — 클라이언트 세션만료 경고용.
      // HttpOnly 아님(JS 가 읽어야 하므로)이나 타임스탬프뿐이라 탈취 표면이 아니다.
      if (expMs) {
        nextResponse.cookies.set('session_exp', String(expMs), {
          httpOnly: false,
          secure: isProd,
          sameSite: 'strict',
          path: '/',
          maxAge,
        });
      }

      // 백엔드가 준 Set-Cookie 헤더(예: refreshToken 등)가 있으면 전달 포워딩
      const setCookieHeader = response.headers['set-cookie'];
      if (setCookieHeader) {
        setCookieHeader.forEach((cookieStr) => {
          nextResponse.headers.append('Set-Cookie', cookieStr);
        });
      }

      return nextResponse;
    }

    const failure = safeLoginFailure(502);
    return loginResponse(failure.body, failure.status);
  } catch (error: unknown) {
    const failure = safeLoginFailure(upstreamStatus(error));
    return loginResponse(failure.body, failure.status);
  }
}
