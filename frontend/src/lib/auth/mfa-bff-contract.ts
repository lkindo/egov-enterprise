import { z } from 'zod';

export const mfaStatusSchema = z.strictObject({
  enabled: z.boolean(), required: z.boolean(), available: z.boolean(),
  recoveryCodesRemaining: z.number().int().min(0),
});
export const mfaEnrollmentSchema = z.strictObject({
  secret: z.string().min(1), otpauthUri: z.string().startsWith('otpauth://totp/'),
  expiresAt: z.iso.datetime({ offset: true }),
});
export const mfaReauthenticationSchema = z.strictObject({ expiresAt: z.iso.datetime({ offset: true }) });
export const mfaCompleteSchema = z.strictObject({ completed: z.literal(true) });
export const mfaCodeSchema = z.string().regex(/^\d{6}$/, '인증앱의 6자리 숫자를 입력해 주세요.');
export const mfaRecoveryCodeSchema = z.string().trim().regex(/^[A-Za-z0-9_-]{22}$/, '발급받은 22자리 복구 코드를 입력해 주세요.');
export const mfaVerifyRequestSchema = z.union([
  z.strictObject({ code: mfaCodeSchema }),
  z.strictObject({ recoveryCode: mfaRecoveryCodeSchema }),
]);
export const mfaBrowserRequests = {
  'enrollment/start': z.strictObject({ password: z.string().min(1).max(256) }),
  'enrollment/prepare': z.strictObject({}),
  'enrollment/confirm': z.strictObject({ code: mfaCodeSchema }),
  verify: mfaVerifyRequestSchema,
  reauthenticate: z.strictObject({ password: z.string().min(1).max(256), code: mfaCodeSchema }),
  'recovery-codes': z.strictObject({}),
  disable: z.strictObject({}),
  'recovery/admin': z.strictObject({ esntlId: z.string().min(1).max(20), verificationReference: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9._-]{0,199}$/) }),
} as const;
export type MfaStatus = z.infer<typeof mfaStatusSchema>;
export type MfaEnrollment = z.infer<typeof mfaEnrollmentSchema>;
