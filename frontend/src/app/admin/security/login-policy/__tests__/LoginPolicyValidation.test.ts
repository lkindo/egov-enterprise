import { describe, expect, it } from 'vitest';

import { loginPolicySchema, toClockInput } from '../LoginPolicyAdminClient';

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
    expect(loginPolicySchema.safeParse({ ...validPolicy, ipAddr: '1'.repeat(45) }).success).toBe(true);
    expect(loginPolicySchema.safeParse({ ...validPolicy, ipAddr: '1'.repeat(46) }).success).toBe(false);
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

  it('[2026-11-25] 옛 표기(0900)로 저장된 시각은 편집 폼에 HH:mm 으로 채워 다른 칸만 고쳐도 저장할 수 있다', () => {
    expect(toClockInput('0900')).toBe('09:00');
    expect(toClockInput('09:00')).toBe('09:00');
    expect(toClockInput(' ')).toBe('');
    expect(toClockInput(null)).toBe('');
    expect(toClockInput(undefined)).toBe('');
    // 채운 값이 그대로 검증을 지난다 — 종전에는 '0900' 이 HH:mm 검증에 막혔다.
    expect(loginPolicySchema.safeParse({
      ...validPolicy,
      bgngTm: toClockInput('0900'),
      endTm: toClockInput('1800'),
    }).success).toBe(true);
  });
});
