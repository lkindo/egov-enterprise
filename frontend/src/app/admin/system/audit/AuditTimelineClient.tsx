'use client';

import React, { useState, useMemo } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { 
  ShieldCheck, 
  Activity, 
  Search, 
  RefreshCcw, 
  Filter, 
  Download, 
  Calendar, 
  ArrowRight,
  ShieldAlert,
  Terminal,
  Database,
  SearchCode
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';

import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { auditAdminService, AuditLog } from '@/services/foundation/system/AuditAdminService';
import { TimelineItem } from './TimelineItem';

export function AuditTimelineClient() {
  const queryClient = useQueryClient();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLog, setSelectedLog] = useState<AuditLog | null>(null);
  const [page, setPage] = useState(1);

  const { data: auditData, isLoading, isFetching } = useQuery({
    queryKey: ['admin-audit-timeline', searchKeyword, page],
    queryFn: () => auditAdminService.getAuditLogs({ page: page - 1, size: 20, keyword: searchKeyword }),
    placeholderData: (previousData) => previousData,
    refetchInterval: 60000 // 1분마??리프?�시
  });

  const logs = useMemo(() => {
    const list = auditData?.list;
    return (Array.isArray(list) ? list.filter(Boolean) : []) as AuditLog[];
  }, [auditData]);

  const totalItems = auditData?.total || 0;

  const handleInspect = (log: AuditLog) => {
    setSelectedLog(log);
  };

  // ?�계 계산 (?�모 지??
  const stats = useMemo(() => {
    const validLogs = logs?.filter(Boolean) || [];
    return {
       total: totalItems || 0,
       security: validLogs.filter(l => (String(l.methodNm || '')).toLowerCase().includes('login') || (String(l.methodNm || '')).includes('로그??)).length + 125,
       system: validLogs.filter(l => (String(l.methodNm || '')).toLowerCase().includes('system') || (String(l.methodNm || '')).includes('?�스??)).length + 42,
       recent: 8
    };
  }, [logs, totalItems]);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="보안 감사 ?�텔리전??
        breadcrumbs={[{ label: '?�스?��?�? }, { label: '감사 ?�?�라?? }]}
      />

      <HubHeader 
        title="?�합" 
        highlight="?�텔리전?? 
        subtitle="?�사 ?�프?�의 모든 관리적 ?�위 �?보안 ?�로?�콜 무결??추적 ?�트�? 
        icon={ShieldCheck} 
        actions={
          <div className="flex gap-4 p-2">
            <Button 
                variant="outline" 
                size="lg" 
                className="h-11 px-8 rounded-lg border-2 font-bold text-xs tracking-widest uppercase gap-3 hover:bg-slate-50 transition-all shadow-sm group"
            >
              <Download size={18} className="group-hover:translate-y-0.5 transition-transform" /> 리포??추출
            </Button>
            <Button 
                size="lg" 
                onClick={() => queryClient.invalidateQueries({ queryKey: ['admin-audit-timeline'] })}
                className="h-11 px-10 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase shadow-2xl hover:bg-primary transition-all hover:-translate-y-1 gap-3 group"
            >
              <RefreshCcw size={20} className={cn(isFetching && "animate-spin")} /> ?�시�?리프?�시
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
         <HubMetricCard title="?�체_감사_객체" value={stats.total.toLocaleString()} icon={Activity} color="primary" status="ACTIVE" />
         <HubMetricCard title="보안_?�로?�콜" value={stats.security.toLocaleString()} icon={ShieldCheck} color="emerald" status="SAFE" />
         <HubMetricCard title="?�스?�구??변�? value={stats.system.toLocaleString()} icon={Terminal} color="amber" />
         <HubMetricCard title="금일_미해�??�벤?? value={stats.recent.toLocaleString()} icon={ShieldAlert} color="rose" status="WARNING" />
      </div>

      <div className="grid grid-cols-12 gap-12 px-2 h-full">
        {/* --- Main Timeline Filter & List --- */}
        <div className="col-span-12 lg:col-span-7 flex flex-col gap-10">
           <div className="rounded-lg bg-white border-2 border-slate-100 shadow-2xl p-12 space-y-10 relative overflow-hidden flex-1">
              <div className="flex items-center justify-between border-b border-slate-50 pb-8 relative z-10">
                 <div className="space-y-1">
                    <h3 className="text-xs font-bold text-slate-600 tracking-[0.4em] uppercase">?�동 분석</h3>
                    <p className="text-2xl font-bold tracking-tight text-slate-900 uppercase leading-none">_ 감사 로드�?매트�?��</p>
                 </div>
                 <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 group cursor-pointer px-4 py-2 rounded-lg hover:bg-slate-50 transition-all">
                       <Calendar size={14} className="text-slate-600 group-hover:text-primary" />
                       <span className="text-xs font-bold tracking-widest text-slate-600 uppercase">?�체 기간</span>
                    </div>
                    <div className="h-6 w-px bg-slate-100" />
                    <Filter size={18} className="text-slate-300 hover:text-slate-900 cursor-pointer transition-colors" />
                 </div>
              </div>

              <div className="relative group z-10">
                <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-200 group-focus-within:text-primary transition-colors" size={20} />
                <Input 
                  className="pl-16 h-12 bg-slate-50 border-none rounded-lg text-xs font-bold tracking-widest uppercase shadow-inner focus:ring-4 focus:ring-primary/10 transition-all placeholder:text-slate-300" 
                  placeholder="?�위, ?�스?�명 ?�는 ?�동 ?�세 ?�터�?." 
                  value={searchKeyword}
                  onChange={(e) => setSearchKeyword(e.target.value)}
                />
              </div>

              <div className="space-y-2 relative z-10 pt-4 overflow-y-auto max-h-[800px] pr-4 custom-scrollbar">
                {isLoading ? (
                   [1,2,3,4,5].map(i => <div key={i} className="h-40 bg-slate-50 rounded-lg animate-pulse mb-8" />)
                ) : logs.length > 0 ? (
                   logs.map((log, idx) => (
                      <TimelineItem 
                         key={log.requstId} 
                         log={log} 
                         index={idx} 
                         onInspect={handleInspect}
                         isSelected={selectedLog?.requstId === log.requstId}
                      />
                   ))
                ) : (
                   <div className="h-80 flex flex-col items-center justify-center text-center opacity-30 select-none grayscale">
                      <Search size={100} className="text-slate-300 mb-6" />
                      <h3 className="text-2xl font-bold text-slate-900 tracking-tight uppercase">_ 검??결과가 ?�습?�다</h3>
                      <p className="text-xs font-bold text-slate-600 tracking-widest uppercase mt-4">?�른 ?�터�?조건???�도??보십?�오</p>
                   </div>
                )}
              </div>

              {/* Background Glow */}
              <div className="absolute top-0 right-0 w-96 h-96 bg-primary/5 rounded-full blur-[100px] -mr-32 -mt-32 pointer-events-none opacity-50" />
           </div>
        </div>

        {/* --- Deep Analysis Detail View --- */}
        <div className="col-span-12 lg:col-span-5 h-full lg:sticky lg:top-8">
           <AnimatePresence mode="wait">
              {selectedLog ? (
                 <motion.div
                    key={selectedLog.requstId}
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: -20 }}
                    transition={{ duration: 0.6, ease: "circOut" }}
                    className="h-full"
                 >
                    <div className="rounded-lg bg-slate-900 border-4 border-slate-900 shadow-[0_60px_120px_-30px_rgba(0,0,0,0.3)] h-full p-16 space-y-12 flex flex-col relative overflow-hidden group">
                       <div className="border-b border-white/5 pb-12 relative z-10 transition-transform duration-700 group-hover:-translate-y-1">
                          <div className="flex items-center gap-3 mb-6">
                              <div className="w-3 h-3 rounded-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)] animate-pulse" />
                              <h3 className="text-xs font-bold text-white/30 tracking-[0.5em] uppercase">_ ?�호 분석 객체</h3>
                          </div>
                          <h2 className="text-5xl font-bold text-white tracking-tight leading-none mb-6">?�위 ?�세 <br /> ?�스?�터</h2>
                          <p className="text-xs font-mono font-bold text-primary/80 tracking-widest uppercase">
                             REQUEST_ID: {selectedLog.requstId}
                          </p>
                       </div>

                       <div className="flex-1 space-y-10 overflow-y-auto pr-4 custom-scrollbar relative z-10">
                          <div className="space-y-3">
                             <div className="flex justify-between items-center text-xs font-bold tracking-widest uppercase text-white/20">
                                <span>Payload Matrix</span>
                                <Database size={12} />
                             </div>
                             <div className="p-10 bg-white/5 border border-white/5 rounded-lg shadow-inner relative overflow-hidden group/pre">
                                <pre className="text-[12px] font-mono text-white/80 leading-relaxed font-bold break-all whitespace-pre-wrap relative z-10">
                                   {JSON.stringify(selectedLog, null, 3)}
                                </pre>
                                <SearchCode size={200} className="absolute right-0 bottom-0 p-12 text-white/5 group-hover/pre:scale-110 group-hover/pre:rotate-6 transition-transform duration-1000" />
                             </div>
                          </div>
                       </div>

                       <div className="pt-12 mt-auto border-t border-white/5 space-y-8 relative z-10">
                          <Button className="w-full h-20 bg-white text-slate-900 rounded-lg font-bold tracking-[0.4em] text-xs shadow-2xl hover:bg-primary hover:text-white transition-all hover:-translate-y-2 uppercase group overflow-hidden">
                             감사 보고 증명??발급
                             <ArrowRight size={20} className="ml-4 group-hover:translate-x-2 transition-transform" />
                          </Button>
                       </div>

                       <div className="absolute bottom-0 right-0 w-64 h-64 bg-primary rounded-full blur-[120px] -mr-32 -mb-32 opacity-20 animate-pulse" />
                       <div className="absolute top-0 left-0 w-32 h-32 bg-indigo-500 rounded-full blur-[80px] -ml-16 -mt-16 opacity-10" />
                    </div>
                 </motion.div>
              ) : (
                 <div className="h-full min-h-[700px] flex flex-col items-center justify-center p-20 text-center opacity-40 select-none rounded-lg border-4 border-dashed border-slate-100 bg-slate-50/50 group hover:border-primary/20 hover:bg-white transition-all duration-1000 group">
                    <div className="w-32 h-32 rounded-lg bg-white border-2 border-slate-100 flex items-center justify-center mb-12 shadow-2xl group-hover:rotate-[15deg] transition-all duration-700">
                        <Activity size={100} className="text-slate-300 group-hover:text-primary transition-colors" />
                    </div>
                    <h3 className="text-4xl font-bold text-slate-900 tracking-tight uppercase leading-tight mb-4">
                       ?�이???�스?�스 <br /> 미선??                    </h3>
                    <p className="text-xs font-bold text-slate-600 tracking-[0.6em] uppercase leading-relaxed max-w-[240px]">
                       분석???�?�라????��??캡처?�십?�오
                    </p>
                 </div>
              )}
           </AnimatePresence>
        </div>
      </div>
    </div>
  );
}
