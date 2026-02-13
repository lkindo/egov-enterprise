'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';

import { AuthProvider } from '@/contexts/AuthContext';
import { WebSocketProvider } from '@/contexts/websocket-context';
import { ToastProvider } from './components/ui/toast';
import { ConfirmProvider } from './components/ui/confirm-modal';
import { ApiStateProvider } from './components/ui/api-state-provider';
import { StandardErrorBoundary } from './components/ui/standard-error-boundary';
import { GlobalShortcutProvider } from './components/ui/global-shortcut-provider';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <StandardErrorBoundary>
            <QueryClientProvider client={queryClient}>
                <ToastProvider>
                    <ConfirmProvider>
                        <ApiStateProvider>
                            <GlobalShortcutProvider>
                                <AuthProvider>
                                    <WebSocketProvider>
                                        {children}
                                    </WebSocketProvider>
                                </AuthProvider>
                            </GlobalShortcutProvider>
                        </ApiStateProvider>
                    </ConfirmProvider>
                </ToastProvider>
            </QueryClientProvider>
        </StandardErrorBoundary>
    );
}
