import { cookies, headers } from 'next/headers';
import { createTranslator } from 'use-intl/core';
import type { AppMessages } from './catalog';
import { getServerUser } from '@/lib/auth/server-user';
import { DEFAULT_LOCALE, LOCALE_COOKIE, resolveLocale, type AppLocale } from './locales';
import { messagesFor } from './messages';
import { effectiveLocale, REQUEST_PATHNAME_HEADER } from './surfaces';

/** 사용자가 고른 로케일 — 쿠키만 본다(ADR-0063 결정 2). */
export async function requestLocale(): Promise<AppLocale> {
  return resolveLocale((await cookies()).get(LOCALE_COOKIE)?.value);
}

/**
 * 이 요청의 화면에서 실제로 그리는 로케일 — 번역을 마치지 않은 화면(경로를 모를 때 포함)은 한국어다. 번역을 마친 경로라도 임시
 * 비밀번호 사용자에게는 변경 관문(한국어 전용)이 그 화면을 대신하므로 한국어다 — 첫 문서의 언어·제목이 관문과 같다. 현재 사용자는
 * 영어를 고른 번역 화면 요청에서만 읽는다(요청당 한 번, 레이아웃의 인증 공급자와 같은 결과).
 */
export async function requestEffectiveLocale(): Promise<AppLocale> {
  const byRoute = effectiveLocale(await requestLocale(), (await headers()).get(REQUEST_PATHNAME_HEADER));
  if (byRoute === DEFAULT_LOCALE) return byRoute;
  return (await getServerUser())?.passwordChangeRequired ? DEFAULT_LOCALE : byRoute;
}

/** 서버 컴포넌트용 번역 함수 — 공급자 없이 카탈로그로 바로 만든다. 로케일을 주지 않으면 이 요청의 화면 로케일이다. */
export async function serverTranslator<N extends keyof AppMessages>(namespace: N, locale?: AppLocale) {
  const target = locale ?? await requestEffectiveLocale();
  return createTranslator({ locale: target, messages: messagesFor(target), namespace });
}
