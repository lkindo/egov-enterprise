import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getJwtExpiryMs, cookieMaxAgeSecondsFrom } from '@/lib/auth/jwt';
import { safeLoginFailure } from '@/lib/auth/login-error';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

function upstreamStatus(error: unknown): number | undefined {
  if (!error || typeof error !== 'object') return undefined;
  const response = (error as { response?: unknown }).response;
  if (!response || typeof response !== 'object') return undefined;
  const status = (response as { status?: unknown }).status;
  return typeof status === 'number' ? status : undefined;
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // 백엔드 로그인 API 호출
    const response = await axios.post(`${BACKEND_URL}/auth/login`, body, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const responseData = response.data;
    if (responseData.success && responseData.data?.accessToken) {
      const { accessToken, role } = responseData.data;

      // Next.js Response 생성
      const nextResponse = NextResponse.json({
        success: true,
        data: { role },
      });

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

    const failure = safeLoginFailure(response.status);
    return NextResponse.json(failure.body, { status: failure.status });
  } catch (error: unknown) {
    const failure = safeLoginFailure(upstreamStatus(error));
    return NextResponse.json(failure.body, { status: failure.status });
  }
}
