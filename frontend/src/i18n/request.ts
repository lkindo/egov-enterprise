import { getRequestConfig } from 'next-intl/server';
import { cookies } from 'next/headers';
import { MESSAGES } from '@/constants/messages';

/**
 * next-intl 요청 설정 (App Router, i18n 라우팅 없는 최소 침습 방식).
 *
 * <p>기존 정적 MESSAGES(ko)를 카탈로그로 재사용하고, 로케일은 NEXT_LOCALE 쿠키(기본 'ko')로 결정한다.
 * 다국어 확장 시 messages 를 로케일별 JSON(messages/ko.json, messages/en.json)으로 분리하면 된다.
 */
export default getRequestConfig(async () => {
  const store = await cookies();
  const locale = store.get('NEXT_LOCALE')?.value || 'ko';

  return {
    locale,
    // 현재는 단일 카탈로그(ko). 로케일 분리 전까지 동일 메시지를 사용한다.
    messages: MESSAGES as unknown as Record<string, unknown>,
  };
});
