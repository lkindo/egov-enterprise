import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { authLogoutResponseSchema } from '@/lib/auth/auth-bff-contract';
import {
  parseGeneratedOperationRequest,
  parseGeneratedOperationResponse,
} from '@/lib/api/generated-operation';
import { logoutOperation } from '@/types/generated-operations';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');

function expireLocalSessionCookies(response: NextResponse) {
  const expires = new Date(0);

  response.cookies.set('accessToken', '', {
    httpOnly: true,
    path: '/',
    expires,
  });

  response.cookies.set('refreshToken', '', {
    httpOnly: true,
    path: '/',
    expires,
  });

  response.cookies.set('session_exp', '', {
    httpOnly: false,
    path: '/',
    expires,
  });
}

function logoutResponse() {
  return NextResponse.json(authLogoutResponseSchema.parse({
    success: true,
    data: { cleared: true },
  }));
}

export async function POST(request: NextRequest) {
  try {
    // 백엔드로 로그아웃 전송 (쿠키 및 Authorization 헤더 포함 중개)
    const cookieHeader = request.headers.get('cookie') || '';
    const authHeader = request.headers.get('authorization') || '';
    
    // 만약 accessToken 쿠키가 있으면 Bearer 헤더를 백엔드로 중개 포워딩
    const accessToken = request.cookies.get('accessToken')?.value;
    const resolvedAuthHeader = accessToken ? `Bearer ${accessToken}` : authHeader;

    const upstreamRequest = parseGeneratedOperationRequest(logoutOperation, undefined);
    const response = await axios.post(`${BACKEND_URL}/auth/logout`, upstreamRequest, {
      headers: {
        'Cookie': cookieHeader,
        ...(resolvedAuthHeader ? { 'Authorization': resolvedAuthHeader } : {}),
      },
    });
    parseGeneratedOperationResponse(logoutOperation, response.data);

    const nextResponse = logoutResponse();

    // 백엔드가 돌려준 Set-Cookie 헤더(예: refreshToken 삭제 쿠키 등)가 있으면 포워딩
    const setCookieHeader = response.headers['set-cookie'];
    if (setCookieHeader) {
      setCookieHeader.forEach((cookieStr) => {
        nextResponse.headers.append('Set-Cookie', cookieStr);
      });
    }

    // 백엔드 응답과 무관하게 로컬 세션 쿠키를 마지막에 만료시킨다.
    // refreshToken 이 남으면 reissue 가 새 accessToken 을 만들어 로그아웃을 되돌릴 수 있다.
    expireLocalSessionCookies(nextResponse);

    return nextResponse;
  } catch {
    // 백엔드 통신 실패 시에도 브라우저 로컬 쿠키는 지워주는 것이 Fail-Safe 함
    const nextResponse = logoutResponse();
    
    expireLocalSessionCookies(nextResponse);
    
    return nextResponse;
  }
}
