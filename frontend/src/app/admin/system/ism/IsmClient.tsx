'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { ismService, InfrmlSanctn } from '@/services/ismService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { 
  ShieldCheck, 
  FileText, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  Trash2, 
  Activity, 
  Sparkles, 
  Info, 
  ArrowRightCircle, 
  ShieldAlert, 
  Terminal,
  Cpu,
  Fingerprint,
  User
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useRouter } from 'next/navigation';

export default function IsmClient({ initialData }: { initialData: { content: InfrmlSanctn[] } }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  
  const [isModalOpen, setIsOpen] = useState(false);
  const [selectedSanctn, setSelectedSanctn] = useState<InfrmlSanctn | null>(null);
  const [returnResn, setReturnResn] = useState('');

  const ismList = initialData.content || [];

  const handleOpenConfirm = (sanctn: InfrmlSanctn) => {
    setSelectedSanctn(sanctn);
    setReturnResn('');
    setIsOpen(true);
  };

  const handleProcess = async (status: 'C' | 'R') => {
    if (!selectedSanctn) return;
    try {
      await ismService.confirmInfrmlSanctn(selectedSanctn.infrmlSanctnId, status, returnResn);
      toast(`결재 시퀀스가 ${status === 'C' ? '성공적으로 승인' : '반려'} 처리되었습니다.`, 'success');
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast('프로세스 처리 중 오류가 발생했습니다.', 'error');
    }
  };

  const columns: ColumnDef<InfrmlSanctn>[] = [
    {
      id: 'jobSe',
      header: 'Domain Vector',
      width: 140,
      accessor: (item: InfrmlSanctn) => (
        <span className="px-3 py-1.5 bg-slate-100 text-slate-900 rounded-xl text-[10px] font-black uppercase italic tracking-widest border border-slate-200 shadow-inner">
          {item.jobSe || item.jobSeCode || 'STATIC_NODE'}
        </span>
      )
    },
    { 
      id: 'sancltNm',
      header: 'Authorization Object', 
      width: 300,
      accessor: (item: InfrmlSanctn) => (
        <div className="flex flex-col gap-1 py-1 group/item">
            <span className="font-black italic uppercase tracking-tighter text-slate-900 text-lg leading-tight group-hover/item:text-primary transition-colors">{item.sancltNm}</span>
            <div className="flex items-center gap-2">
                <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest opacity-60 italic">Blueprint ID: {item.infrmlSanctnId}</span>
            </div>
        </div>
      )
    },
    { 
      id: 'applcntId',
      header: 'Subject Identity', 
      width: 180,
      accessor: (item: InfrmlSanctn) => (
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-white flex items-center justify-center shadow-lg group-hover:rotate-3 transition-transform">
            <Fingerprint size={16} />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black text-slate-700 italic uppercase tabular-nums">{item.applcntId}</span>
            <span className="text-[9px] font-bold text-slate-300 tracking-widest uppercase italic opacity-60">Verified Origin</span>
          </div>
        </div>
      )
    },
    { 
      id: 'confmAt',
      header: 'Integrity Stance', 
      width: 180,
      accessor: (item: InfrmlSanctn) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            item.confmAt === 'Y' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" : 
            item.confmAt === 'R' ? "bg-rose-500" : "bg-slate-300"
          )} />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] italic font-mono",
            item.confmAt === 'Y' ? "text-emerald-600" : 
            item.confmAt === 'R' ? "text-rose-600" : "text-slate-400 opacity-60"
          )}>
            {item.confmAt === 'Y' ? 'VERIFIED_CHAIN' : 
             item.confmAt === 'R' ? 'PROTOCOL_REJECTED' : 'AWAITING_AUDIT'}
          </span>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'OVERRIDE CONTROL',
      className: 'text-right',
      accessor: (item: InfrmlSanctn) => (
        <div className="flex justify-end gap-2 pr-4">
          {(item.confmAt === 'N' || item.confmAt === 'A') && (
              <button 
                onClick={() => handleOpenConfirm(item)}
                className="h-11 px-8 bg-slate-900 text-white rounded-[1.25rem] text-[10px] font-black uppercase italic tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl shadow-slate-900/10 flex items-center gap-3 group"
              >
                <ShieldCheck size={16} strokeWidth={3} className="group-hover:rotate-12 transition-transform" /> Authorize Execution
              </button>
          )}
          <button 
            onClick={() => toast('이 작업은 현재 아카이브 모드에서만 가능합니다.', 'info')} 
            className="h-11 w-11 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-white hover:border-rose-100 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95 opacity-40"
          >
            <Trash2 size={18} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader 
        title="인포멀 생션 아키텍처" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '약식결재' }]}
        actions={
            <div className="flex items-center gap-6">
                <div className="px-6 py-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex items-center gap-3">
                    <Activity size={16} className="text-emerald-500 animate-pulse" />
                    <span className="text-[10px] font-black text-emerald-700 uppercase italic tracking-widest">Logic Hub: Online</span>
                </div>
            </div>
        }
      />

      {/* Luxury Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-10">
        <StatusCard 
            title="AWAITING AUDIT" 
            count={ismList.filter(i => i.confmAt === 'N' || i.confmAt === 'A').length} 
            icon={<Clock size={28} />} 
            color="orange" 
        />
        <StatusCard 
            title="VERIFIED NODES" 
            count={ismList.filter(i => i.confmAt === 'Y').length} 
            icon={<CheckCircle2 size={28} />} 
            color="emerald" 
        />
        <StatusCard 
            title="TOTAL BLUEPRINTS" 
            count={ismList.length} 
            icon={<FileText size={28} />} 
            color="slate" 
        />
      </div>

      {/* Informal Sanction Intelligence Shield */}
      <div className="p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group">
        <div className="w-28 h-28 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Terminal size={48} className="text-primary group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
          <h4 className="text-4xl font-black italic tracking-tighter uppercase tabular-nums">Structural Approval Safeguard</h4>
          <p className="text-base text-slate-400 font-bold leading-relaxed max-w-3xl italic">
            규격화되지 않은 약식 결재 요청을 유연하고 신속하게 검증하십시오. 모든 결정 프로세스는 <span className="text-primary font-black italic">Immutable Decision Ledger</span>에 기록되며, 결정 근거는 데이터 무결성 보장을 위해 영구히 보관됩니다.
          </p>
        </div>
        <Cpu size={260} className="absolute right-[-80px] top-[-80px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000 pointer-events-none" />
      </div>

      {/* Main Container Hub */}
      <div className="bg-white rounded-[5rem] p-6 shadow-[0_60px_100px_rgba(0,0,0,0.08)] border border-slate-100 relative group/matrix ring-1 ring-slate-200/50">
        <UltimateDataGrid 
          title="INFORMAL APPROVAL SEQUENCE REPOSITORY" 
          columns={columns} 
          data={ismList} 
          emptyMessage="관측된 약식 결재 매개변수가 존재하지 않습니다."
          className="bg-slate-50/50 p-10 rounded-[4rem] border border-dashed border-slate-200"
          keyField="infrmlSanctnId"
        />
        <div className="flex justify-center items-center gap-12 mt-12 text-[10px] font-black italic text-slate-300 tracking-[0.4em] uppercase opacity-40">
            <div className="flex items-center gap-3">
                <ShieldAlert size={12} className="text-primary" />
                AUDIT PERSISTENCE ACTIVE
            </div>
            <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
            <div className="flex items-center gap-3">
                <ShieldCheck size={12} />
                SECURITY ENFORCER: ARMED
            </div>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title="Execute Approval Sequence Override"
        maxWidth="md"
      >
        <div className="p-8 space-y-10">
          <div className="p-8 bg-slate-900 border border-white/10 rounded-[2.5rem] shadow-2xl relative overflow-hidden group/target">
            <div className="relative z-10">
                <div className="text-[10px] text-primary/60 uppercase font-black tracking-[0.4em] italic mb-3">Target Sequence</div>
                <h4 className="text-2xl font-black text-white italic uppercase tracking-tighter">{selectedSanctn?.sancltNm}</h4>
                <div className="mt-4 flex items-center gap-4">
                    <div className="h-6 px-3 bg-white/10 rounded-full flex items-center gap-2">
                        <User size={10} className="text-primary" />
                        <span className="text-[9px] font-black text-white italic">{selectedSanctn?.applcntId}</span>
                    </div>
                </div>
            </div>
            <Activity size={140} className="absolute right-[-30px] bottom-[-30px] opacity-[0.05] -rotate-12 group-hover/target:rotate-0 transition-transform duration-1000" />
          </div>

          <div className="space-y-4">
            <label className="text-[10px] font-black uppercase tracking-[0.4em] italic text-slate-400 px-2 flex items-center gap-2">
              <Activity size={12} /> Diagnostic Conclusion & Logic <span className="text-rose-500 font-black">*</span>
            </label>
            <textarea 
              value={returnResn}
              onChange={(e) => setReturnResn(e.target.value)}
              placeholder="Enter the technical rationale for this decision..."
              className="w-full min-h-[140px] p-8 rounded-[2rem] border-2 bg-slate-50 font-bold text-lg outline-none focus:bg-white focus:ring-8 focus:ring-primary/5 focus:border-primary/20 transition-all shadow-inner leading-relaxed resize-none"
            />
          </div>

          <div className="flex gap-4 pt-4">
            <button onClick={() => setIsOpen(false)} className="flex-1 h-16 border-2 border-slate-100 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-slate-50 transition-all opacity-40 hover:opacity-100">Abort Protocol</button>
            <button 
                onClick={() => handleProcess('R')}
                className="flex-1 h-16 bg-rose-50 text-rose-500 rounded-2xl font-black uppercase text-[10px] tracking-[0.3em] hover:bg-rose-100 transition-all active:scale-95 border-2 border-rose-100/50 flex items-center justify-center gap-3"
            >
                <XCircle size={18} strokeWidth={3} /> Protocol Reject
            </button>
            <button 
                onClick={() => handleProcess('C')}
                className="flex-[2] h-16 bg-slate-900 text-white rounded-2xl font-black italic uppercase text-[10px] tracking-[0.3em] shadow-2xl shadow-slate-900/40 flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 border border-white/10 group"
            >
                <CheckCircle2 size={18} strokeWidth={3} className="text-primary group-hover:rotate-12 transition-transform" /> Commit Authorization
            </button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}

