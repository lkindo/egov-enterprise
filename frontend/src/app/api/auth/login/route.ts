import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { authenticationResponse } from '@/lib/auth/auth-session-response';
import { safeLoginFailure } from '@/lib/auth/login-error';
import { authLoginResponseSchema } from '@/lib/auth/auth-bff-contract';
import { forwardedClientIpHeaders } from '@/lib/api/forwarded-client-ip';
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
        // 로그인 IP 제한 정책·로그인 IP 기록의 입력이다(ADR-0019). 신뢰 앞단 프록시가 없으면 넘기지 않는다.
        ...forwardedClientIpHeaders(request.headers),
      },
    });

    let tokenResponse;
    try {
      tokenResponse = parseGeneratedOperationResponse(loginOperation, response.data);
      return authenticationResponse(request, tokenResponse, response.headers['set-cookie'] ?? []);
    } catch {
      const failure = safeLoginFailure(502);
      return loginResponse(failure.body, failure.status);
    }
  } catch (error: unknown) {
    const failure = safeLoginFailure(upstreamStatus(error));
    return loginResponse(failure.body, failure.status);
  }
}
