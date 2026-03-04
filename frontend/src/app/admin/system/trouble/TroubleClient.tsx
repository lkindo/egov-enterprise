'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Trouble, troubleAdminService } from '@/services/admin/system/TroubleAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import {
  AlertCircle,
  CheckCircle2,
  Clock,
  Plus,
  Settings,
  Trash2,
  Activity,
  Terminal,
  ShieldCheck,
  Search,
  Zap,
  Cpu,
  RefreshCcw,
  Info
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { StandardForm, FormField } from '@/app/components/ui/standard-form';
import { useRouter } from 'next/navigation';

export default function TroubleClient({ initialData }: { initialData: { content: Trouble[] } }) {
  const router = useRouter();
  const { toast } = useToast();
  const confirm = useConfirm();
  const [isModalOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [formData, setFormData] = useState<Partial<Trouble>>({
    troblNm: '',
    troblKnd: '1',
    processSttus: 'R',
    troblDc: ''
  });

  const troubles = initialData.content || [];

  const handleOpenCreate = () => {
    setMode('create');
    setFormData({ troblNm: '', troblKnd: '1', processSttus: 'R', troblDc: '' });
    setIsOpen(true);
  };

  const handleOpenEdit = (trouble: Trouble) => {
    setMode('edit');
    setFormData(trouble);
    setIsOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      if (mode === 'create') {
        await troubleAdminService.createTrouble(formData);
        toast('장애 티켓이 성공적으로 접수되었습니다.', 'success');
      } else {
        await troubleAdminService.updateTrouble(formData.troblId!, formData);
        toast('장애 처리 정보가 브로드캐스팅되었습니다.', 'success');
      }
      setIsOpen(false);
      router.refresh();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string, name: string) => {
    const isConfirmed = await confirm({
      title: '장애 데이터 아카이브 소거',
      message: `[${name}] 장애 기록을 영구히 삭제하시겠습니까? 관련 기술 부채 분석 데이터가 손실될 수 있습니다.`,
      variant: 'destructive',
      confirmText: 'Purge Record'
    });
    if (isConfirmed) {
      try {
        await troubleAdminService.deleteTrouble(id);
        toast('데이터가 소거되었습니다.', 'success');
        router.refresh();
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns: ColumnDef<Trouble>[] = [
    {
      id: 'troblKnd',
      header: 'Fault Vector',
      width: 120,
      accessor: (item: Trouble) => (
        <span className={cn(
          "px-3 py-1 bg-slate-100 text-slate-900 rounded-lg text-[10px] font-black uppercase italic tracking-widest border border-slate-200",
          item.troblKnd === '1' ? "text-rose-600 bg-rose-50" :
            item.troblKnd === '2' ? "text-blue-600 bg-blue-50" :
              "text-orange-600 bg-orange-50"
        )}>
          {item.troblKnd === '1' ? 'SERVER' : item.troblKnd === '2' ? 'DB' : 'NW'}
        </span>
      )
    },
    {
      id: 'troblNm',
      header: 'Incident Nomenclature',
      width: 300,
      accessor: (item: Trouble) => (
        <div className="flex items-center gap-4 py-1">
          <div className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg transition-transform hover:rotate-6",
            item.processSttus === 'C' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          )}>
            {item.processSttus === 'C' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-black italic uppercase tracking-tighter text-slate-900 text-lg leading-tight">{item.troblNm}</span>
            <span className="text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest opacity-60 italic">Node ID: {item.troblId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'troblOccrrncTime',
      header: 'Temporal Matrix',
      width: 180,
      accessor: (item: Trouble) => (
        <div className="flex items-center gap-2 text-slate-500 font-mono font-black text-xs">
          <Clock size={14} className="opacity-30" />
          {item.troblOccrrncTime}
        </div>
      )
    },
    {
      id: 'processSttus',
      header: 'Resolution Status',
      width: 180,
      accessor: (item: Trouble) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-2 h-2 rounded-full",
            item.processSttus === 'C' ? "bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" :
              item.processSttus === 'P' ? "bg-orange-500 animate-pulse" : "bg-rose-500"
          )} />
          <span className={cn(
            "text-[10px] font-black uppercase tracking-[0.2em] italic font-mono",
            item.processSttus === 'C' ? "text-emerald-600" :
              item.processSttus === 'P' ? "text-orange-600" : "text-rose-600"
          )}>
            {item.processSttus === 'C' ? 'RESOLVED' : item.processSttus === 'P' ? 'PROCESSING' : 'PENDING'}
          </span>
        </div>
      )
    },
    {
      id: 'troblRqesterNm',
      header: 'Reporter',
      width: 120,
      accessor: (item: Trouble) => (
        <span className="text-xs font-black text-slate-500 uppercase italic tracking-tighter">{item.troblRqesterNm || 'System Monitor'}</span>
      )
    },
    {
      id: 'actions',
      header: 'COMMAND CENTER',
      className: 'text-right',
      accessor: (item: Trouble) => (
        <div className="flex justify-end gap-2 pr-4">
          <button
            onClick={() => handleOpenEdit(item)}
            className="h-11 w-11 bg-slate-900/5 text-slate-900 hover:text-white hover:bg-slate-900 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95"
          >
            <Settings size={18} />
          </button>
          <button
            onClick={() => handleDelete(item.troblId, item.troblNm)}
            className="h-11 w-11 bg-rose-50 text-rose-400 hover:text-rose-600 hover:bg-white hover:border-rose-100 hover:shadow-2xl transition-all rounded-[1.25rem] flex items-center justify-center border border-transparent hover:scale-105 active:scale-95"
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
        title="인시던트 리스폰스 매트릭스"
        breadcrumbs={[{ label: '시스템관리' }, { label: '장애관리' }]}
        actions={
          <Button
            onClick={handleOpenCreate}
            className="h-16 px-10 rounded-[1.5rem] font-black shadow-[0_20px_40px_rgba(225,29,72,0.15)] bg-rose-600 text-white gap-3 hover:-translate-y-1 hover:bg-rose-700 transition-all active:scale-95 italic uppercase tracking-widest text-[11px] border border-white/10"
          >
            <Zap size={20} strokeWidth={3} fill="white" /> Register Critical Incident
          </Button>
        }
      />

      {/* Luxury Stats Matrix */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <SummaryCard
          title="PENDING ISSUES"
          value={troubles.filter(t => t.processSttus === 'R').length}
          icon={<AlertCircle size={24} />}
          color="rose"
          isAlert={troubles.filter(t => t.processSttus === 'R').length > 0}
        />
        <SummaryCard
          title="ACTIVE PROCESS"
          value={troubles.filter(t => t.processSttus === 'P').length}
          icon={<RefreshCcw size={24} />}
          color="orange"
        />
        <SummaryCard
          title="RESOLVED NODES"
          value={troubles.filter(t => t.processSttus === 'C').length}
          icon={<CheckCircle2 size={24} />}
          color="emerald"
        />
        <SummaryCard
          title="TOTAL TICKETS"
          value={troubles.length}
          icon={<Activity size={24} />}
          color="slate"
        />
      </div>

      {/* High-End Info Banner */}
      <div className="p-10 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Terminal size={40} className="text-rose-400 group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left relative z-10">
          <h4 className="text-3xl font-black italic tracking-tighter uppercase">Reactive Infrastructure Shield</h4>
          <p className="text-base text-slate-400 font-bold leading-relaxed max-w-3xl">
            시스템 장애 상황을 즉시 감지하고 기술 부채의 원인을 파악하십시오. 모든 처리 프로세스는 <span className="text-rose-400 font-black italic lowercase tracking-wider hover:text-white transition-colors">Emergency Protocol</span>을 따르며, 티켓팅 시스템을 통해 해결 과정이 투명하게 공유됩니다.
          </p>
        </div>
        <Cpu size={240} className="absolute right-[-60px] top-[-60px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000 pointer-events-none" />
      </div>

      {/* Main Container Grid */}
      <div className="bg-white rounded-[5rem] p-6 shadow-[0_40px_80px_rgba(0,0,0,0.05)] border border-slate-50 relative group/matrix ring-1 ring-slate-100">
        <UltimateDataGrid
          title="SYSTEM INCIDENT REPOSITORY MASTER"
          columns={columns}
          data={troubles}
          emptyMessage="관측된 장애 매개변수가 존재하지 않습니다."
          className="bg-slate-50/50 p-10 rounded-[4rem] border border-dashed border-slate-200"
          keyField="troblId"
        />
        <div className="flex justify-center items-center gap-6 mt-10 text-[9px] font-black italic text-slate-300 tracking-[0.4em] uppercase opacity-40">
          <div className="flex items-center gap-3">
            <Activity size={12} className="animate-pulse text-rose-400" />
            INCIDENT RESPONSE MODE: ARMED
          </div>
          <div className="w-1.5 h-1.5 rounded-full bg-slate-200" />
          <div className="flex items-center gap-3">
            <ShieldCheck size={12} />
            SECURITY AUDIT PERSISTENT
          </div>
        </div>
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={mode === 'create' ? 'Inaugurate New Incident Ticket' : 'Alter Failure Blueprint'}
        maxWidth="lg"
      >
        <StandardForm onSubmit={handleSave} className="bg-transparent border-0 shadow-none">
          <div className="p-8 space-y-12">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500" /> Incident Nomenclature
              </label>
              <input
                type="text"
                value={formData.troblNm}
                onChange={(e) => setFormData({ ...formData, troblNm: e.target.value })}
                placeholder="Enter incident technical name..."
                className="w-full h-16 rounded-2xl border-2 bg-white dark:bg-slate-800 font-black text-xl px-8 outline-none focus:ring-8 focus:ring-rose-500/5 focus:border-rose-200 focus:bg-white dark:focus:bg-slate-700 transition-all shadow-xl italic tracking-tighter"
                required
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-500" /> Failure Vector
                </label>
                <select
                  value={formData.troblKnd}
                  onChange={(e) => setFormData({ ...formData, troblKnd: e.target.value })}
                  className="w-full h-16 rounded-2xl border-2 bg-white dark:bg-slate-800 font-black text-xs px-6 outline-none hover:border-slate-300 cursor-pointer appearance-none uppercase italic tracking-widest shadow-inner transition-colors"
                >
                  <option value="1">SERVER INFRASTRUCTURE</option>
                  <option value="2">DATABASE ENGINE</option>
                  <option value="3">NETWORK TOPOLOGY</option>
                  <option value="4">SECURITY ASSET</option>
                </select>
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" /> Response Condition
                </label>
                <select
                  value={formData.processSttus}
                  onChange={(e) => setFormData({ ...formData, processSttus: e.target.value })}
                  className="w-full h-16 rounded-2xl border-2 bg-white dark:bg-slate-800 font-black text-xs px-6 outline-none hover:border-slate-300 cursor-pointer appearance-none uppercase italic tracking-widest shadow-inner transition-colors"
                >
                  <option value="R">PENDING / RECEIVED</option>
                  <option value="P">PROCESSING / ACTIVE</option>
                  <option value="C">COMPLETED / STABLE</option>
                </select>
              </div>
            </div>

            <div className="space-y-4 pt-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-400" /> Diagnostic Background & Logic
              </label>
              <textarea
                value={formData.troblDc || ''}
                onChange={(e) => setFormData({ ...formData, troblDc: e.target.value })}
                placeholder="Describe the architectural impact of this incident..."
                className="w-full min-h-[160px] p-8 rounded-[2.5rem] border-2 bg-white dark:bg-slate-800 font-bold text-lg outline-none focus:bg-white dark:focus:bg-slate-700 focus:ring-8 focus:ring-rose-500/5 transition-all resize-none shadow-inner leading-relaxed"
              />
            </div>

            <div className="flex gap-6 pt-6">
              <button type="button" onClick={() => setIsOpen(false)} className="flex-1 h-16 border-2 border-slate-100 dark:border-slate-700 rounded-2xl font-black uppercase text-[10px] tracking-[0.2em] hover:bg-slate-50 dark:hover:bg-slate-800 transition-all opacity-40 hover:opacity-100">Abort Response</button>
              <button type="submit" className="flex-[2] h-16 bg-rose-600 text-white rounded-2xl font-black shadow-2xl shadow-rose-600/30 italic uppercase tracking-[0.3em] text-[10px] flex items-center justify-center gap-4 hover:-translate-y-1 transition-all active:scale-95 border border-white/10 group">
                <CheckCircle2 size={20} className="group-hover:rotate-12 transition-transform" /> Commit Failure Protocol
              </button>
            </div>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}

function SummaryCard({ title, value, icon, color, isAlert }: any) {
  const colorMap: any = {
    rose: cn("bg-white border-slate-100 shadow-xl", isAlert && "border-rose-200 ring-2 ring-rose-50"),
    orange: "bg-white border-slate-100 shadow-xl hover:border-orange-200",
    emerald: "bg-white border-slate-100 shadow-xl hover:border-emerald-200",
    slate: "bg-slate-900 border-slate-800 text-white shadow-2xl"
  };

  const iconBgMap: any = {
    rose: cn("bg-rose-50 text-rose-600 shadow-sm", isAlert && "bg-rose-600 text-white animate-pulse shadow-rose-200"),
    orange: "bg-orange-50 text-orange-600 shadow-sm",
    emerald: "bg-emerald-50 text-emerald-600 shadow-sm transition-transform group-hover:scale-110",
    slate: "bg-white/10 text-white group-hover:rotate-12 transition-transform"
  };

  return (
    <div className={cn(
      "p-8 rounded-[3rem] border-2 transition-all group overflow-hidden relative",
      colorMap[color]
    )}>
      <div className="flex justify-between items-start mb-6 relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center transition-all", iconBgMap[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 italic">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1 leading-none">{title}</p>
        <h4 className="text-4xl font-black tracking-tighter tabular-nums leading-none">{value}</h4>
      </div>
      <div className="absolute right-[-20%] bottom-[-20%] opacity-[0.03] group-hover:rotate-12 transition-all duration-700 pointer-events-none">
        {React.cloneElement(icon, { size: 160 })}
      </div>
    </div>
  );
}