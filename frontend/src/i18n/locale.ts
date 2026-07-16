/**
 * 로케일 스위처 유틸 (클라이언트 전용).
 *
 * <p>next-intl 의 `src/i18n/request.ts` 가 `NEXT_LOCALE` 쿠키를 읽어 카탈로그(messages/{locale}.json)를
 * 결정하므로, 아래 `setLocale` 로 쿠키를 갱신한 뒤 새로고침(또는 `router.refresh()`)하면
 * 선택한 로케일이 전역에 반영된다. 향후 로케일 스위처 컴포넌트에서 사용한다.
 */

/** 지원 로케일. 카탈로그(messages/{locale}.json)와 1:1 대응한다. */
export type AppLocale = 'ko' | 'en';

/** next-intl 이 참조하는 로케일 쿠키명. */
export const LOCALE_COOKIE = 'NEXT_LOCALE';

/** 지원 로케일 목록 (스위처 렌더링용). */
export const SUPPORTED_LOCALES: readonly AppLocale[] = ['ko', 'en'];

/** 기본 로케일. request.ts 의 폴백 로케일과 일치시킨다. */
export const DEFAULT_LOCALE: AppLocale = 'ko';

/**
 * `NEXT_LOCALE` 쿠키를 설정한다. (기본 만료 1년, 사이트 전역 경로)
 *
 * <p>서버 렌더링 환경(document 미존재)에서는 no-op 이다. 호출부는 값 설정 후
 * 페이지를 새로고침해야 서버측 카탈로그가 재계산된다.
 */
export function setLocale(
  locale: AppLocale,
  maxAgeSeconds: number = 60 * 60 * 24 * 365,
): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${maxAgeSeconds}; samesite=lax`;
}
