import { describe, expect, it } from 'vitest';

import { loginPolicySchema } from '../LoginPolicyAdminClient';

const validPolicy = {
  ipAddr: '192.168.0.1',
  lmtYn: 'N' as const,
  bgngTm: '09:00',
  endTm: '18:00',
  otpUseYn: 'Y' as const,
};

describe('login policy validation', () => {
  it('generated IP length boundary is preserved', () => {
    expect(loginPolicySchema.safeParse(validPolicy).success).toBe(true);
    expect(loginPolicySchema.safeParse({ ...validPolicy, ipAddr: '1'.repeat(31) }).success).toBe(false);
  });

  it.each(['24:00', '12:60', '9:00', '0900'])(
    'rejects an invalid HH:mm time: %s',
    (time) => {
      expect(loginPolicySchema.safeParse({ ...validPolicy, bgngTm: time }).success).toBe(false);
    },
  );

  it('accepts blank optional IP and time restrictions', () => {
    expect(loginPolicySchema.safeParse({
      ...validPolicy,
      ipAddr: '',
      bgngTm: '',
      endTm: '',
    }).success).toBe(true);
  });
});
