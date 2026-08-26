import { describe, expect, it } from 'vitest';

import { ismSchema } from '../IsmClient';

const validPayload = {
  rjctRsnCn: '승인 근거를 남깁니다.',
};

describe('IsmClient validation contract', () => {
  it('requires a non-empty decision opinion and preserves the generated maximum length', () => {
    expect(ismSchema.safeParse(validPayload).success).toBe(true);
    expect(ismSchema.safeParse({ rjctRsnCn: '' }).success).toBe(false);
    expect(ismSchema.safeParse({ rjctRsnCn: '   ' }).success).toBe(false);
    expect(ismSchema.safeParse({ rjctRsnCn: '가'.repeat(4001) }).success).toBe(false);
  });
});
