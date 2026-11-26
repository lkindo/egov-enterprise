'use client';

import type { ReactNode } from 'react';
import { IntlProvider, type IntlError, IntlErrorCode } from 'use-intl';
import { APP_TIME_ZONE, type AppLocale } from './locales';
import type { AppMessages } from './messages';

/** 개발·시험에서는 누락 키를 숨기지 않는다(ADR-0063 결정 5 ③). 운영에서는 키를 그대로 보이고 화면을 깨뜨리지 않는다. */
function reportIntlError(error: IntlError): void {
  if (process.env.NODE_ENV !== 'production' && error.code === IntlErrorCode.MISSING_MESSAGE) throw error;
}

/** 화면 카탈로그 공급자 — 루트 레이아웃이 현재 로케일로, 미번역 화면 영역은 한국어로 다시 감싼다. */
export function I18nProvider({ locale, messages, children }: { locale: AppLocale; messages: AppMessages; children: ReactNode }) {
  return (
    <IntlProvider locale={locale} messages={messages} timeZone={APP_TIME_ZONE} onError={reportIntlError}>
      {children}
    </IntlProvider>
  );
}
