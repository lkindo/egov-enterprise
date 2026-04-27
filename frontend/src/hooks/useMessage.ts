import { MESSAGES } from '@/constants/messages';

/**
 * 메시지 조회 - 추후 i18n 라이브러리(next-intl 등) 도입 시 이곳만 수정하면 전역 반영 가능
 */
export function useMessage() {
  const t = (keyPath: string, params?: Record<string, string | number>): string => {
    const keys = keyPath.split('.');
    let current: unknown = MESSAGES;

    for (const key of keys) {
      if (typeof current === 'object' && current !== null && key in current) {
        current = (current as Record<string, unknown>)[key];
      } else {
        console.warn(`Message key not found: ${keyPath}`);
        return keyPath;
      }
    }

    if (typeof current !== 'string') {
      console.warn(`Message key is not a string: ${keyPath}`);
      return keyPath;
    }

    let message: string = current;
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        message = message.replace(`{${key}}`, String(value));
      });
    }

    return message;
  };

  return { t };
}
