import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { getJwtExpiryMs } from '@/lib/auth/jwt';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    // 백엔드로 reissue 요청 (쿠키 포워딩)
    const cookieHeader = request.headers.get('cookie') || '';

    const response = await axios.post(`${BACKEND_URL}/auth/reissue`, {}, {
      headers: {
        'Cookie': cookieHeader,
      },
    });

    const responseData = response.data;
    if (responseData.success && responseData.data?.accessToken) {
      const { accessToken } = responseData.data;

      // Next.js Response 생성 — 클라이언트엔 성공여부만 응답(토큰 바디 미노출).
      // client.ts 인터셉터는 200/success 를 재발급 성공 신호로만 사용하고, 실제 토큰은
      // 아래 HttpOnly 쿠키로만 재설정된다. 바디로 토큰을 돌려주면 JS 메모리로 노출되므로 제거.
      const nextResponse = NextResponse.json({
        success: true,
        data: {},
      });

      // 신규 accessToken 을 HttpOnly 쿠키로 재설정
      const isProd = process.env.NODE_ENV === 'production';
      nextResponse.cookies.set('accessToken', accessToken, {
        httpOnly: true,
        secure: isProd,
        sameSite: 'strict',
        path: '/',
        maxAge: 86400, // 24 hours
      });

      // 비민감 만료힌트 갱신 (login 과 동일 규약)
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

      // 백엔드가 돌려준 Set-Cookie가 있으면 포워딩
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
    console.error('[API Proxy Reissue Error]', error.message);
    const status = error.response?.status || 500;
    const errorData = error.response?.data || {
      success: false,
      code: 'REISSUE_PROXY_ERROR',
      message: '토큰 재발행 중개 처리 중 오류가 발생했습니다.',
    };
    return NextResponse.json(errorData, { status });
  }
}
