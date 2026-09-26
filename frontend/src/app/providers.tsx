'use client';

import { QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { UnsavedChangesProvider } from '@/contexts/UnsavedChangesContext';
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

export function RouteScopedGlobalOverlays({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === '/login' || pathname.startsWith('/login/');

  if (isLoginRoute) return null;

  return <>{children}</>;
}


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
import { createAppQueryClient } from '@/lib/query/list-query-defaults';

export default function Providers({
  children,
  initialUser 
}: { 
  children: React.ReactNode;
  initialUser?: UserInfo | null;
}) {
  // 기본 설정(조회 중 이전 페이지 유지 — C1, 오류 승격 규칙 — C2)은 lib/query/list-query-defaults 가 소유한다.
  const [queryClient] = useState(createAppQueryClient);

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
            <UnsavedChangesProvider>
            <GlobalShortcutProvider>
              <AuthProvider initialUser={initialUser}>
                <LayoutProvider>
                  <WebSocketProvider>
                    <TooltipProvider delayDuration={0}>
                      <StandardErrorBoundary>
                        {children}
                      </StandardErrorBoundary>
                      <RouteScopedGlobalOverlays>
                        <GlobalCommandCenter />
                        <SessionExpiryWarning />
                        <SmartOnboardingHub />
                      </RouteScopedGlobalOverlays>
                    </TooltipProvider>
                  </WebSocketProvider>
                </LayoutProvider>
              </AuthProvider>
            </GlobalShortcutProvider>
            </UnsavedChangesProvider>
          </ConfirmProvider>
        </ToastProvider>
      </MotionConfig>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
