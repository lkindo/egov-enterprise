'use client';

import { QueryClient, QueryClientProvider, focusManager } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';
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

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * 에러 객체에서 HTTP 상태 코드를 추출한다.
 *
 * `lib/api/client.ts` 의 응답 인터셉터는 AxiosError 를 그대로 reject 하거나(=`error.response.status` 보유),
 * 비-Error 객체일 때 `new Error(...)` 로 승격한 뒤 `Object.assign` 으로 원본 필드(`response` 포함)를 복사한다.
 * 따라서 `response.status` 가 1차 소스이고, 서버 액션 등에서 평탄화된 `status`/`statusCode` 도 보조로 본다.
 * 상태를 알 수 없는 에러(네트워크 단절, success=false 논리 실패 등)는 0 을 반환해 승격 대상에서 제외한다.
 */
function getHttpStatus(error: unknown): number {
  if (!isRecord(error)) return 0;

  const response = error.response;
  if (isRecord(response) && typeof response.status === 'number') {
    return response.status;
  }
  if (typeof error.status === 'number') return error.status;
  if (typeof error.statusCode === 'number') return error.statusCode;

  return 0;
}

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
            /**
             * 서버 오류(5xx)만 error boundary(각 세그먼트의 `error.tsx`)로 승격한다. (감사 P1-1(3))
             * - 4xx 는 승격하지 않는다: 401(세션 만료)은 인터셉터가 재발급/로그인 리다이렉트로 처리하고,
             *   403(권한 없음)·404 는 해당 화면 안에서 안내해야 한다. 전체 화면 교체는 과잉 반응이다.
             * - 상태 코드를 알 수 없는 에러(네트워크 단절, `success:false` 논리 실패)도 승격하지 않고
             *   화면의 `error`/`onRetry`(ErrorStateDisplay) 경로로 노출한다.
             * - 이미 데이터가 그려진 뒤의 백그라운드 refetch 실패로 화면이 통째로 날아가지 않도록
             *   `query.state.data === undefined`(최초 로드 실패)일 때만 승격한다.
             */
            throwOnError: (error, query) =>
              query.state.data === undefined && getHttpStatus(error) >= 500,
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
          </ConfirmProvider>
        </ToastProvider>
      </MotionConfig>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
