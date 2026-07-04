import React from 'react';
import { AlertCircle, RefreshCw, Search, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

function ErrorStateDisplay({ 
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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center gap-6 py-12 text-center", className)}
    >
      <div className="w-20 h-11 bg-rose-50 dark:bg-rose-900/10 rounded-lg flex items-center justify-center mb-2 relative border-4 border-rose-100 dark:border-rose-900/20 shadow-xl">
        <AlertCircle size={40} className="text-rose-500" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-bold text-rose-900 dark:text-rose-400 tracking-tighter uppercase whitespace-pre-line">데이터 로드 실패</p>
        <div className="p-4 bg-rose-50/50 dark:bg-rose-900/5 rounded-lg border border-rose-100 dark:border-rose-900/20 inline-block">
          <p className="text-xs font-bold font-mono text-rose-800 dark:text-rose-300 tracking-tight opacity-70">
            ERROR_STREAM: {error?.response?.data?.message || error?.message || 'UNKNOWN_EXCEPTION'}
          </p>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-400 font-bold tracking-tight max-w-[360px] mx-auto leading-relaxed mt-4">
          데이터베이스 세션으로부터 객체 정보를 수신하지 못했습니다. <br />네트워크 연결 상태를 확인하거나 아래 버튼을 통해 다시 시도하십시오.
        </p>
      </div>
      <div className="flex gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-lg font-bold text-xs tracking-[0.2em] border-2 px-10 hover:bg-slate-900 hover:text-white dark:hover:bg-primary transition-all group shadow-lg"
          onClick={() => onRetry ? onRetry() : window.location.reload()}
        >
          <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
          RETRY_SYNC
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
        <p className="text-xs text-slate-700 dark:text-slate-400 font-bold tracking-tight max-w-[320px] mx-auto leading-relaxed">
          시스템에서 데이터를 조회하지 못했습니다. <br />검색 조건을 조정하거나 다시 초기화해 보십시오.
        </p>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="mt-6 rounded-lg font-bold text-xs tracking-[0.2em] border-2 px-10 hover:bg-slate-900 hover:text-white dark:hover:bg-primary transition-all group"
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
      >
        <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
        전체 새로고침
      </Button>
    </motion.div>
  );
}
