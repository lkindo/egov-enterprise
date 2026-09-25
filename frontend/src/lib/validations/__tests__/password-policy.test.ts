import { describe, expect, it } from 'vitest';
import type { ZodType } from 'zod';
import {
  AdminPasswordChangeRequestSchema,
  PasswordChangeRequestSchema,
  UserDtoSchema,
  UserSignupRequestSchema,
} from '@/types/generated-zod';
import { passwordRuleSchema } from '../password-policy';
import { adminPasswordResetSchema } from '@/components/admin/user/AdminPasswordResetForm';
import { changePasswordSchema } from '@/components/account/ChangePasswordForm';

/**
 * [2026-09-25 DIP S5] 화면의 비밀번호 규칙은 서버 공용 규칙(PasswordPolicy)과 같다.
 *
 * 서버 규칙은 OpenAPI → 생성 zod 로 흘러온다. 화면 규칙(password-policy)이 따로 정의돼 있으므로 두 규칙이
 * 같은 입력에 같은 판정을 내리는지 표본으로 대조한다 — 서버만 바뀌고 화면이 남으면 여기서 붉어진다.
 */
const SAMPLES = [
  'Abcdef1#',
  'password123!',
  'Pa1~`^_{}|[]\\:;<>,.?/"\'',
  `Aa1!${'a'.repeat(60)}`, // 64자
  `Aa1!${'a'.repeat(61)}`, // 65자
  'abcdefgh',
  'abcdef12',
  '!!!!1111',
  'Abc1!',
  'Abcd 12!',
  '비밀번호Ab1!',
];

const generated: Record<string, ZodType> = {
  'AdminPasswordChangeRequest.newPassword': AdminPasswordChangeRequestSchema.shape.newPassword,
  'PasswordChangeRequest.newPassword': PasswordChangeRequestSchema.shape.newPassword,
  'UserSignupRequest.pswd': UserSignupRequestSchema.shape.pswd,
  'UserDto.pswd': UserDtoSchema.shape.pswd,
};

describe('비밀번호 공용 규칙 — 화면과 서버가 같은 판정을 내린다', () => {
  const screen = passwordRuleSchema();

  it.each(Object.entries(generated))('%s 은(는) 화면 규칙과 모든 표본에서 판정이 같다', (_name, schema) => {
    for (const sample of SAMPLES) {
      expect(schema.safeParse(sample).success, sample).toBe(screen.safeParse(sample).success);
    }
  });

  it('규칙이 실제로 가르는 표본이 있다 — 모두 통과·모두 거부이면 이 대조는 의미가 없다', () => {
    const verdicts = SAMPLES.map((sample) => screen.safeParse(sample).success);
    expect(verdicts).toContain(true);
    expect(verdicts).toContain(false);
    expect(screen.safeParse('Abcdef1#').success).toBe(true);
    expect(screen.safeParse('abcdefgh').success).toBe(false);
  });

  it('본인 변경·관리자 초기화 폼도 같은 규칙을 쓴다 — 길이만 보던 종전 규칙으로 돌아가지 않는다', () => {
    const weak = 'abcdefgh';
    expect(adminPasswordResetSchema.safeParse({ newPassword: weak, confirmPassword: weak }).success).toBe(false);
    expect(changePasswordSchema.safeParse({ oldPassword: 'Old1234!', newPassword: weak, confirmPassword: weak }).success).toBe(false);
    const strong = 'Abcdef1#';
    expect(adminPasswordResetSchema.safeParse({ newPassword: strong, confirmPassword: strong }).success).toBe(true);
    expect(changePasswordSchema.safeParse({ oldPassword: 'Old1234!', newPassword: strong, confirmPassword: strong }).success).toBe(true);
  });
});
