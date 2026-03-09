import { MESSAGES } from '@/constants/messages';

/**
 * 메시지 조회 훅
 * - 추후 i18n 라이브러리(next-intl 등) 도입 시 이 훅만 수정하면 전역 반영 가능
 */
export function useMessage() {
  const t = (keyPath: string): string => {
    const keys = keyPath.split('.');
    let current: any = MESSAGES;

    for (const key of keys) {
      if (current[key] === undefined) {
        console.warn(`Message key not found: ${keyPath}`);
        return keyPath;
      }
      current = current[key];
    }

    return current as string;
  };

  return { t };
}
