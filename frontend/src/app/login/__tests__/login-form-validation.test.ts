import { describe, expect, it } from 'vitest';

import { loginFormSchema } from '../login-form-validation';
import { catalogKey } from '@/i18n/catalog';
import ko from '../../../../messages/ko.json';

describe('login form validation', () => {
  it('rejects an empty or whitespace-only password the server would refuse', () => {
    for (const password of ['', '   ', '\t']) {
      const result = loginFormSchema.safeParse({ userId: 'user01', password });
      expect(result.success, JSON.stringify(password)).toBe(false);
      // 안내 문구는 카탈로그 키다(ADR-0063) — 보이는 곳(수동 폼 검증)이 현재 로케일 문장으로 바꾼다.
      expect(result.error?.issues.map((issue) => issue.message)).toContain(catalogKey('login.passwordRequired'));
    }
    expect(ko.login.passwordRequired).toBe('비밀번호를 입력해 주세요.');
  });

  it('keeps the spaces of a real password and enforces the server length limit', () => {
    expect(loginFormSchema.parse({ userId: 'user01', password: ' secret ' }).password).toBe(' secret ');
    expect(loginFormSchema.safeParse({ userId: 'user01', password: 'x'.repeat(128) }).success).toBe(true);
    expect(loginFormSchema.safeParse({ userId: 'user01', password: 'x'.repeat(129) }).success).toBe(false);
  });
});
