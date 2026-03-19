'use client';

import { useEffect } from 'react';
import { useToast } from './toast';

export function ApiErrorNotifier() {
 const { toast } = useToast();

 useEffect(() => {
 const handleApiError = (event: any) => {
 const { message, status } = event.detail;
 
 // Don't show toast for 401 as it's handled by redirection or reissue
 if (status === 401) return;

 toast(message || '요청 처리 중 오류가 발생했습니다.', 'error');
 };

 window.addEventListener('api-error', handleApiError);
 return () => window.removeEventListener('api-error', handleApiError);
 }, [toast]);

 return null;
}
