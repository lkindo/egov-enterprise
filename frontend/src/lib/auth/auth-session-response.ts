import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { TokenResponseResponseSchema } from '@/types/generated-zod';
import { authLoginResponseSchema } from './auth-bff-contract';
import { getJwtExpiryMs, cookieMaxAgeSecondsFrom } from './jwt';
import { shouldUseSecureSessionCookie } from './session-cookie-policy';

export function clearSessionCookies(response: NextResponse) {
  for (const name of ['accessToken', 'refreshToken', 'session_exp']) {
    response.cookies.set(name, '', { httpOnly: name !== 'session_exp', path: '/', expires: new Date(0) });
  }
}

export function clearMfaCookies(response: NextResponse) {
  for (const name of ['mfa_challenge', 'mfa_reauth']) {
    response.cookies.set(name, '', { httpOnly: true, sameSite: 'strict', path: '/api/auth', expires: new Date(0) });
  }
}

export function setRestrictedCookie(request: NextRequest, response: NextResponse, name: 'mfa_challenge' | 'mfa_reauth', value: unknown, expiresAt: unknown) {
  const token = z.string().min(1).max(1024).parse(value);
  const expiry = z.iso.datetime({ offset: true }).parse(expiresAt);
  const maxAge = Math.floor((Date.parse(expiry) - Date.now()) / 1000);
  if (maxAge <= 0) throw new Error('Expired authentication challenge');
  response.cookies.set(name, token, {
    httpOnly: true,
    secure: shouldUseSecureSessionCookie(request, process.env.NODE_ENV, process.env.ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE === 'true'),
    sameSite: 'strict', path: '/api/auth', maxAge,
  });
}

/** Backend tokens never become browser JSON. A restricted challenge cannot retain a previous session. */
export function authenticationResponse(request: NextRequest, value: unknown, setCookieHeaders: readonly string[] = []) {
  const token = TokenResponseResponseSchema.parse(value);
  const stage = token.authenticationStage ?? 'AUTHENTICATED';
  if (stage === 'MFA_REQUIRED' || stage === 'ENROLLMENT_REQUIRED') {
    if (token.accessToken || token.groups?.length || token.permissions?.length) throw new Error('Invalid restricted authentication state');
    const response = NextResponse.json(authLoginResponseSchema.parse({ success: true, data: {
      authenticationStage: stage, mfaChallengeExpiresAt: token.mfaChallengeExpiresAt,
    } }), { headers: { 'Cache-Control': 'no-store' } });
    clearSessionCookies(response);
    clearMfaCookies(response);
    setRestrictedCookie(request, response, 'mfa_challenge', token.mfaChallenge, token.mfaChallengeExpiresAt);
    return response;
  }
  if (stage !== 'AUTHENTICATED' || !token.accessToken || !token.role) throw new Error('Invalid authenticated response');
  const response = NextResponse.json(authLoginResponseSchema.parse({ success: true, data: {
    role: token.role, groups: token.groups, permissions: token.permissions, authorizationVersion: token.authorizationVersion,
    ...(token.authenticationStage ? { authenticationStage: 'AUTHENTICATED' } : {}),
    ...(token.recoveryCodes?.length ? { recoveryCodes: token.recoveryCodes } : {}),
  } }), { headers: { 'Cache-Control': 'no-store' } });
  const expMs = getJwtExpiryMs(token.accessToken);
  const maxAge = cookieMaxAgeSecondsFrom(expMs);
  const secure = shouldUseSecureSessionCookie(request, process.env.NODE_ENV, process.env.ALLOW_INSECURE_LOOPBACK_AUTH_COOKIE === 'true');
  response.cookies.set('accessToken', token.accessToken, { httpOnly: true, secure, sameSite: 'strict', path: '/', maxAge });
  if (expMs) response.cookies.set('session_exp', String(expMs), { httpOnly: false, secure, sameSite: 'strict', path: '/', maxAge });
  clearMfaCookies(response);
  // ResponseCookies reserializes Set-Cookie on set(); append upstream cookies last.
  for (const header of setCookieHeaders) response.headers.append('Set-Cookie', header);
  return response;
}
