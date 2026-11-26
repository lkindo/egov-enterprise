/**
 * 화면 로케일(ADR-0063). 기본·정본은 한국어이고 영어를 함께 제공한다. URL 은 바꾸지 않고 쿠키로 고른다.
 */
export const LOCALES = ['ko', 'en'] as const;
export type AppLocale = (typeof LOCALES)[number];
export const DEFAULT_LOCALE: AppLocale = 'ko';
/** 로케일 쿠키 — 값은 {@link LOCALES} 만 받는다. 인증 정보가 아니다. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';
/** 날짜·시각은 언제나 한국 표준시다(CTX-025). */
export const APP_TIME_ZONE = 'Asia/Seoul';

/** 쿠키·입력 값을 지원 로케일로 좁힌다. 모르거나 빈 값은 한국어다. */
export function resolveLocale(value: string | null | undefined): AppLocale {
  return value === 'en' ? 'en' : DEFAULT_LOCALE;
}

/** 브라우저 쿠키에서 로케일을 읽는다(서버에서는 기본값). */
export function readBrowserLocale(): AppLocale {
  if (typeof document === 'undefined') return DEFAULT_LOCALE;
  const entry = document.cookie.split(';').map((part) => part.trim()).find((part) => part.startsWith(`${LOCALE_COOKIE}=`));
  return resolveLocale(entry ? decodeURIComponent(entry.slice(LOCALE_COOKIE.length + 1)) : undefined);
}

/** 브라우저 쿠키에 로케일을 쓴다(1년, 사이트 전체, 같은 사이트 요청만). */
export function writeBrowserLocale(locale: AppLocale): void {
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=31536000; samesite=lax`;
}
