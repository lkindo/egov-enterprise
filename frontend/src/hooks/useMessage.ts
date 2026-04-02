import { MESSAGES } from '@/constants/messages';

/**
 * 硫붿떆吏 조회 님 * - 異뷀썑 i18n ?쇱씠釉뚮윭由next-intl 님 ?꾩엯 님님?낅쭔 ?섏젙?섎㈃ ?꾩뿭 諛섏쁺 媛님 */
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
