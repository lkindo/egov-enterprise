import { cookies, headers } from 'next/headers';
import { createTranslator } from 'use-intl/core';
import type { AppMessages } from './catalog';
import { LOCALE_COOKIE, resolveLocale, type AppLocale } from './locales';
import { messagesFor } from './messages';
import { effectiveLocale, REQUEST_PATHNAME_HEADER } from './surfaces';

/** 사용자가 고른 로케일 — 쿠키만 본다(ADR-0063 결정 2). */
export async function requestLocale(): Promise<AppLocale> {
  return resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** 이 요청의 화면에서 실제로 그리는 로케일 — 번역을 마치지 않은 화면(경로를 모를 때 포함)은 한국어다. */
export async function requestEffectiveLocale(): Promise<AppLocale> {
  return effectiveLocale(await requestLocale(), (await headers()).get(REQUEST_PATHNAME_HEADER));
}

/** 서버 컴포넌트용 번역 함수 — 공급자 없이 카탈로그로 바로 만든다. 로케일을 주지 않으면 이 요청의 화면 로케일이다. */
export async function serverTranslator<N extends keyof AppMessages>(namespace: N, locale?: AppLocale) {
  const target = locale ?? await requestEffectiveLocale();
  return createTranslator({ locale: target, messages: messagesFor(target), namespace });
}
