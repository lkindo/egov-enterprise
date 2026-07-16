'use client';

import React, { useEffect, useCallback } from 'react';
import { toast as sonnerToast } from 'sonner';

type ToastType = 'success' | 'error' | 'info' | 'loading';

export const useToast = () => {
  const toast = useCallback((message: unknown, type: ToastType = 'info') => {
    // Failsafe: format message as string to prevent rendering errors
    const displayMessage = typeof message === 'string'
      ? message
      : ((message as { message?: string })?.message || JSON.stringify(message) || '알 수 없는 오류가 발생했습니다.');

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
