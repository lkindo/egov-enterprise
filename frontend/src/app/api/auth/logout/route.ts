import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

export async function POST(request: NextRequest) {
  try {
    // 백엔드로 로그아웃 전송 (쿠키 및 Authorization 헤더 포함 중개)
    const cookieHeader = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    
    // 만약 accessToken 쿠키가 있으면 Bearer 헤더를 백엔드로 중개 포워딩
    const accessToken = request.cookies.get('accessToken')?.value;
    const resolvedAuthHeader = accessToken ? `Bearer ${accessToken}` : authHeader;

    const response = await axios.post(`${BACKEND_URL}/auth/logout`, {}, {
      headers: {
        'Cookie': cookieHeader,
        ...(resolvedAuthHeader ? { 'Authorization': resolvedAuthHeader } : {}),
      },
    });

    const nextResponse = NextResponse.json({
      success: true,
      data: response.data?.data || 'Logged out successfully',
    });

    // accessToken 쿠키 즉시 만료 제거
    nextResponse.cookies.set('accessToken', '', {
      httpOnly: true,
      path: '/',
      expires: new Date(0),
    });

    // 백엔드가 돌려준 Set-Cookie 헤더(예: refreshToken 삭제 쿠키 등)가 있으면 포워딩
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      setCookieHeader.forEach((cookieStr) => {
        nextResponse.headers.append('Set-Cookie', cookieStr);
      });
    }

    return nextResponse;
  } catch (error: any) {
    console.error('[API Proxy Logout Error]', error.message);
    
    // 백엔드 통신 실패 시에도 브라우저 로컬 쿠키는 지워주는 것이 Fail-Safe 함
    const nextResponse = NextResponse.json({
      success: true,
      message: 'Logged out with local session cleared',
    });
    
    nextResponse.cookies.set('accessToken', '', {
      httpOnly: true,
      path: '/',
      expires: new Date(0),
    });
    
    return nextResponse;
  }
}
