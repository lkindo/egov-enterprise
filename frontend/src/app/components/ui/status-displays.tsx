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
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={cn("flex flex-col items-center justify-center gap-6 py-12 text-center", className)}
    >
      <div className="w-20 h-20 bg-rose-50 dark:bg-rose-900/10 rounded-full flex items-center justify-center mb-2 relative border-4 border-rose-100 dark:border-rose-900/20 shadow-xl">
        <AlertCircle size={40} className="text-rose-500" />
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black text-rose-900 dark:text-rose-400 tracking-tighter uppercase whitespace-pre-line">?곗씠??濡쒕뱶 ?ㅽ뙣</p>
        <div className="p-4 bg-rose-50/50 dark:bg-rose-900/5 rounded-xl border border-rose-100 dark:border-rose-900/20 inline-block">
          <p className="text-[10px] font-black font-mono text-rose-800 dark:text-rose-300 tracking-tight opacity-70">
            ERROR_STREAM: {error?.response?.data?.message || error?.message || 'UNKNOWN_EXCEPTION'}
          </p>
        </div>
        <p className="text-xs text-slate-700 dark:text-slate-400 font-bold tracking-tight max-w-[360px] mx-auto leading-relaxed mt-4">
          ?곗씠?곕쿋?댁뒪 ?몄뀡?쇰줈遺??媛앹껜 ?뺣낫瑜??섏떊?섏? 紐삵뻽?듬땲?? <br />?ㅽ듃?뚰겕 ?곌껐 ?곹깭瑜??뺤씤?섍굅???꾨옒 踰꾪듉???듯빐 ?ㅼ떆 ?쒕룄?섏떗?쒖삤.
        </p>
      </div>
      <div className="flex gap-4 mt-6">
        <Button
          variant="outline"
          size="lg"
          className="rounded-xl font-black text-[10px] tracking-[0.2em] border-2 px-10 hover:bg-slate-900 hover:text-white dark:hover:bg-primary transition-all group shadow-lg"
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
  message = "?곗씠?곌? ?놁뒿?덈떎.",
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
      <div className="w-20 h-20 bg-muted/30 rounded-full flex items-center justify-center mb-2 relative">
        <Search size={40} className="text-muted-foreground/20" />
        <div className="absolute -right-1 -bottom-1 w-8 h-8 bg-background border-2 border-border rounded-full flex items-center justify-center">
          <List size={14} className="text-muted-foreground" />
        </div>
      </div>
      <div className="space-y-2">
        <p className="text-xl font-black text-foreground tracking-tighter uppercase">{message}</p>
        <p className="text-xs text-slate-700 dark:text-slate-400 font-bold tracking-tight max-w-[320px] mx-auto leading-relaxed">
          ?쒖뒪?쒖뿉???곗씠?곕? 議고쉶?섏? 紐삵뻽?듬땲?? <br />寃??議곌굔??議곗젙?섍굅???ㅼ떆 珥덇린?뷀빐 蹂댁떗?쒖삤.
        </p>
      </div>
      <Button
        variant="outline"
        size="lg"
        className="mt-6 rounded-xl font-black text-[10px] tracking-[0.2em] border-2 px-10 hover:bg-slate-900 hover:text-white dark:hover:bg-primary transition-all group"
        onClick={() => typeof window !== 'undefined' && window.location.reload()}
      >
        <RefreshCw size={14} className="mr-2 group-hover:rotate-180 transition-transform duration-700" />
        ?꾩껜 ?덈줈怨좎묠
      </Button>
    </motion.div>
  );
}
