'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface StatusDotProps {
  status?: 'success' | 'warning' | 'error' | 'info' | 'muted';
  pulse?: boolean;
  className?: string;
}

export function StatusDot({ status = 'info', pulse = false, className }: StatusDotProps) {
  const bgClasses = {
    success: 'bg-emerald-500',
    warning: 'bg-amber-500',
    error: 'bg-rose-500',
    info: 'bg-primary',
    muted: 'bg-slate-400',
  };

  return (
    <div className="relative flex h-2 w-2 shrink-0">
      {pulse && (
        <span 
          className={cn(
            "animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", 
            bgClasses[status]
          )} 
        />
      )}
      <span 
        className={cn(
          "relative inline-flex rounded-full h-2 w-2", 
          bgClasses[status], 
          className
        )} 
      />
    </div>
  );
}
