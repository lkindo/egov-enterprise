import { isAxiosError } from 'axios';
import type { FieldErrorItem } from '@/lib/api/client';
import { userFacingErrorMessage } from '@/lib/safe-error-log';

/**
 * 백엔드 검증 실패 응답에서 필드별 오류를 뽑는다. [W1-14]
 *
 * 종전에는 필드 정보가 응답에 아예 없어(오류들이 한 문장으로 이어 붙여져 있었다) 프론트가
 * "어떤 입력이 틀렸는지" 알 수 없었다. 이제 `errors[]` 를 폼 필드에 귀속시킬 수 있다.
 *
 * 같은 필드에 오류가 여럿이면 첫 번째만 남긴다 — 폼 UI 는 필드당 한 줄만 보여주기 때문이다.
 * (백엔드가 리스트로 내려주므로 전부 필요하면 원본 `errors` 를 직접 읽으면 된다.)
 *
 * @returns 필드→메시지 맵. 검증 오류가 아니면 undefined.
 */
export function extractFieldErrors(error: unknown): Record<string, string> | undefined {
  const data = isAxiosError(error)
    ? (error.response?.data as { errors?: FieldErrorItem[] } | undefined)
    : (error as { response?: { data?: { errors?: FieldErrorItem[] } } } | null)?.response?.data;

  const items = data?.errors;
  if (!Array.isArray(items) || items.length === 0) {
    return undefined;
  }

  const result: Record<string, string> = {};
  for (const item of items) {
    if (item?.field && typeof item.message === 'string' && !(item.field in result)) {
      result[item.field] = item.message;
    }
  }
  return Object.keys(result).length > 0 ? result : undefined;
}

/**
 * Server Action 이 사용자에게 돌려줄 오류 문장을 고른다.
 *
 * [2026-09-15 DEC-OPS-100] 서버가 준 문구가 있으면 그것을, axios 오류지만 서버 문구가 없으면 호출부의
 * 과업별 안내(`fallbackMessage`)를 쓴다. 종전에는 axios 의 transport 원문(`Network Error`·
 * `Request failed with status code 500`)을 그대로 돌려줘 화면 토스트가 영어 원문을 보였다.
 */
export function extractErrorMessage(error: unknown, fallbackMessage: string = '오류가 발생했습니다.'): string {
  return userFacingErrorMessage(error) ?? fallbackMessage;
}
