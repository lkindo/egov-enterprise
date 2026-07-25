import { isAxiosError } from 'axios';

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
