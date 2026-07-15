import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getJwtExpiryMs } from '@/lib/auth/jwt';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

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

      // accessToken 을 HttpOnly, Secure, SameSite=Strict 쿠키로 설정
      const isProd = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: '/',
        maxAge: 86400, // 24 hours
      });

      // 비민감 만료힌트(session_exp): 토큰이 아닌 만료시각(ms)만 — 클라이언트 세션만료 경고용.
      // HttpOnly 아님(JS 가 읽어야 하므로)이나 타임스탬프뿐이라 탈취 표면이 아니다.
      const expMs = getJwtExpiryMs(accessToken);
      if (expMs) {
        nextResponse.cookies.set('session_exp', String(expMs), {
          httpOnly: false,
          secure: isProd,
          sameSite: 'strict',
          path: '/',
          maxAge: 86400,
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

    return NextResponse.json(responseData, { status: response.status });
  } catch (error: any) {
    console.error('[API Proxy Login Error]', error.message);
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {
      success: false,
      code: 'LOGIN_PROXY_ERROR',
      message: '로그인 중개 처리 중 오류가 발생했습니다.',
    };
    return NextResponse.json(errorData, { status });
  }
}
