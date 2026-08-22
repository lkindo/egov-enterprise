import { describe, expect, it } from 'vitest';

import { BRAND_THEMES, DEFAULT_BRAND_THEME, resolveBrandTheme } from '../brand-theme';

describe('resolveBrandTheme', () => {
  it('allowlist 의 프로필은 그대로 통과한다', () => {
    for (const theme of BRAND_THEMES) {
      expect(resolveBrandTheme(theme)).toBe(theme);
    }
  });

  it('미지정·빈 값·allowlist 밖 값은 기본 프로필로 강등한다', () => {
    // 없는 프로필명이 <html> 속성에 실리면 시맨틱 변수 전체가 미정의가 되므로
    // 통과가 아니라 강등이 계약이다.
    expect(resolveBrandTheme(undefined)).toBe(DEFAULT_BRAND_THEME);
    expect(resolveBrandTheme('')).toBe(DEFAULT_BRAND_THEME);
    expect(resolveBrandTheme('krds-standard')).toBe(DEFAULT_BRAND_THEME);
    expect(resolveBrandTheme('PREMIUM')).toBe(DEFAULT_BRAND_THEME);
    expect(resolveBrandTheme('premium; DROP TABLE')).toBe(DEFAULT_BRAND_THEME);
  });
});
