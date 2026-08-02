import { isAxiosError } from 'axios';
import type { FieldErrorItem } from '@/lib/api/client';

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
 * Type-safe error message extractor for Server Actions.
 * Safely extracts error messages from Axios errors, standard Errors, or response objects.
 */
export function extractErrorMessage(error: unknown, fallbackMessage: string = '오류가 발생했습니다.'): string {
  if (isAxiosError(error)) {
    const responseData = error.response?.data as { message?: string } | undefined;
    if (responseData?.message && typeof responseData.message === 'string') {
      return responseData.message;
    }
    if (error.message) {
      return error.message;
    }
  }

  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === 'object' && error !== null) {
    const errObj = error as { response?: { data?: { message?: string } }; message?: string };
    if (errObj.response?.data?.message && typeof errObj.response.data.message === 'string') {
      return errObj.response.data.message;
    }
    if (errObj.message && typeof errObj.message === 'string') {
      return errObj.message;
    }
  }

  return fallbackMessage;
}
