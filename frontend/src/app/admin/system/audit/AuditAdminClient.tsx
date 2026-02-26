'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { VirtualScrollList } from '@/app/components/ui/virtual-scroll-list';
import { AuditLog } from '@/services/auditService';
import { 
  ShieldCheck, 
  History, 
  User, 
  Clock, 
  Search, 
  ExternalLink,
  Terminal,
  Database,
  Fingerprint,
  RefreshCcw,
  Activity,
  ArrowUpRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';

export default function AuditAdminClient({ initialLogs }: { initialLogs: AuditLog[] }) {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [logs, setLogs] = useState(initialLogs);

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => {
        setLoading(false);
        toast('감사 데이터가 동기화되었습니다.', 'success');
    }, 800);
  };

  const handleSearch = (values: Record<string, string>) => {
    const keyword = (values.keyword || '').toLowerCase();
    if (!keyword) {
      setLogs(initialLogs);
      return;
    }
    const filtered = initialLogs.filter(log => 
      log.sysNm.toLowerCase().includes(keyword) || 
      log.histCn.toLowerCase().includes(keyword) || 
      log.frstRegisterId.toLowerCase().includes(keyword)
    );
    setLogs(filtered);
  };

  const renderLogItem = (log: AuditLog, index: number) => (
    <div className="group relative flex items-center gap-6 px-10 py-6 hover:bg-slate-50 transition-all duration-300 border-none rounded-[2rem] mb-4">
      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-900 shadow-lg group-hover:bg-slate-900 group-hover:text-white transition-all transform group-hover:rotate-6">
        <Fingerprint size={20} />
      </div>
      
      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center gap-3">
          <span className="text-[10px] font-black text-primary px-3 py-1.5 bg-primary/5 rounded-full border border-primary/10 uppercase tracking-widest italic tabular-nums">
            {log.sysNm}
          </span>
          <h4 className="text-base font-black text-slate-900 truncate group-hover:text-primary transition-colors tracking-tight">
            {log.histCn}
          </h4>
        </div>
        
        <div className="flex items-center gap-6 text-[10px] font-black uppercase tracking-widest text-slate-400">
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
             <User size={12} className="text-slate-300" /> 
             <span className="text-slate-600">{log.frstRegisterId}</span>
           </div>
           <div className="flex items-center gap-2">
             <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
             <Clock size={12} className="text-slate-300" /> 
             <span className="text-slate-400 italic tabular-nums">{log.frstRegisterPnttm}</span>
           </div>
        </div>
      </div>
      
      <div className="flex items-center gap-4 opacity-0 group-hover:opacity-100 transition-all transform translate-x-4 group-hover:translate-x-0">
         <div className="flex flex-col items-end gap-1">
             <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Protocol ID</span>
             <span className="text-[9px] font-mono text-slate-400 font-bold opacity-60">#{log.histId?.substring(0, 8)}</span>
         </div>
         <button className="h-10 w-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-xl hover:bg-primary transition-all active:scale-95">
            <ArrowUpRight size={16} />
         </button>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000 h-[calc(100vh-120px)] flex flex-col">
      <PageHeader 
        title="시스템 감사 및 보안 인텔리전스" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '감사 로그 컨셉' }]}
        actions={
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-3 px-6 py-3 bg-white border-2 border-slate-100 rounded-2xl shadow-xl">
                <Activity size={16} className="text-emerald-500" />
                <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic">
                    Detected Streams: <span className="text-slate-900 tabular-nums">{initialLogs.length.toLocaleString()}</span>
                </span>
            </div>
            <Button 
                onClick={handleRefresh}
                className="h-14 w-14 rounded-2xl bg-slate-900 text-white hover:bg-primary transition-all shadow-2xl active:scale-95 flex items-center justify-center"
            >
                <RefreshCcw size={20} className={cn(loading && "animate-spin")} />
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 shrink-0">
          <div className="p-10 bg-slate-900 text-white rounded-[3.5rem] shadow-2xl flex items-center gap-8 relative overflow-hidden group">
              <div className="w-16 h-16 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-2xl border border-white/20 shadow-2xl transform group-hover:scale-110 transition-transform duration-700">
                  <Database size={28} className="text-primary-foreground" />
              </div>
              <div className="space-y-1 relative z-10">
                  <h4 className="text-xl font-black italic tracking-tighter uppercase tabular-nums">History Persistence Center</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em] leading-relaxed">
                    시스템 모든 변경 사항을 추적하는 불변의 감사 로그 저장소입니다.
                  </p>
              </div>
              <Terminal size={140} className="absolute right-[-20px] bottom-[-20px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000" />
          </div>
          
          <div className="p-10 bg-white border-2 border-slate-100 rounded-[3.5rem] shadow-xl flex items-center gap-8 relative overflow-hidden group">
              <div className="w-16 h-16 bg-primary/5 text-primary rounded-2xl flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                  <Search size={28} />
              </div>
              <div className="flex-1">
                  <StandardSearchFilter 
                    fields={[
                      { name: 'keyword', label: '로그 검색', type: 'text', placeholder: 'SYSTEM, ACTION, USER...' }
                    ]}
                    onSearch={handleSearch}
                    className="mb-0 border-none bg-transparent p-0 shadow-none ring-0 w-full"
                  />
              </div>
          </div>
      </div>

      <div className="flex-1 min-h-0 bg-white rounded-[4rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative flex flex-col">
        <div className="p-10 space-y-8 flex-1 flex flex-col min-h-0 max-h-full">
            <div className="flex items-center justify-between px-4 shrink-0">
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-xl flex items-center justify-center text-slate-400">
                        <History size={18} />
                    </div>
                    <div>
                        <h3 className="text-xl font-black text-slate-900 uppercase tracking-tight italic">Audit Stream Inventory</h3>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-[0.4em]">High-concurrency event log</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 px-4 py-2 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-widest italic shadow-xl">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_10px_rgba(52,211,153,0.8)]" /> Active Monitoring
                </div>
            </div>

            <div className="flex-1 min-h-0 relative px-2 overflow-hidden">
                {logs.length === 0 ? (
                  <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-6">
                    <div className="w-24 h-24 bg-slate-50 rounded-[2.5rem] flex items-center justify-center animate-in zoom-in duration-700">
                        <ShieldCheck size={48} className="opacity-20 translate-y-2" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="text-xl font-black uppercase tracking-widest text-slate-400 italic">No Protocol Found</p>
                        <p className="text-[10px] font-bold uppercase tracking-widest opacity-60">Try adjusting your interaction search</p>
                    </div>
                  </div>
                ) : (
                  <VirtualScrollList 
                    items={logs} 
                    itemHeight={112} 
                    containerHeight={2000}
                    renderItem={renderLogItem}
                    className="border-none rounded-none w-full !h-full"
                  />
                )}
            </div>
        </div>
      </div>
    </div>
  );
}
