import axios from 'axios';
import { AUTH_BROWSER_REQUEST_TIMEOUT_MS } from '@/lib/auth/auth-request-policy';
import { effectiveBrowserLocale } from '@/i18n/surfaces';
import { z } from 'zod';
import { authLoginDataSchema } from '@/lib/auth/auth-bff-contract';
import { mfaBrowserRequests, mfaCompleteSchema, mfaEnrollmentSchema, mfaReauthenticationSchema, mfaStatusSchema } from '@/lib/auth/mfa-bff-contract';

// 백엔드 문구의 언어는 지금 화면의 로케일이다(ADR-0063) — 요청마다 읽는다(화면을 옮기면 바뀐다).
const transport = () => ({
  baseURL: '',
  withCredentials: true,
  xsrfCookieName: 'XSRF-TOKEN',
  xsrfHeaderName: 'X-XSRF-TOKEN',
  timeout: AUTH_BROWSER_REQUEST_TIMEOUT_MS,
  headers: { 'Accept-Language': effectiveBrowserLocale() },
});
async function post<T>(action: keyof typeof mfaBrowserRequests, value: unknown, schema: z.ZodType<T>): Promise<T> {
  const body = mfaBrowserRequests[action].parse(value);
  const response = await axios.post<unknown>(`/api/auth/mfa/${action}`, body, transport());
  return z.strictObject({ success: z.literal(true), data: schema }).parse(response.data).data;
}

export const mfaService = {
  async status() {
    const response = await axios.get<unknown>('/api/auth/mfa/status', transport());
    return z.strictObject({ success: z.literal(true), data: mfaStatusSchema }).parse(response.data).data;
  },
  start: (password: string) => post('enrollment/start', { password }, mfaEnrollmentSchema),
  prepare: () => post('enrollment/prepare', {}, mfaEnrollmentSchema),
  confirm: (code: string) => post('enrollment/confirm', { code }, authLoginDataSchema),
  verify: (value: unknown) => post('verify', value, authLoginDataSchema),
  reauthenticate: (password: string, code: string) => post('reauthenticate', { password, code }, mfaReauthenticationSchema),
  regenerate: () => post('recovery-codes', {}, authLoginDataSchema),
  disable: () => post('disable', {}, mfaCompleteSchema),
  recoverAccount: (esntlId: string, verificationReference: string) => post('recovery/admin', { esntlId, verificationReference }, mfaCompleteSchema),
};
