'use client';

import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { AuthProvider } from '@/contexts/AuthContext';
import { LayoutProvider } from '@/contexts/LayoutContext';
import { ToastProvider } from './components/ui/toast';
import { GlobalShortcutProvider } from './components/ui/global-shortcut-provider';
import { ConfirmProvider } from './components/ui/confirm-modal';

export default function Providers({ children }: { children: React.ReactNode }) {
    const [queryClient] = useState(() => new QueryClient());

    return (
        <QueryClientProvider client={queryClient}>
            <ToastProvider>
                <ConfirmProvider>
                    <GlobalShortcutProvider>
                        <AuthProvider>
                            <LayoutProvider>
                                {children}
                            </LayoutProvider>
                        </AuthProvider>
                    </GlobalShortcutProvider>
                </ConfirmProvider>
            </ToastProvider>
        </QueryClientProvider>
    );
}
