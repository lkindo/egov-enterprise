'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ReactQueryDevtools } from '@tanstack/react-query-devtools';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { ToastProvider } from '@/app/components/ui/toast';
import { GlobalShortcutProvider } from '@/app/components/ui/global-shortcut-provider';

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
        <GlobalShortcutProvider>
          <AuthProvider>
            <LayoutProvider>
              <WebSocketProvider>
                {children}
              </WebSocketProvider>
            </LayoutProvider>
          </AuthProvider>
        </GlobalShortcutProvider>
      </ToastProvider>
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
