'use client';

import { useEffect } from 'react';
import { useToast } from './toast';

export function ApiErrorNotifier() {
 const { toast } = useToast();

 useEffect(() => {
  const handleApiError = (event: any) => {
    if (!event.detail) return;
    const { message, status } = event.detail;
 
 // Don't show toast for 401 as it's handled by redirection or reissue
 if (status === 401) return;

 toast(message || '요청 泥섎━ 以님ㅻ쪟媛 諛쒖깮?덉뒿?덈떎.', 'error');
 };

 window.addEventListener('api-error', handleApiError);
 return () => window.removeEventListener('api-error', handleApiError);
 }, [toast]);

 return null;
}

