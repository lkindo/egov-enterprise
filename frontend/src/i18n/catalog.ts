import type { MessageKeys, NestedKeyOf } from 'use-intl';
import type ko from '../../messages/ko.json';

/**
 * 카탈로그의 모양과 키 — 한국어 카탈로그가 정본이다. 영어 카탈로그는 같은 키를 갖는다(i18n-catalog-contract).
 *
 * <p>이 모듈은 카탈로그 JSON 을 타입으로만 읽는다 — 브라우저 번들에 카탈로그 전부를 싣지 않는다. 카탈로그 값은 서버(루트 레이아웃)가
 * 그 요청의 로케일 것만 공급자에 넘긴다.
 */
export type AppMessages = typeof ko;

/** 카탈로그의 문구 키(`네임스페이스.키`). 오타는 타입 검사가 막는다. */
export type CatalogKey = MessageKeys<AppMessages, NestedKeyOf<AppMessages>>;

/**
 * 스키마·상수에 적는 카탈로그 키 표지. 검증 메시지·안내는 화면 밖(zod 스키마·저장해 둔 안내)에서 정해지므로 문장 대신
 * `$t:네임스페이스.키` 를 적고, 보이는 곳이 그 순간의 로케일로 바꾼다(로케일을 바꾸면 다시 그린다).
 */
export const CATALOG_KEY_PREFIX = '$t:';

export function catalogKey(key: CatalogKey): string {
  return `${CATALOG_KEY_PREFIX}${key}`;
}

/** 표지에서 키를 꺼낸다. 표지가 아니면 없다. 키가 실제로 있는지는 번역 함수의 `has` 로 본다. */
export function catalogKeyOf(message: string): string | undefined {
  return message.startsWith(CATALOG_KEY_PREFIX) ? message.slice(CATALOG_KEY_PREFIX.length) : undefined;
}
