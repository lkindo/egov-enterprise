'use client';

import React, { useEffect, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';
import { userFacingErrorMessage } from '@/lib/safe-error-log';

type ToastType = 'success' | 'error' | 'info' | 'loading';

export const useToast = () => {
  const toast = useCallback((message: unknown, type: ToastType = 'info') => {
    // Failsafe: format message as string to prevent rendering errors
    // [2026-09-15 DEC-OPS-100] 문자열을 포함한 모든 값에서 사용자 문장만 뽑는다 — 종전에는 객체를 JSON 원문으로,
    //   axios 오류는 transport 원문으로 보여 줬고, error.message 를 문자열로 넘긴 호출부의 transport 원문도 그대로 보였다.
    const displayMessage = userFacingErrorMessage(message) ?? '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.';

    if (type === 'success') {
      sonnerToast.success(displayMessage);
    } else if (type === 'error') {
      sonnerToast.error(displayMessage);
    } else if (type === 'loading') {
      sonnerToast.loading(displayMessage);
    } else {
      sonnerToast(displayMessage);
    }
  }, []);

  const success = useCallback((message: string) => toast(message, 'success'), [toast]);
  const error = useCallback((message: string) => toast(message, 'error'), [toast]);

  return {
    toast,
    success,
    error,
    removeToast: () => {},
  };
};

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const { error } = useToast();

  // API 오류 이벤트 리스너 등록
  useEffect(() => {
    const handleApiError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { message, status } = detail;
      // 401(인증) 오류는 로그인 처리 영역에서 핸들링하므로 호출하지 않음
      if (status !== 401) {
        error(message);
      }
    };

    window.addEventListener('api-error', handleApiError);
    return () => window.removeEventListener('api-error', handleApiError);
  }, [error]);

  return <>{children}</>;
}
