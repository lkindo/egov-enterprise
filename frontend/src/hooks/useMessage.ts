import { useCallback } from 'react';
import { useTranslations } from 'next-intl';

/**
 * 메시지 조회 훅 — next-intl 백엔드로 전환(seam 유지).
 *
 * <p>기존 `t(keyPath, params)` API(점표기 중첩 키 + {param} 치환)를 그대로 보존하여 호출부 무변경.
 * 내부적으로 next-intl 루트 번역기에 위임한다(카탈로그·로케일은 src/i18n/request.ts 가 제공).
 * 키 부재/ICU 파싱 오류 시 keyPath 를 반환하는 graceful fallback 유지.
 */
export function useMessage() {
  const translate = useTranslations();

  const t = useCallback((keyPath: string, params?: Record<string, string | number>): string => {
    try {
      // next-intl 은 리터럴 키 타입을 요구하므로 동적 문자열 키는 캐스팅으로 위임한다.
      return (translate as (key: string, values?: Record<string, string | number>) => string)(keyPath, params);
    } catch {
      console.warn(`Message key not found or invalid: ${keyPath}`);
      return keyPath;
    }
  }, [translate]);

  return { t };
}
