'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldAlert, 
  LogIn, 
  UserRound, 
  Settings, 
  ArrowUpRight, 
  Clock, 
  Database,
  SearchCode,
  AlertCircle,
  ShieldCheck,
  CheckCircle2
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { AuditLog } from '@/services/foundation/system/AuditAdminService';

interface TimelineItemProps {
  log: AuditLog;
  index: number;
  onInspect: (log: AuditLog) => void;
  isSelected?: boolean;
}

export const TimelineItem: React.FC<TimelineItemProps> = ({ log, index, onInspect, isSelected }) => {
  const content = String(log.histCn || (log as any).methodNm || '');
  const isSecurity = content.includes('로그인') || content.includes('보안') || content.includes('login') || content.includes('security');
  const isSystem = content.includes('시스템') || content.includes('배포') || content.includes('system') || content.includes('deploy');
  const isError = content.includes('오류') || content.includes('실패') || content.includes('error') || content.includes('fail');
  
  const getIcon = () => {
    if (isError) return <AlertCircle size={20} />;
    if (isSecurity) return <ShieldCheck size={20} />;
    if (isSystem) return <Database size={20} />;
    return <Clock size={20} />;
  };

  const getColor = () => {
    if (isError) return "bg-rose-500 shadow-rose-200 text-white";
    if (isSecurity) return "bg-indigo-600 shadow-indigo-200 text-white";
    if (isSystem) return "bg-emerald-600 shadow-emerald-200 text-white";
    return "bg-slate-900 shadow-slate-200 text-white";
  };

  const getBorderColor = () => {
    if (isSelected) return "border-slate-900 ring-4 ring-slate-100";
    if (isError) return "border-rose-100 hover:border-rose-300";
    if (isSecurity) return "border-indigo-100 hover:border-indigo-300";
    return "border-slate-50 hover:border-slate-200";
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: index * 0.05, duration: 0.5 }}
      onClick={() => onInspect(log)}
      className={cn(
        "group relative flex gap-8 pb-10 cursor-pointer transition-all",
        isSelected ? "opacity-100" : "opacity-80 hover:opacity-100"
      )}
    >
      {/* Connector Line */}
      <div className="absolute left-[24px] top-12 bottom-0 w-0.5 bg-gradient-to-b from-slate-200 via-slate-100 to-transparent group-last:hidden" />

      {/* Time & Icon Capsule */}
      <div className="relative flex-shrink-0">
        <div className={cn(
          "w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-500 shadow-xl z-10 relative",
          getColor(),
          isSelected ? "scale-110 rotate-12" : "group-hover:rotate-6"
        )}>
          {getIcon()}
          {index === 0 && (
             <div className="absolute -top-1 -right-1 w-4 h-4 bg-emerald-400 rounded-full border-2 border-white animate-ping" />
          )}
        </div>
      </div>

      {/* Content Fabric */}
      <div className={cn(
        "flex-1 p-8 rounded-xl border-2 bg-white transition-all duration-500 shadow-sm overflow-hidden relative",
        getBorderColor(),
        isSelected ? "shadow-2xl translate-x-3 bg-slate-50/50" : "hover:shadow-lg"
      )}>
        {/* Background Hint */}
        {isSecurity && <ShieldAlert size={120} className="absolute -right-8 -bottom-8 text-indigo-50/30 rotate-12" />}
        {isError && <AlertCircle size={120} className="absolute -right-8 -bottom-8 text-rose-50/30 rotate-12" />}

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 mb-4 relative z-10 text-left">
          <div className="space-y-1 text-left">
             <span className="text-[10px] font-black tracking-[0.3em] text-slate-400 uppercase leading-none italic block text-left">
                {log.frstRegisterPnttm}
             </span>
             <h4 className="text-lg font-black tracking-tighter text-slate-800 uppercase italic text-left">
                {log.histCn || (log as any).methodNm || 'System Action'}
             </h4>
          </div>
          <div className="flex items-center gap-2">
             <div className="px-5 py-1.5 rounded-full bg-slate-900 text-white text-[9px] font-black tracking-widest uppercase">
                {log.frstRegisterId}
             </div>
             {isError && (
                <div className="px-5 py-1.5 rounded-full bg-rose-500 text-white text-[9px] font-black tracking-widest uppercase animate-pulse">
                   SYSTEM_FAIL
                </div>
             )}
          </div>
        </div>

        <div className="flex items-center justify-between text-[11px] font-bold text-slate-400 border-t border-slate-50 pt-4 relative z-10">
           <div className="flex items-center gap-3">
              <Database size={12} className="opacity-40" />
              <span className="tracking-widest uppercase opacity-60">SRV_INSTANCE: {log.sysNm}</span>
           </div>
           <div className="flex items-center gap-2 group-hover:text-primary transition-colors italic">
              INS_CODE: {log.histSeCode}
              <ArrowUpRight size={14} className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
           </div>
        </div>
      </div>
    </motion.div>
  );
};
