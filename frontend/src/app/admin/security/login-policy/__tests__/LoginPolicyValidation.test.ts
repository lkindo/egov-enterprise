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

  it('[DIP B4 P8] 접속 허용 시간은 짝이다 — 한쪽만 있으면 비어 있는 쪽 칸에 오류를 건다', () => {
    const onlyStart = loginPolicySchema.safeParse({ ...validPolicy, endTm: '' });
    expect(onlyStart.success).toBe(false);
    expect(onlyStart.error?.issues[0]?.path).toEqual(['endTm']);

    const onlyEnd = loginPolicySchema.safeParse({ ...validPolicy, bgngTm: '' });
    expect(onlyEnd.success).toBe(false);
    expect(onlyEnd.error?.issues[0]?.path).toEqual(['bgngTm']);
  });

  it('시작 시간과 종료 시간이 같으면 종료 시간에 오류를 걸고, 자정 넘는 시간창은 허용한다', () => {
    const equalWindow = loginPolicySchema.safeParse({
      ...validPolicy,
      bgngTm: '09:00',
      endTm: '09:00',
    });
    expect(equalWindow.success).toBe(false);
    expect(equalWindow.error?.issues[0]?.path).toEqual(['endTm']);
    expect(equalWindow.error?.issues[0]?.message).toBe('종료 시간은 시작 시간과 다르게 입력해 주세요.');

    expect(loginPolicySchema.safeParse({
      ...validPolicy,
      bgngTm: '22:00',
      endTm: '06:00',
    }).success).toBe(true);
  });
});
