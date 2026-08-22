/**
 * 브랜드 프로필 축(data-brand-theme)의 서버 측 결정자.
 *
 * 프로필 CSS(src/styles/themes/*.css)는 `<html data-brand-theme="…">` 속성이 있어야
 * 활성화된다. 값은 요청마다 달라질 이유가 없는 배포 단위 설정이므로 서버 env 로만 읽고,
 * allowlist 밖 값은 기본 프로필로 강등한다 — 존재하지 않는 프로필명이 속성에 실리면
 * 시맨틱 변수 전체가 미정의로 남아 조용한 시각 파손이 되기 때문이다.
 *
 * 라우트별 프로필 배정은 ADR-0004 가 금지한다(전역 1곳 배선만 허용).
 */
export const BRAND_THEMES = ['premium', 'krds-aligned'] as const;

export type BrandTheme = (typeof BRAND_THEMES)[number];

export const DEFAULT_BRAND_THEME: BrandTheme = 'premium';

export function resolveBrandTheme(raw: string | undefined): BrandTheme {
  return (BRAND_THEMES as readonly string[]).includes(raw ?? '')
    ? (raw as BrandTheme)
    : DEFAULT_BRAND_THEME;
}
