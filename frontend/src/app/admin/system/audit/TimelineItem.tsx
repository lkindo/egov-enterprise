'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ShieldAlert,
  Clock,
  Database,
  AlertCircle,
  ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuditLog } from '@/services/foundation/system/AuditAdminService';

interface TimelineItemProps {
  log: AuditLog;
  index: number;
  onInspect: (log: AuditLog) => void;
  isSelected?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ log, index, onInspect, isSelected }) => {
  const content = String(log.methodNm || log.srvcNm || '');
  const isSecurity = content.includes('로그인') || content.includes('보안') || content.includes('login') || content.includes('security') || log.prcsSeCd === 'AUTH';
  const isSystem = content.includes('시스템') || content.includes('배포') || content.includes('system') || content.includes('deploy') || log.prcsSeCd === 'SYS';
  const isError = content.includes('오류') || content.includes('실패') || content.includes('error') || content.includes('fail');

  const label = log.methodNm || log.srvcNm || '시스템 행위';

  const getIcon = () => {
    if (isError) return <AlertCircle size={20} aria-hidden="true" />;
    if (isSecurity) return <ShieldCheck size={20} aria-hidden="true" />;
    if (isSystem) return <Database size={20} aria-hidden="true" />;
    return <Clock size={20} aria-hidden="true" />;
  };

  const getColor = () => {
    if (isError) return "bg-rose-500 shadow-rose-500/30 text-white";
    if (isSecurity) return "bg-hub-indigo shadow-hub-indigo/30 text-white";
    if (isSystem) return "bg-emerald-600 shadow-emerald-500/30 text-white";
    return "bg-surface-inverse text-surface-inverse-foreground";
  };

  const getBorderColor = () => {
    if (isSelected) return "border-primary ring-4 ring-primary/20";
    if (isError) return "border-rose-500/20 hover:border-rose-500/40";
    if (isSecurity) return "border-hub-indigo/20 hover:border-hub-indigo/40";
    return "border-border hover:border-border";
  };

  return (
    /*
      기존에는 onClick 만 있는 비인터랙티브 div 라 키보드 사용자가 항목을 열 수 없었다.
      button 으로 교체하고 aria-pressed 로 선택 상태를 노출한다.
    */
    <motion.button
      type="button"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      onClick={() => onInspect(log)}
      aria-pressed={!!isSelected}
      aria-label={`${label} 상세 보기`}
      className={cn(
        "group relative flex w-full gap-8 pb-10 text-left transition-all rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
        isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
      )}
    >
      {/* Connector Line */}
      <div className="absolute left-[24px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-border via-border/50 to-transparent group-last:hidden" aria-hidden="true" />

      {/* Time & Icon Capsule */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-12 h-12 rounded-lg flex items-center justify-center transition-all duration-500 shadow-xl z-10 relative",
          getColor(),
          isSelected ? "scale-110 rotate-12" : "group-hover:rotate-6"
        )}>
          {getIcon()}
        </div>
      </div>

      {/* Content Fabric */}
      <div className={cn(
        "flex-1 p-8 rounded-lg border-2 bg-card transition-all duration-500 shadow-sm overflow-hidden relative",
        getBorderColor(),
        isSelected ? "shadow-2xl translate-x-3 bg-muted/50" : "hover:shadow-lg"
      )}>
        {/* Background Hint */}
        {isSecurity && <ShieldAlert size={120} className="absolute -right-8 -bottom-8 text-hub-indigo/5 rotate-12" aria-hidden="true" />}
        {isError && <AlertCircle size={120} className="absolute -right-8 -bottom-8 text-rose-500/5 rotate-12" aria-hidden="true" />}

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 relative z-10 text-left">
          <div className="space-y-1 text-left">
             <span className="text-xs font-bold tracking-[0.3em] text-muted-foreground leading-none block text-left">
                발생일자 {log.ocrnYmd?.replace(/(\d{4})(\d{2})(\d{2})/, '$1-$2-$3') || '-'}
             </span>
             <h4 className="text-lg font-bold tracking-tighter text-foreground text-left">
                {label}
             </h4>
          </div>
          <div className="flex items-center gap-2">
             <div className="px-5 py-1.5 rounded-lg bg-surface-inverse text-surface-inverse-foreground text-xs font-bold tracking-widest">
                {log.dmndUserId || '-'}
             </div>
             {isError && (
                <div className="px-5 py-1.5 rounded-lg bg-rose-500 text-white text-xs font-bold tracking-widest">
                   오류
                </div>
             )}
          </div>
        </div>

        <div className="flex items-center justify-between text-xs font-bold text-muted-foreground border-t border-border pt-4 relative z-10">
           <div className="flex items-center gap-3">
              <Database size={12} className="opacity-40" aria-hidden="true" />
              <span className="tracking-widest opacity-60">서비스: {log.srvcNm || '-'}</span>
           </div>
           <div className="flex items-center gap-2 group-hover:text-primary transition-colors">
              처리구분: {log.prcsSeCd || '-'}
           </div>
        </div>
      </div>
    </motion.button>
  );
};
