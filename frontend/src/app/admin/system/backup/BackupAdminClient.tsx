'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { BackupOpert, BackupResult } from '@/services/backupService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { saveBackupAction, deleteBackupAction } from '@/app/actions/backupActions';
import { 
  Play, 
  History, 
  Plus, 
  Trash2, 
  Edit, 
  CheckCircle2, 
  XCircle,
  Database,
  ShieldCheck,
  RefreshCcw,
  Zap,
  Clock,
  HardDrive,
  FolderSync,
  Archive,
  ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { StandardModal } from '@/app/components/ui/standard-modal';

export default function BackupAdminClient({ 
    initialOperations, 
    initialResults 
}: { 
    initialOperations: BackupOpert[]; 
    initialResults: BackupResult[] 
}) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [activeTab, setTab] = useState<'operations' | 'results'>('operations');

  // Modal State
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<BackupOpert | null>(null);

  const handleRefresh = () => {
    router.refresh();
    toast('데이터가 동기화되었습니다.', 'success');
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsOpen(true);
  };

  const handleEdit = (item: BackupOpert) => {
    setEditingItem(item);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: '백업 정책 삭제',
      message: '해당 정책을 삭제하시겠습니까? 관련 실행 이력은 보존되지만 자동 백업은 중단됩니다.',
      variant: 'destructive',
      confirmText: '정책 삭제'
    });
    if (isConfirmed) {
      const res = await deleteBackupAction(id);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await saveBackupAction(null, formData);
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const opColumns: ColumnDef<BackupOpert>[] = [
    { 
      id: 'backupOpertNm',
      header: 'Backup Protocol', 
      pinned: 'left',
      width: 300,
      accessor: (item: BackupOpert) => (
          <div className="flex items-center gap-4 py-1">
              <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg">
                  <Database size={18} />
              </div>
              <div className="flex flex-col gap-0.5">
                  <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.backupOpertNm}</span>
                  <span className="text-[9px] font-mono text-slate-400 font-bold uppercase tracking-widest opacity-60">ID: {item.backupOpertId}</span>
              </div>
          </div>
      )
    },
    { 
      id: 'paths',
      header: 'Sync Matrix', 
      width: 400,
      accessor: (item: BackupOpert) => (
        <div className="flex items-center gap-3">
            <div className="flex flex-col gap-1 items-end text-right min-w-[150px]">
                <span className="text-[9px] font-black text-slate-300 uppercase italic">Source</span>
                <span className="text-[11px] font-mono font-bold text-slate-500 truncate max-w-[150px]">{item.backupOrginlDrctry}</span>
            </div>
            <ArrowRight size={14} className="text-primary opacity-20" />
            <div className="flex flex-col gap-1 items-start min-w-[150px]">
                <span className="text-[9px] font-black text-primary uppercase italic">Archive</span>
                <span className="text-[11px] font-mono font-bold text-slate-900 truncate max-w-[150px]">{item.backupStreDrctry}</span>
            </div>
        </div>
      )
    },
    { 
      id: 'schedule',
      header: 'Activation Cycle', 
      accessor: (item: BackupOpert) => (
          <div className="flex flex-col gap-1.5">
              <span className="inline-flex items-center gap-1 px-2 py-1 bg-slate-100 text-slate-600 text-[9px] font-black uppercase tracking-widest rounded-md w-fit">
                {item.executCycle === '01' ? 'Daily Sync' : 'Custom Interval'}
              </span>
              <div className="flex items-center gap-1.5 text-xs font-black font-mono text-slate-400 italic">
                <Clock size={12} /> {item.executSchdulHour}:{item.executSchdulMnt}
              </div>
          </div>
      )
    },
    { 
      id: 'useAt',
      header: 'State', 
      width: 100,
      accessor: (item: BackupOpert) => <StatusBadge status={item.useAt === 'Y' ? 'Y' : 'N'} /> 
    },
    {
      id: 'actions',
      header: 'System Overlay',
      className: 'text-right',
      accessor: (item: BackupOpert) => (
        <div className="flex justify-end gap-2 pr-4">
            <button className="h-10 w-10 bg-slate-100 text-slate-400 hover:text-primary hover:bg-white hover:shadow-lg transition-all rounded-xl flex items-center justify-center">
                <Play size={16} fill="currentColor" />
            </button>
            <button onClick={() => handleEdit(item)} className="h-10 w-10 bg-slate-100 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-lg transition-all rounded-xl flex items-center justify-center">
                <Edit size={16} />
            </button>
            <button onClick={() => handleDelete(item.backupOpertId)} className="h-10 w-10 bg-slate-100 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-lg transition-all rounded-xl flex items-center justify-center">
                <Trash2 size={16} />
            </button>
        </div>
      )
    }
  ];

  const resColumns: ColumnDef<BackupResult>[] = [
    { 
      id: 'backupOpertNm',
      header: 'Execution Signature', 
      accessor: (item: BackupResult) => (
          <div className="flex items-center gap-3 py-1">
              <div className={cn(
                  "w-8 h-8 rounded-lg flex items-center justify-center shadow-md",
                  item.sttus === '01' ? "bg-emerald-600 text-white" : "bg-rose-600 text-white"
              )}>
                  {item.sttus === '01' ? <CheckCircle2 size={16} /> : <XCircle size={16} />}
              </div>
              <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.backupOpertNm}</span>
          </div>
      )
    },
    { 
      id: 'sttus',
      header: 'Result Integrity', 
      accessor: (item: BackupResult) => (
          <span className={cn(
              "text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest italic",
              item.sttus === '01' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-rose-50 text-rose-600 border border-rose-100"
          )}>
              {item.sttus === '01' ? 'Checksum Valid' : 'Corrupted Node'}
          </span>
      )
    },
    { 
      id: 'time',
      header: 'Timestamp Matrix', 
      accessor: (item: BackupResult) => (
          <div className="flex flex-col gap-1">
              <span className="text-[10px] font-bold text-slate-400 font-mono italic">S: {item.executBeginTime}</span>
              <span className="text-[10px] font-bold text-slate-300 font-mono italic">E: {item.executEndTime}</span>
          </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader 
        title="백업 지능형 복원 및 정책 엔진" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '백업관리' }]}
        actions={
          <div className="flex items-center gap-4">
            <Button 
                onClick={handleRefresh} 
                className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl active:scale-95"
            >
                <RefreshCcw size={20} />
            </Button>
            <Button 
                onClick={handleCreate}
                className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black italic uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3"
            >
                <Plus size={18} /> Define New Protocol
            </Button>
          </div>
        }
      />

      <div className="flex justify-center">
        <div className="flex bg-white border-2 border-slate-100 p-2 rounded-[2.5rem] shadow-2xl ring-4 ring-slate-900/5">
          <button
            onClick={() => setTab('operations')}
            className={cn(
              "flex items-center gap-4 px-10 py-4 text-[10px] font-black rounded-[1.75rem] transition-all uppercase tracking-[0.2em] italic",
              activeTab === 'operations' ? "bg-slate-900 text-white shadow-2xl scale-105" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <FolderSync size={18} /> Policy Architect
          </button>
          <button
            onClick={() => setTab('results')}
            className={cn(
              "flex items-center gap-4 px-10 py-4 text-[10px] font-black rounded-[1.75rem] transition-all uppercase tracking-[0.2em] italic",
              activeTab === 'results' ? "bg-slate-900 text-white shadow-2xl scale-105" : "text-slate-400 hover:text-slate-900 hover:bg-slate-50"
            )}
          >
            <History size={18} /> Archive Ledger
          </button>
        </div>
      </div>

      <div className="p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl flex flex-col md:flex-row items-center gap-12 relative overflow-hidden group border border-white/5">
        <div className="w-24 h-24 bg-white/10 rounded-[2rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
          <ShieldCheck size={40} className="text-primary-foreground group-hover:scale-110 transition-transform" />
        </div>
        <div className="space-y-4 flex-1 text-center md:text-left">
          <h4 className="text-3xl font-black italic tracking-tighter uppercase tabular-nums">High-Integrity Backup Core</h4>
          <p className="text-base text-slate-400 font-bold leading-relaxed max-w-3xl">
            시스템 데이터의 무결성을 보장하십시오. <span className="text-emerald-400 font-black italic uppercase italic">Automated Sync Protocol</span>을 통해 예기치 못한 실패로부터 지식 자산을 보호합니다. 정책 주기와 압축 계층을 최적화하여 인프라 부하를 최소화하십시오.
          </p>
        </div>
        <HardDrive size={240} className="absolute right-[-60px] top-[-60px] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <SummaryCard title="DEFINED POLICIES" value={initialOperations.length} icon={<FolderSync size={24} />} color="slate" />
        <SummaryCard title="INTEGRITY RATE" value={`${initialResults.length > 0 ? ((initialResults.filter(r => r.sttus === '01').length / initialResults.length) * 100).toFixed(1) : 0}%`} icon={<ShieldCheck size={24} />} color="primary" />
        <SummaryCard title="ACTIVE NODES" value={initialOperations.filter(o => o.useAt === 'Y').length} icon={<Zap size={24} />} color="emerald" />
      </div>

      <div className="bg-white rounded-[4.5rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative">
        <UltimateDataGrid
          title={activeTab === 'operations' ? "BACKUP POLICY BLUEPRINT" : "ARCHIVE MODIFICATION LOG"}
          columns={activeTab === 'operations' ? (opColumns as any) : (resColumns as any)}
          data={activeTab === 'operations' ? (initialOperations as any) : (initialResults as any)}
          keyField={activeTab === 'operations' ? "backupOpertId" : "backupResultId"}
          className="bg-slate-50/50 p-8 rounded-[3.5rem] border border-dashed border-slate-200"
        />
      </div>

      {/* Backup Form Modal */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={editingItem ? 'Alter Policy Protocol' : 'Formulate New Archive Logic'}
        maxWidth="lg"
      >
          <form id="admin-form" onSubmit={handleSubmit} className="p-10 space-y-12">
              <input type="hidden" name="backupOpertId" defaultValue={editingItem?.backupOpertId} />
              
              <div className="space-y-10">
                  <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Protocol Nomenclature</label>
                      <input name="backupOpertNm" type="text" defaultValue={editingItem?.backupOpertNm} className="w-full h-16 rounded-2xl border-2 text-xl font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" required placeholder="PROTOCOL IDENTIFIER" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Source Volume path</label>
                          <input name="backupOrginlDrctry" type="text" defaultValue={editingItem?.backupOrginlDrctry} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="/source/volume" />
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Archive Cluster Point</label>
                          <input name="backupStreDrctry" type="text" defaultValue={editingItem?.backupStreDrctry} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="/archive/cluster" />
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                       <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Sync Interval</label>
                          <select name="executCycle" defaultValue={editingItem?.executCycle || '01'} className="w-full h-14 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest italic px-4 focus:ring-4 focus:ring-primary/10 transition-all bg-white appearance-none cursor-pointer">
                              <option value="01">Daily Protocol</option>
                              <option value="02">Weekly Audit</option>
                              <option value="03">Monthly Snapshot</option>
                          </select>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Activation Node</label>
                          <div className="flex items-center gap-2">
                              <select name="executSchdulHour" defaultValue={editingItem?.executSchdulHour || '00'} className="flex-1 h-14 rounded-xl border-2 text-sm font-black italic font-mono px-3 focus:ring-4 focus:ring-primary/10 transition-all bg-white">
                                  {Array.from({length: 24}, (_, i) => i.toString().padStart(2, '0')).map(h => <option key={h} value={h}>{h}</option>)}
                              </select>
                              <span className="font-black text-slate-300">:</span>
                              <select name="executSchdulMnt" defaultValue={editingItem?.executSchdulMnt || '00'} className="flex-1 h-14 rounded-xl border-2 text-sm font-black italic font-mono px-3 focus:ring-4 focus:ring-primary/10 transition-all bg-white">
                                  {Array.from({length: 60}, (_, i) => i.toString().padStart(2, '0')).map(m => <option key={m} value={m}>{m}</option>)}
                              </select>
                          </div>
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Compression Layer</label>
                          <select name="cmprsSe" defaultValue={editingItem?.cmprsSe || '01'} className="w-full h-14 rounded-xl border-2 text-[10px] font-black uppercase tracking-widest italic px-4 focus:ring-4 focus:ring-primary/10 transition-all bg-white appearance-none cursor-pointer">
                              <option value="01">Plain Snapshot</option>
                              <option value="02">Zip Delta</option>
                              <option value="03">Tar GZ Matrix</option>
                          </select>
                      </div>
                  </div>

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Policy Execution State</label>
                      <div className="flex gap-4">
                          <label className="flex-1 cursor-pointer group">
                              <input type="radio" name="useAt" value="Y" defaultChecked={editingItem?.useAt !== 'N'} className="hidden peer" />
                              <div className="h-16 rounded-2xl border-2 border-slate-100 flex items-center justify-center gap-3 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all">
                                  <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                                  <span className="text-[11px] font-black uppercase tracking-widest italic">Live Domain</span>
                              </div>
                          </label>
                          <label className="flex-1 cursor-pointer group">
                              <input type="radio" name="useAt" value="N" defaultChecked={editingItem?.useAt === 'N'} className="hidden peer" />
                              <div className="h-16 rounded-2xl border-2 border-slate-100 flex items-center justify-center gap-3 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all">
                                  <div className="w-2 h-2 rounded-full bg-slate-300" />
                                  <span className="text-[11px] font-black uppercase tracking-widest italic">Suspended Node</span>
                              </div>
                          </label>
                      </div>
                  </div>
              </div>

              <div className="flex gap-4 pt-10">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 transition-all">Abort</Button>
                  <Button type="submit" className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95">
                      {editingItem ? 'Commit Policy Modification' : 'Broadcast New Archive Protocol'}
                  </Button>
              </div>
          </form>
      </StandardModal>
    </div>
  );
}

function SummaryCard({ title, value, icon, color }: any) {
    const colorMap: any = {
        slate: "bg-white text-slate-900 border-slate-100 shadow-xl shadow-slate-900/5",
        primary: "bg-white text-primary border-primary/5 shadow-xl shadow-primary/5",
        emerald: "bg-emerald-600 text-white border-emerald-700 shadow-2xl shadow-emerald-400/20"
    };

    const iconBgMap: any = {
        slate: "bg-slate-900 text-white shadow-xl shadow-slate-900/20",
        primary: "bg-primary text-white shadow-lg shadow-primary/20",
        emerald: "bg-white/10 text-white"
    };

    return (
        <div className={cn(
            "p-10 rounded-[3rem] border-2 transition-all hover:scale-[1.02] hover:shadow-2xl group overflow-hidden relative cursor-default",
            colorMap[color]
        )}>
            <div className="flex items-start justify-between mb-6 relative z-10">
                <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform", iconBgMap[color])}>
                    {icon}
                </div>
            </div>
            <div className="relative z-10 italic">
                <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-1">{title}</p>
                <h4 className="text-4xl font-black tracking-tighter tabular-nums mb-1">{value}</h4>
                <div className="h-1 w-12 bg-current opacity-10 rounded-full" />
            </div>
            <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
                {React.cloneElement(icon, { size: 180 })}
            </div>
        </div>
    );
}
