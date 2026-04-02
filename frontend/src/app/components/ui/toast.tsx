'use client';

import React, { createContext, useContext, useState, useCallback } from 'react';
import { X, CheckCircle, AlertCircle, Info, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

type ToastType = 'success' | 'error' | 'info' | 'loading';

interface Toast {
  id: string;
  message: string;
  type: ToastType;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType) => void;
  success: (message: string) => void;
  error: (message: string) => void;
  removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: unknown, type: ToastType = 'info') => {
    // Failsafe: format message as string to prevent [object Event] rendering errors
    const displayMessage = typeof message === 'string'
      ? message
      : ((message as { message?: string })?.message || JSON.stringify(message) || '님님占쎈뒗 占쎈쪟媛 諛쒖깮占쎌뒿占쎈떎.');

    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, message: displayMessage, type }]);

    if (type !== 'loading') {
      setTimeout(() => removeToast(id), 4000);
    }
  }, [removeToast]);

  const success = useCallback((message: string) => toast(message, 'success'), [toast]);
  const error = useCallback((message: string) => toast(message, 'error'), [toast]);

  // API 占쎌뿭 占쎈윭 由ъ뒪님  React.useEffect(() => {
    const handleApiError = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      if (!detail) return;
      const { message, status } = detail;
      // 401占님占쏀겙 占쎈컻占濡쒖쭅님泥섎━占쏙옙占님占쎌슜占쎌뿉寃뚮뒗 占쎈━吏 占쎌쓬
      if (status !== 401) {
        error(message);
      }
    };

    window.addEventListener('api-error', handleApiError);
    return () => window.removeEventListener('api-error', handleApiError);
  }, [error]);

  return (
    <ToastContext.Provider value={{ toast, success, error, removeToast }}>
      {children}
      <div className="fixed bottom-4 right-4 z-[9999] flex flex-col gap-2 w-full max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "flex items-center justify-between p-4 rounded-lg shadow-lg border animate-in slide-in-from-right-full",
              t.type === 'success' && "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/30 dark:border-green-800 dark:text-green-400",
              t.type === 'error' && "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/30 dark:border-red-800 dark:text-red-400",
              t.type === 'info' && "bg-blue-50 border-blue-200 text-blue-800 dark:bg-blue-900/30 dark:border-blue-800 dark:text-blue-400",
              t.type === 'loading' && "bg-white border-border text-foreground dark:bg-zinc-900"
            )}
          >
            <div className="flex items-center gap-3">
              {t.type === 'success' ? <CheckCircle size={18} /> : null}
              {t.type === 'error' ? <AlertCircle size={18} /> : null}
              {t.type === 'info' ? <Info size={18} /> : null}
              {t.type === 'loading' ? <Loader2 size={18} className="animate-spin" /> : null}
              <span className="text-sm font-medium">{t.message}</span>
            </div>
            <button onClick={() => removeToast(t.id)} className="opacity-50 hover:opacity-100">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error('useToast must be used within ToastProvider');
  return context;
};
 
