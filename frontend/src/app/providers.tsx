'use client';

import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { ToastProvider } from '@/app/components/ui/toast';
import { ConfirmProvider } from '@/app/components/ui/confirm-modal';
import { GlobalShortcutProvider } from '@/app/components/ui/global-shortcut-provider';
import dynamic from 'next/dynamic';
// ApiErrorNotifier removed due to duplicate toast listener in toast.tsx
import { StandardErrorBoundary } from './components/ui/standard-error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MotionConfig } from 'framer-motion';

const GlobalCommandCenter = dynamic(() => import('./components/ui/global-command-center').then(mod => mod.GlobalCommandCenter), { ssr: false });
const SmartOnboardingHub = dynamic(() => import('./components/ui/smart-onboarding-hub').then(mod => mod.SmartOnboardingHub), { ssr: false });
const SessionExpiryWarning = dynamic(() => import('./components/ui/session-expiry-warning').then(mod => mod.SessionExpiryWarning), { ssr: false });


import { z } from 'zod';
z.setErrorMap((issue) => {
  if (issue.code === 'invalid_format' && issue.format === 'email') {
    return { message: '올바른 이메일 주소를 입력하세요.' };
  }
  if (issue.code === 'too_small' && issue.origin === 'string') {
    if (issue.minimum === 1) {
      return { message: '필수 입력 항목입니다.' };
    }
    return { message: `최소 ${issue.minimum}자 이상 입력해야 합니다.` };
  }
  if (issue.code === 'too_big' && issue.origin === 'string') {
    return { message: `최대 ${issue.maximum}자 이하로 입력해야 합니다.` };
  }
  return { message: issue.message || '입력값이 올바르지 않습니다.' };
});

import { UserInfo } from '@/services/foundation/auth/authService';

export default function Providers({ 
  children,
  initialUser 
}: { 
  children: React.ReactNode;
  initialUser?: UserInfo | null;
}) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000,
            retry: 1,
            refetchOnWindowFocus: false,
          },
        },
      })
  );

  // Page Visibility API 연동: 탭이 보이지 않을 때 불필요한 백그라운드 폴링 중단
  useEffect(() => {
    const handleVisibilityChange = () => {
      focusManager.setFocused(document.visibilityState === 'visible');
    };
    
    // 초기 상태 설정
    handleVisibilityChange();
    
    window.addEventListener('visibilitychange', handleVisibilityChange);
    return () => window.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <MotionConfig reducedMotion="user">
        <ToastProvider>
          <ConfirmProvider>
            <GlobalShortcutProvider>
              <AuthProvider initialUser={initialUser}>
                <LayoutProvider>
                  <WebSocketProvider>
                    <TooltipProvider delayDuration={0}>
                      <StandardErrorBoundary>
                        {children}
                      </StandardErrorBoundary>
                      <GlobalCommandCenter />
                      <SessionExpiryWarning />
                      <SmartOnboardingHub />
                    </TooltipProvider>
                  </WebSocketProvider>
                </LayoutProvider>
              </AuthProvider>
            </GlobalShortcutProvider>
          </ConfirmProvider>
        </ToastProvider>
      </MotionConfig>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
