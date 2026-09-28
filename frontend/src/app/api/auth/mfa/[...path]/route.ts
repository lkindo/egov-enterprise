import { NextRequest, NextResponse } from 'next/server';
import axios from 'axios';
import { z } from 'zod';
import { parseGeneratedOperationRequest, parseGeneratedOperationResponse } from '@/lib/api/generated-operation';
import { forwardedClientIpHeaders } from '@/lib/api/forwarded-client-ip';
import { authenticationResponse, clearMfaCookies, clearSessionCookies, setRestrictedCookie } from '@/lib/auth/auth-session-response';
import { mfaBrowserRequests, mfaEnrollmentSchema, mfaStatusSchema } from '@/lib/auth/mfa-bff-contract';
import {
  mfaStatusOperation, mfaStartEnrollmentOperation, mfaPrepareEnrollmentOperation, mfaConfirmEnrollmentOperation,
  mfaVerifyLoginOperation, mfaReauthenticateOperation, mfaRegenerateRecoveryCodesOperation,
  mfaDisableOperation, mfaRecoverAccountOperation,
} from '@/types/generated-operations';

const BACKEND_URL = (process.env.BACKEND_API_URL || 'http://127.0.0.1:8080/api/v1').replace(/\/$/, '');
const operations = {
  'enrollment/start': mfaStartEnrollmentOperation, 'enrollment/prepare': mfaPrepareEnrollmentOperation,
  'enrollment/confirm': mfaConfirmEnrollmentOperation, verify: mfaVerifyLoginOperation,
  reauthenticate: mfaReauthenticateOperation, 'recovery-codes': mfaRegenerateRecoveryCodesOperation,
  disable: mfaDisableOperation, 'recovery/admin': mfaRecoverAccountOperation,
} as const;
type RouteContext = { params: Promise<{ path: string[] }> };
const json = (data: unknown) => NextResponse.json({ success: true, data }, { headers: { 'Cache-Control': 'no-store' } });
const details = z.record(z.string(), z.unknown());

function failure(status: number) {
  const message = status === 429 ? '인증 요청이 많습니다. 잠시 후 다시 시도해 주세요.'
    : status >= 500 ? '추가 인증 서비스에 일시적으로 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.'
    : status === 403 ? '이 작업을 수행할 권한이 없습니다.'
    : '추가 인증을 완료하지 못했습니다. 입력값과 만료 여부를 확인해 주세요.';
  return NextResponse.json({ success: false, message }, { status, headers: { 'Cache-Control': 'no-store' } });
}

function headers(request: NextRequest, authenticated = true) {
  const accessToken = request.cookies.get('accessToken')?.value;
  return { 'Content-Type': 'application/json', ...forwardedClientIpHeaders(request.headers),
    ...(authenticated && accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
  };
}

function sameOrigin(request: NextRequest) {
  const origin = request.headers.get('origin');
  if (!origin) return true;
  const host = request.headers.get('host');
  if (!host) return origin === request.nextUrl.origin;
  // Next normalizes loopback URL hosts to localhost. Compare the browser's actual
  // Host, but require it to normalize back to this request rather than trusting an override.
  const authority = /^(?:[A-Za-z0-9._-]+|\[[A-Fa-f0-9:.]+\])(?::([0-9]{1,5}))?$/.exec(host);
  if (!authority || (authority[1] !== undefined && (Number(authority[1]) < 1 || Number(authority[1]) > 65535))) return false;
  try {
    const actual = new URL(`${request.nextUrl.protocol}//${host}`);
    if (actual.protocol !== 'http:' && actual.protocol !== 'https:') return false;
    if (new NextRequest(actual).nextUrl.origin !== request.nextUrl.origin) return false;
    return origin === actual.origin;
  } catch { return false; }
}

function statusOf(error: unknown) {
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    if (status && [400, 401, 403, 429, 503].includes(status)) return status;
  }
  return 502;
}

export async function GET(request: NextRequest, context: RouteContext) {
  if ((await context.params).path.join('/') !== 'status') return failure(404);
  if (!request.cookies.get('accessToken')?.value) return failure(401);
  try {
    const response = await axios.get(`${BACKEND_URL}/auth/mfa/status`, { headers: headers(request) });
    return json(mfaStatusSchema.parse(parseGeneratedOperationResponse(mfaStatusOperation, response.data)));
  } catch (error) { return failure(statusOf(error)); }
}

export async function POST(request: NextRequest, context: RouteContext) {
  if (!sameOrigin(request)) return failure(403);
  const path = (await context.params).path.join('/');
  if (!Object.hasOwn(operations, path)) return failure(404);
  const action = path as keyof typeof operations;
  const operation = operations[action];
  let body: Record<string, unknown>;
  try { body = mfaBrowserRequests[action].parse(await request.json()); }
  catch { return failure(400); }
  const restricted = ['enrollment/prepare', 'enrollment/confirm', 'verify'].includes(action);
  if (restricted) {
    const challengeToken = request.cookies.get('mfa_challenge')?.value;
    if (!challengeToken) return failure(401);
    body = { ...body, challengeToken };
  } else if (!request.cookies.get('accessToken')?.value) return failure(401);
  if (['recovery-codes', 'disable', 'recovery/admin'].includes(action)) {
    const reauthToken = request.cookies.get('mfa_reauth')?.value;
    if (!reauthToken) return failure(401);
    body = { ...body, reauthToken };
  }
  try {
    const parsedBody = parseGeneratedOperationRequest(operation, body);
    const upstream = await axios.post(`${BACKEND_URL}/auth/mfa/${action}`, parsedBody, { headers: headers(request, !restricted) });
    const data = parseGeneratedOperationResponse(operation, upstream.data);
    if (action === 'enrollment/confirm' || action === 'verify' || action === 'recovery-codes') {
      return authenticationResponse(request, data, upstream.headers['set-cookie'] ?? []);
    }
    if (action === 'enrollment/start' || action === 'enrollment/prepare') {
      const enrollment = details.parse(data);
      const response = json(mfaEnrollmentSchema.parse({ secret: enrollment.secret, otpauthUri: enrollment.otpauthUri, expiresAt: enrollment.expiresAt }));
      clearSessionCookies(response);
      clearMfaCookies(response);
      setRestrictedCookie(request, response, 'mfa_challenge', enrollment.challengeToken, enrollment.expiresAt);
      return response;
    }
    if (action === 'reauthenticate') {
      const reauthentication = details.parse(data);
      const expiresAt = z.iso.datetime({ offset: true }).parse(reauthentication.expiresAt);
      const response = json({ expiresAt });
      setRestrictedCookie(request, response, 'mfa_reauth', reauthentication.reauthToken, expiresAt);
      return response;
    }
    const response = json({ completed: true });
    clearMfaCookies(response);
    if (action === 'disable') clearSessionCookies(response);
    return response;
  } catch (error) { return failure(statusOf(error)); }
}
