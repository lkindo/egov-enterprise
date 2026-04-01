'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { ToastProvider } from '@/app/components/ui/toast';
import { ConfirmProvider } from '@/app/components/ui/confirm-modal';
import { GlobalShortcutProvider } from '@/app/components/ui/global-shortcut-provider';
import dynamic from 'next/dynamic';
import { ApiErrorNotifier } from './components/ui/api-error-notifier';
import { StandardErrorBoundary } from './components/ui/standard-error-boundary';

const GlobalCommandCenter = dynamic(() => import('./components/ui/global-command-center').then(mod => mod.GlobalCommandCenter), { ssr: false });
const SmartOnboardingHub = dynamic(() => import('./components/ui/smart-onboarding-hub').then(mod => mod.SmartOnboardingHub), { ssr: false });


export default function Providers({ children }: { children: React.ReactNode }) {
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

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <GlobalShortcutProvider>
            <AuthProvider>
              <LayoutProvider>
                <WebSocketProvider>
                  <StandardErrorBoundary>
                    <ApiErrorNotifier />
                    {children}
                  </StandardErrorBoundary>
                  <GlobalCommandCenter />
                  <SmartOnboardingHub />
                </WebSocketProvider>
              </LayoutProvider>
            </AuthProvider>
          </GlobalShortcutProvider>
        </ConfirmProvider>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
