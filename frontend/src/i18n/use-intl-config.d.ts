import type { AppMessages } from './catalog';
import type { AppLocale } from './locales';

/**
 * 번역 함수의 키를 카탈로그로 좁힌다(ADR-0063 결정 5) — `t('…')` 의 오타·없는 네임스페이스를 타입 검사(`type-check`)가 막는다.
 */
declare module 'use-intl' {
  interface AppConfig {
    Locale: AppLocale;
    Messages: AppMessages;
  }
}
