'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { BatchSchedule, BatchResult } from '@/services/admin/system/BatchAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { executeBatchAction } from '@/app/actions/batchActions';
import {
  Play,
  Calendar,
  History,
  RefreshCcw,
  Activity,
  Terminal,
  Cpu,
  Zap,
  Clock,
  CheckCircle2,
  AlertCircle,
  LucideIcon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';

export default function BatchAdminClient({
  initialSchedules,
  initialResults
}: {
  initialSchedules: BatchSchedule[];
  initialResults: BatchResult[]
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [activeTab, setTab] = useState<'schedule' | 'result'>('schedule');

  const handleRefresh = () => {
    router.refresh();
    toast('데이터가 동기화되었습니다.', 'success');
  };

  const handleExecuteNow = async (id: string) => {
    const isConfirmed = await confirm({
      title: '배치 즉시 실행',
      message: '해당 배치를 지금 즉시 실행하시겠습니까? 시스템 부하에 주의하십시오.',
      confirmText: '실행하기'
    });
    if (isConfirmed) {
      const res = await executeBatchAction(null, id);
      if (res.success) {
        toast(res.message, 'success');
        setTab('result');
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const scheduleColumns: ColumnDef<BatchSchedule>[] = [
    {
      id: 'batchOpertNm',
      header: 'Operation Identifier',
      pinned: 'left',
      width: 300,
      accessor: (item: BatchSchedule) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
            <Terminal size={18} />
          </div>
          <div className="flex flex-col gap-0.5">
            <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.batchOpertNm}</span>
            <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest opacity-60">Proc ID: {item.batchOpertId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'executCycle',
      header: 'Recurrence',
      accessor: (item: BatchSchedule) => (
        <span className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-primary/5 text-primary text-[10px] font-black uppercase tracking-widest rounded-lg border border-primary/10 italic">
          <Zap size={12} className="fill-primary" />
          {item.executCycle === '01' ? 'Daily Sync' : 'Custom Interval'}
        </span>
      )
    },
    {
      id: 'time',
      header: 'Scheduled Activation',
      accessor: (item: BatchSchedule) => (
        <div className="flex items-center gap-2">
          <Clock size={14} className="text-slate-300" />
          <span className="text-sm font-black font-mono text-slate-600 tracking-tight">
            {item.executSchdulHour}:{item.executSchdulMnt}:{item.executSchdulSecnd}
          </span>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'System Overlay',
      className: 'text-right',
      accessor: (item: BatchSchedule) => (
        <div className="flex justify-end pr-4">
          <Button
            onClick={() => handleExecuteNow(item.batchSchdulId)}
            className="h-10 px-6 bg-slate-900 hover:bg-primary text-white text-[10px] font-black uppercase italic tracking-widest rounded-xl transition-all shadow-xl shadow-slate-900/10 gap-2 active:scale-95"
          >
            <Play size={14} fill="currentColor" /> Trigger
          </Button>
        </div>
      )
    }
  ];

  const resultColumns: ColumnDef<BatchResult>[] = [
    {
      id: 'batchOpertNm',
      header: 'Historical Operation',
      accessor: (item: BatchResult) => (
        <div className="flex items-center gap-3 py-1">
          <div className={cn(
            "w-8 h-8 rounded-lg flex items-center justify-center shadow-md",
            item.sttus === '01' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
          )}>
            {item.sttus === '01' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
          </div>
          <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.batchOpertNm}</span>
        </div>
      )
    },
    {
      id: 'executBeginTime',
      header: 'Timestamp (Start)',
      accessor: (item: BatchResult) => (
        <span className="text-xs font-bold text-slate-400 font-mono tracking-tighter">{item.executBeginTime}</span>
      )
    },
    {
      id: 'executEndTime',
      header: 'Timestamp (End)',
      accessor: (item: BatchResult) => (
        <span className="text-xs font-bold text-slate-300 font-mono tracking-tighter italic">{item.executEndTime}</span>
      )
    },
    {
      id: 'sttus',
      header: 'Status Matrix',
      accessor: (item: BatchResult) => <StatusBadge status={item.sttus === '01' ? 'Y' : item.sttus === '03' ? 'R' : 'N'} />
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="배치 지능형 오퍼레이션 센터"
        breadcrumbs={[{ label: '시스템관리' }, { label: '배치관리' }]}
        actions={
          <Button
            onClick={handleRefresh}
            className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl active:scale-95"
          >
            <RefreshCcw size={20} />
          </Button>
        }
      />

      <div className="flex justify-center">
        <div className="flex bg-slate-900 text-white p-2 rounded-[2.5rem] shadow-2xl ring-4 ring-slate-900/5">
          <button
            onClick={() => setTab('schedule')}
            className={cn(
              "flex items-center gap-4 px-10 py-4 text-[10px] font-black rounded-[1.75rem] transition-all uppercase tracking-[0.2em] italic",
              activeTab === 'schedule' ? "bg-white text-slate-900 shadow-2xl scale-105" : "text-white/40 hover:text-white"
            )}
          >
            <Calendar size={18} /> Operation Schedule
          </button>
          <button
            onClick={() => setTab('result')}
            className={cn(
              "flex items-center gap-4 px-10 py-4 text-[10px] font-black rounded-[1.75rem] transition-all uppercase tracking-[0.2em] italic",
              activeTab === 'result' ? "bg-white text-slate-900 shadow-2xl scale-105" : "text-white/40 hover:text-white"
            )}
          >
            <History size={18} /> Execution Matrix
          </button>
        </div>
      </div>

      <div className="p-10 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-10 relative overflow-hidden group">
        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <Activity size={40} className="text-primary-foreground group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left">
          <h4 className="text-3xl font-black italic tracking-tighter uppercase tabular-nums">High-Performance Batch Core</h4>
          <p className="text-base text-slate-400 font-bold leading-relaxed max-w-2xl">
            시스템 작업 자동화를 모니터링하고 가속화하십시오. <span className="text-emerald-400 font-black italic uppercase">Real-time Scheduler</span>를 최적화하여 워크플로우 효율성을 극대화할 수 있습니다. 수동 개입이 필요한 경우 트리거 프로토콜을 활성화하십시오.
          </p>
        </div>
        <Cpu size={240} className="absolute right-[-60px] top-[-60px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <SummaryCard
          title="TOTAL DEFINED JOBS"
          value={initialSchedules.length}
          icon={<Cpu size={24} />}
          color="primary"
        />
        <SummaryCard
          title="RECENT SUCCESS RATE"
          value={`${initialResults.length > 0 ? ((initialResults.filter(r => r.sttus === '01').length / initialResults.length) * 100).toFixed(0) : 0}%`}
          icon={<Zap size={24} />}
          color="emerald"
        />
      </div>

      <div className="bg-white rounded-[4.5rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative">
        <UltimateDataGrid
          title={activeTab === 'schedule' ? "SYSTEM AUTOMATION BLUEPRINT" : "EXECUTION LOG REPOSITORY"}
          columns={(activeTab === 'schedule' ? scheduleColumns : resultColumns) as any}
          data={(activeTab === 'schedule' ? initialSchedules : initialResults) as any}
          keyField={(activeTab === 'schedule' ? "batchSchdulId" : "batchResultId") as any}
          className="bg-slate-50/50 p-8 rounded-[3.5rem] border border-dashed border-slate-200"
        />
      </div>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: { title: string, value: string | number, icon: React.ReactNode, color: string }) {
  const colorMap: any = {
    primary: "bg-white text-primary border-slate-100 shadow-xl shadow-primary/5",
    emerald: "bg-emerald-600 text-white border-emerald-700 shadow-2xl shadow-emerald-600/20"
  };

  const iconBgMap: any = {
    primary: "bg-primary text-white shadow-xl shadow-primary/20",
    emerald: "bg-white/10 text-white"
  };

  return (
    <div className={cn(
      "p-10 rounded-[3rem] border-2 transition-all group overflow-hidden relative",
      colorMap[color]
    )}>
      <div className="flex flex-col gap-4 relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform", iconBgMap[color])}>
          {icon}
        </div>
        <div>
          <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 mb-1 italic">{title}</p>
          <h4 className="text-4xl font-black italic tracking-tighter tabular-nums">{value}</h4>
        </div>
      </div>
      {React.isValidElement(icon) ? React.cloneElement(icon as React.ReactElement<any>, {
        size: 200,
        className: "absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000"
      }) : null}
    </div>
  );
}