function StatusCard({ title, count, icon, color }: any) {
    const colorStyles: any = {
        orange: "bg-white border-orange-100 text-orange-600 shadow-xl",
        emerald: "bg-white border-emerald-100 text-emerald-600 shadow-xl",
        slate: "bg-slate-900 border-slate-800 text-white shadow-2xl"
    };
    
    const iconStyles: any = {
        orange: "bg-orange-50 group-hover:bg-orange-600 group-hover:text-white",
        emerald: "bg-emerald-50 group-hover:bg-emerald-600 group-hover:text-white",
        slate: "bg-white/10 text-primary transition-transform group-hover:rotate-12"
    };

    return (
        <div className={cn(
            "p-10 rounded-[3.5rem] border-2 transition-all group relative overflow-hidden",
            colorStyles[color]
        )}>
            <div className="relative z-10">
                <div className={cn("w-16 h-16 rounded-[1.75rem] flex items-center justify-center mb-8 shadow-inner transition-all duration-700", iconStyles[color])}>
                    {icon}
                </div>
                <p className="text-[10px] font-black uppercase tracking-[0.4em] opacity-40 mb-2 italic font-mono">{title}</p>
                <h4 className="text-5xl font-black tracking-tighter tabular-nums italic leading-none">{count} Units</h4>
            </div>
            <div className="absolute right-[-20%] bottom-[-20%] opacity-[0.03] group-hover:rotate-12 transition-all duration-1000 pointer-events-none">
                {React.cloneElement(icon, { size: 180 })}
            </div>
        </div>
    );
}
