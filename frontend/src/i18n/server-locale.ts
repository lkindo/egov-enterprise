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

/**
 * 이 요청의 화면에서 실제로 그리는 로케일 — 번역을 마치지 않은 화면(경로를 모를 때 포함)은 한국어다. 경로만 본다 — 루트 레이아웃이
 * 문서를 내보내기 전에 인증 조회를 기다리지 않는다. 번역을 마친 경로 위에 한국어 전용 화면(임시 비밀번호 관문)이 대신 그려지는
 * 경우는 그 화면이 본문에 lang="ko" 를 달고, 하이드레이션 뒤 로케일 경계가 문서 언어를 맞춘다(제목은 그 경로의 메타데이터가 정한다).
 */
export async function requestEffectiveLocale(): Promise<AppLocale> {
  return effectiveLocale(await requestLocale(), (await headers()).get(REQUEST_PATHNAME_HEADER));
}

/** 서버 컴포넌트용 번역 함수 — 공급자 없이 카탈로그로 바로 만든다. 로케일을 주지 않으면 이 요청의 화면 로케일이다. */
export async function serverTranslator<N extends keyof AppMessages>(namespace: N, locale?: AppLocale) {
  const target = locale ?? await requestEffectiveLocale();
  return createTranslator({ locale: target, messages: messagesFor(target), namespace });
}
