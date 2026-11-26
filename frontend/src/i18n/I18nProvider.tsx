'use client';

import type { ReactNode } from 'react';
import { IntlProvider, type IntlError, IntlErrorCode } from 'use-intl';
import { APP_TIME_ZONE, type AppLocale } from './locales';
import type { AppMessages } from './catalog';

/**
 * 개발·시험에서는 번역 결함(누락 키·빠지거나 틀린 ICU 인자·잘못된 키)을 숨기지 않는다(ADR-0063 결정 5 ④) — 시험 설정의 한국어 대역과 같은
 * 기준이다. 실행 환경의 시각·시간대 대체(ENVIRONMENT_FALLBACK)는 결함이 아니다. 운영에서는 키를 그대로 보이고 화면을 깨뜨리지 않는다.
 */
function reportIntlError(error: IntlError): void {
  if (process.env.NODE_ENV !== 'production' && error.code !== IntlErrorCode.ENVIRONMENT_FALLBACK) throw error;
}

/** 화면 카탈로그 공급자 — 로케일 경계({@link ./LocaleBoundary})가 이 화면의 로케일과 카탈로그로 감싼다. */
export function I18nProvider({ locale, messages, children }: { locale: AppLocale; messages: AppMessages; children: ReactNode }) {
  return (
    <IntlProvider locale={locale} messages={messages} timeZone={APP_TIME_ZONE} onError={reportIntlError}>
      {children}
    </IntlProvider>
  );
}
