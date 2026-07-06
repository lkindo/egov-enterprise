vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import { describe, it, expect } from 'vitest';
import { MESSAGES } from '../messages';

describe('MESSAGES', () => {
  it('should export common messages', () => {
    expect(MESSAGES.common).toBeDefined();
    expect(MESSAGES.common.success).toBe('성공');
    expect(MESSAGES.common.error).toBe('오류가 발생했습니다.');
    expect(MESSAGES.common.save).toBe('저장');
  });

  it('should export login messages', () => {
    expect(MESSAGES.login).toBeDefined();
    expect(MESSAGES.login.title).toBeDefined();
  });
});
