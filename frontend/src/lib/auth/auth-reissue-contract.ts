import { z } from 'zod';

const authReissueSuccessResponseSchema = z.strictObject({
  success: z.literal(true),
  data: z.strictObject({}),
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
