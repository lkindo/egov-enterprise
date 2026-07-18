import React from 'react';
import { AlertCircle, RefreshCw, Search, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

export function ErrorStateDisplay({ 
  error, 
  onRetry,
  className 
}: { 
  error: any; 
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <motion.div
      data-testid="error-state-display"
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center gap-6 py-12 text-center", className)}
    >
      <div className="w-16 h-16 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center mb-2 relative border-4 border-rose-100 dark:border-rose-900/20 shadow-xl">
        <AlertCircle size={36} className="text-rose-500" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold text-rose-900 dark:text-rose-400 tracking-tighter whitespace-pre-line">데이터를 불러오지 못했습니다</p>
        {(error?.response?.data?.message || error?.message) ? (
          <div className="p-4 bg-rose-50/50 dark:bg-rose-900/5 rounded-lg border border-rose-100 dark:border-rose-900/20 inline-block">
            <p className="text-xs font-medium text-rose-800 dark:text-rose-300 tracking-tight opacity-80">
              {error?.response?.data?.message || error?.message}
            </p>
          </div>
        ) : null}
        <p className="text-xs text-foreground dark:text-muted-foreground font-medium tracking-tight max-w-[360px] mx-auto leading-relaxed mt-4">
          일시적인 오류로 데이터를 불러오지 못했습니다. <br />네트워크 상태를 확인한 뒤 다시 시도해 주세요.
        </p>
      </div>
      <div className="flex gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-lg font-bold text-xs tracking-[0.1em] border-2 px-10 hover:bg-surface-inverse hover:text-white dark:hover:bg-primary transition-all group shadow-lg"
          onClick={() => onRetry ? onRetry() : window.location.reload()}
        >
          <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
          다시 시도
        </Button>
      </div>
    </motion.div>
  );
}

export function EmptyStateDisplay({ 
  message = "데이터가 없습니다.",
  className 
}: { 
  message?: string;
  className?: string;
}) {
  return (
    <motion.div 
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center gap-6 py-12 text-center", className)}
    >
      <div className="w-20 h-11 bg-muted/30 rounded-lg flex items-center justify-center mb-2 relative">
        <Search size={40} className="text-muted-foreground/20" />
        <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-background border-2 border-border rounded-lg flex items-center justify-center">
          <List size={14} className="text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold text-foreground tracking-tighter uppercase">{message}</p>
        <p className="text-xs text-foreground dark:text-muted-foreground font-bold tracking-tight max-w-[320px] mx-auto leading-relaxed">
          시스템에서 데이터를 조회하지 못했습니다. <br />검색 조건을 조정하거나 다시 초기화해 보십시오.
        </p>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="mt-6 rounded-lg font-bold text-xs tracking-[0.2em] border-2 px-10 hover:bg-surface-inverse hover:text-white dark:hover:bg-primary transition-all group"
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
      >
        <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
        전체 새로고침
      </Button>
    </motion.div>
  );
}
