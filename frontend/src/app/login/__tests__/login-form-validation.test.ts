import { describe, expect, it } from 'vitest';

import { loginFormSchema } from '../login-form-validation';

describe('login form validation', () => {
  it('rejects an empty or whitespace-only password the server would refuse', () => {
    for (const password of ['', '   ', '\t']) {
      const result = loginFormSchema.safeParse({ userId: 'user01', password });
      expect(result.success, JSON.stringify(password)).toBe(false);
      expect(result.error?.issues.map((issue) => issue.message)).toContain('비밀번호를 입력해 주세요.');
    }
  });

  it('keeps the spaces of a real password and enforces the server length limit', () => {
    expect(loginFormSchema.parse({ userId: 'user01', password: ' secret ' }).password).toBe(' secret ');
    expect(loginFormSchema.safeParse({ userId: 'user01', password: 'x'.repeat(128) }).success).toBe(true);
    expect(loginFormSchema.safeParse({ userId: 'user01', password: 'x'.repeat(129) }).success).toBe(false);
  });
});
