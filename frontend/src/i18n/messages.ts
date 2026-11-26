import ko from '../../messages/ko.json';
import en from '../../messages/en.json';
import type { AppMessages } from './catalog';
import type { AppLocale } from './locales';

/**
 * 로케일별 카탈로그 값. 서버(루트 레이아웃·서버 번역)와 시험만 가져온다 — 클라이언트 컴포넌트가 가져오면 두 카탈로그가 모두 브라우저
 * 번들에 실린다. 클라이언트는 공급자가 받은 카탈로그를 쓴다.
 */
const CATALOGS: Record<AppLocale, AppMessages> = { ko, en };

export function messagesFor(locale: AppLocale): AppMessages {
  return CATALOGS[locale];
}
