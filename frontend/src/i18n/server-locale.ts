import { cookies } from 'next/headers';
import { createTranslator } from 'use-intl';
import { LOCALE_COOKIE, resolveLocale, type AppLocale } from './locales';
import { messagesFor } from './messages';

/** 이 요청의 로케일 — 쿠키만 본다(ADR-0063 결정 2). */
export async function requestLocale(): Promise<AppLocale> {
  return resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/** 서버 컴포넌트용 번역 함수 — 공급자 없이 카탈로그로 바로 만든다. */
export async function serverTranslator<N extends keyof ReturnType<typeof messagesFor>>(namespace: N) {
  const locale = await requestLocale();
  return createTranslator({ locale, messages: messagesFor(locale), namespace });
}
