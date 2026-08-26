import { describe, expect, it } from 'vitest';

import { policySchema } from '../PolicyAdminClient';

describe('policy validation', () => {
  it('requires title/content and preserves generated maximum lengths', () => {
    expect(policySchema.safeParse({ plcyTtl: '개인정보 처리방침', plcyCn: '<p>내용</p>' }).success).toBe(true);
    expect(policySchema.safeParse({ plcyTtl: '', plcyCn: '<p>내용</p>' }).success).toBe(false);
    expect(policySchema.safeParse({ plcyTtl: '가'.repeat(101), plcyCn: '<p>내용</p>' }).success).toBe(false);
    expect(policySchema.safeParse({ plcyTtl: '정책', plcyCn: '가'.repeat(4001) }).success).toBe(false);
  });
});
