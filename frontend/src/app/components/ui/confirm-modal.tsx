'use client';

import React, { createContext, useContext, useState, useCallback, useEffect, useId, useRef } from 'react';
import { AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ConfirmOptions {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  variant?: 'default' | 'destructive';
}

interface ConfirmContextType {
  confirm: (options: ConfirmOptions) => Promise<boolean>;
}

const ConfirmContext = createContext<ConfirmContextType | undefined>(undefined);

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<ConfirmOptions | null>(null);
  const [resolver, setResolver] = useState<((value: boolean) => void) | null>(null);
  const titleId = useId();
  const descId = useId();
  const confirmButtonRef = useRef<HTMLButtonElement>(null);

  const confirm = useCallback((opts: ConfirmOptions) => {
    setOptions(opts);
    setIsOpen(true);
    return new Promise<boolean>((resolve) => {
      setResolver(() => resolve);
    });
  }, []);

  const handleConfirm = useCallback(() => {
    setIsOpen(false);
    resolver?.(true);
  }, [resolver]);

  const handleCancel = useCallback(() => {
    setIsOpen(false);
    resolver?.(false);
  }, [resolver]);

  useEffect(() => {
    if (isOpen) {
      // Focus the confirm button when opened
      setTimeout(() => {
        confirmButtonRef.current?.focus();
      }, 0);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape') {
          handleCancel();
        } else if (e.key === 'Enter') {
          // If focus is not on another button, default to confirm
          if (document.activeElement?.tagName !== 'BUTTON') {
            handleConfirm();
          }
        }
      };
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleCancel, handleConfirm]);

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {isOpen && options && (
        <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-[#020617]/90 animate-in fade-in duration-200">
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby={titleId}
            aria-describedby={descId}
            className="bg-card border rounded-xl shadow-2xl w-full max-w-md p-6 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-4">
              <div className={cn(
                "p-2 rounded-full",
                options.variant === 'destructive' ? "bg-red-100 text-red-600" : "bg-blue-100 text-blue-600"
              )}>
                <AlertCircle size={24} aria-hidden="true" />
              </div>
              <div className="flex-1">
                <h3 id={titleId} className="text-lg font-bold text-foreground">{options.title}</h3>
                <p id={descId} className="text-sm text-muted-foreground mt-2 leading-relaxed">{options.message}</p>
              </div>
            </div>

            <div className="mt-8 flex justify-end gap-3">
              <button
                onClick={handleCancel}
                className="px-4 py-2 text-sm font-semibold border rounded-md hover:bg-accent transition-colors focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none"
              >
                {options.cancelText || '취소'}
              </button>
              <button
                ref={confirmButtonRef}
                onClick={handleConfirm}
                className={cn(
                  "px-4 py-2 text-sm font-semibold text-white rounded-md shadow-sm transition-colors focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:outline-none",
                  options.variant === 'destructive'
                    ? "bg-red-600 hover:bg-red-700 focus-visible:ring-red-600"
                    : "bg-primary hover:bg-primary/90 focus-visible:ring-primary"
                )}
              >
                {options.confirmText || '확인'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
}

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error('useConfirm must be used within ConfirmProvider');
  return context.confirm;
};
