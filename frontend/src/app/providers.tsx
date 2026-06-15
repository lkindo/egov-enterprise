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
import { ApiErrorNotifier } from './components/ui/api-error-notifier';
import { StandardErrorBoundary } from './components/ui/standard-error-boundary';
import { TooltipProvider } from '@/components/ui/tooltip';
import { MotionConfig } from 'framer-motion';

const GlobalCommandCenter = dynamic(() => import('./components/ui/global-command-center').then(mod => mod.GlobalCommandCenter), { ssr: false });
const SmartOnboardingHub = dynamic(() => import('./components/ui/smart-onboarding-hub').then(mod => mod.SmartOnboardingHub), { ssr: false });
const SessionExpiryWarning = dynamic(() => import('./components/ui/session-expiry-warning').then(mod => mod.SessionExpiryWarning), { ssr: false });


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
                        <ApiErrorNotifier />
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
