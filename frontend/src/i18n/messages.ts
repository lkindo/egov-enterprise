import ko from '../../messages/ko.json';
import en from '../../messages/en.json';
import type { AppLocale } from './locales';

/** 카탈로그 모양 — 한국어 카탈로그가 정본이다. 영어 카탈로그는 같은 키를 갖는다(i18n-catalog-contract). */
export type AppMessages = typeof ko;

const CATALOGS: Record<AppLocale, AppMessages> = { ko, en };

export function messagesFor(locale: AppLocale): AppMessages {
  return CATALOGS[locale];
}

/**
 * 스키마·상수에 적는 카탈로그 키 표지. 검증 메시지는 화면 밖(zod 스키마)에서 정해지므로 문장 대신 `$t:네임스페이스.키` 를 적고,
 * 보이는 곳(수동 폼 검증)이 현재 로케일로 바꾼다.
 */
export const CATALOG_KEY_PREFIX = '$t:';

export function catalogKey(key: string): string {
  return `${CATALOG_KEY_PREFIX}${key}`;
}

export function catalogKeyOf(message: string): string | undefined {
  return message.startsWith(CATALOG_KEY_PREFIX) ? message.slice(CATALOG_KEY_PREFIX.length) : undefined;
}
