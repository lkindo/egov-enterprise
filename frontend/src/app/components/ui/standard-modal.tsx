'use client';

import React from 'react';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface StandardModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl' | '4xl' | '5xl';
}

export function StandardModal({
  isOpen,
  onClose,
  title,
  children,
  footer,
  maxWidth = 'md'
}: StandardModalProps) {
  if (!isOpen) return null;

  const maxWidthClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    '2xl': 'max-w-2xl',
    '3xl': 'max-w-3xl',
    '4xl': 'max-w-4xl',
    '5xl': 'max-w-5xl',
  };

  return (
    <div className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-300">
      <div
        className={cn(
          "bg-white dark:bg-slate-950 border-2 border-slate-200 dark:border-slate-800 rounded-[2.5rem] shadow-[0_32px_64px_-16px_rgba(0,0,0,0.4)] w-full mx-4 flex flex-col max-h-[90vh] animate-in zoom-in-95 duration-300 overflow-hidden relative z-50",
          maxWidthClasses[maxWidth]
        )}
      >
        {/* Header */}
        <div className="flex h-16 items-center justify-between border-b px-6 shrink-0 bg-white dark:bg-slate-950">
          <h2 className="text-lg font-bold text-slate-900 dark:text-slate-100">{title}</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-accent rounded-full transition-colors text-muted-foreground hover:text-foreground"
          >
            <X size={20} />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {children}
        </div>

        {/* Footer */}
        {footer && (
          <div className="px-6 py-4 border-t bg-muted flex justify-end gap-3 shrink-0">
            {footer}
          </div>
        )}
      </div>
    </div >
  );
}
