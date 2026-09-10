import { z } from 'zod';
import { authorizationStateSchema } from '@/lib/auth/authorization-state';

const authReissueSuccessResponseSchema = z.strictObject({
  success: z.literal(true),
  data: authorizationStateSchema,
});

const authReissueFailureResponseSchema = z.strictObject({
  success: z.literal(false),
  code: z.enum([
    'SESSION_EXPIRED',
    'REISSUE_RATE_LIMITED',
    'REISSUE_PROXY_ERROR',
  ]),
  message: z.string().min(1),
});

export const authReissueResponseSchema = z.discriminatedUnion('success', [
  authReissueSuccessResponseSchema,
  authReissueFailureResponseSchema,
]);
