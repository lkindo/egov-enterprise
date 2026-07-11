import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';

/**
 * next-intl 요청 설정 (App Router, i18n 라우팅 없는 최소 침습 방식).
 *
 * <p>로케일은 NEXT_LOCALE 쿠키(기본 'ko')로 결정하고, 로케일별 카탈로그
 * (messages/{locale}.json)를 동적 import 로 로드한다. 미지원 로케일이거나
 * 카탈로그 로드에 실패하면 기본 카탈로그(ko.json)로 폴백하여 렌더가 깨지지 않게 한다.
 */
const DEFAULT_LOCALE = 'ko';

export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = store.get('NEXT_LOCALE')?.value || DEFAULT_LOCALE;

  let messages: Record<string, unknown>;
  try {
    // 요청 로케일의 카탈로그 로드 (예: messages/en.json)
    messages = (await import(`../../messages/${locale}.json`)).default;
  } catch {
    // 미지원 로케일/누락 카탈로그 → 기본(ko) 폴백
    messages = (await import(`../../messages/${DEFAULT_LOCALE}.json`)).default;
  }

  return {
    locale,
    messages,
  };
});
