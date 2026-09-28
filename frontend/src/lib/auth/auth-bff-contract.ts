import { z } from 'zod';
import { TokenResponseResponseSchema } from '@/types/generated-zod';
import { authorizationStateSchema } from '@/lib/auth/authorization-state';

export { authReissueResponseSchema } from '@/lib/auth/auth-reissue-contract';

/**
 * Next auth Route Handler가 브라우저에 노출하는 로컬 계약.
 * Backend TokenResponse와 분리해 access/refresh token이 JS 응답 경계로 유입되지 않게 한다.
 */
export const authAuthenticatedDataSchema = TokenResponseResponseSchema.pick({ role: true }).extend({
  authenticationStage: z.literal('AUTHENTICATED').optional(),
  role: z.string().min(1),
  ...authorizationStateSchema.shape,
  recoveryCodes: z.array(z.string().min(1)).optional(),
}).strict();

export const authChallengeDataSchema = z.strictObject({
  authenticationStage: z.enum(['MFA_REQUIRED', 'ENROLLMENT_REQUIRED']),
  mfaChallengeExpiresAt: z.iso.datetime({ offset: true }),
});

export const authLoginDataSchema = z.union([authAuthenticatedDataSchema, authChallengeDataSchema]);

const authLoginSuccessResponseSchema = z.strictObject({
  success: z.literal(true),
  data: authLoginDataSchema,
}).strict();

const authLoginFailureResponseSchema = z.strictObject({
  success: z.literal(false),
  code: z.enum([
    'LOGIN_INVALID_REQUEST',
    'LOGIN_INVALID_CREDENTIALS',
    'LOGIN_RATE_LIMITED',
    'LOGIN_PROXY_ERROR',
  ]),
  message: z.string().min(1),
}).strict();

export const authLoginResponseSchema = z.discriminatedUnion('success', [
  authLoginSuccessResponseSchema,
  authLoginFailureResponseSchema,
]);

export const authLogoutDataSchema = z.strictObject({
  cleared: z.literal(true),
});

export const authLogoutResponseSchema = z.strictObject({
  success: z.literal(true),
  data: authLogoutDataSchema,
});

export type AuthLoginData = z.infer<typeof authLoginDataSchema>;
