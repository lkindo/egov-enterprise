'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { SyncServer } from '@/services/syncService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { saveSyncServerAction, deleteSyncServerAction, executeSyncAction } from '@/app/actions/syncActions';
import { 
  RefreshCw, 
  FolderSync, 
  Play, 
  Plus, 
  Edit, 
  Trash2,
  Server,
  Terminal,
  Activity,
  Zap,
  ShieldCheck,
  Search,
  ArrowRight,
  Clock,
  HardDrive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { StandardModal } from '@/app/components/ui/standard-modal';

export default function SyncServerAdminClient({ initialServers }: { initialServers: SyncServer[] }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  // Modal State
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<SyncServer | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsOpen(true);
  };

  const handleEdit = (item: SyncServer) => {
    setEditingItem(item);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: '동기화 노드 삭제',
      message: '해당 서버 동기화 설정을 폐기하시겠습니까? 연결된 모든 데이터 스트림이 중단됩니다.',
      variant: 'destructive',
      confirmText: '노드 삭제'
    });
    if (isConfirmed) {
      const res = await deleteSyncServerAction(id);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
    }
  };

  const handleSync = async (id: string) => {
    const isConfirmed = await confirm({
      title: '동기화 강제 실행',
      message: '해당 노드로의 데이터 미러링을 지금 시작하시겠습니까?',
      confirmText: '동기화 개시'
    });
    if (isConfirmed) {
      setLoading(true);
      const res = await executeSyncAction(id);
      if (res.success) {
        toast(res.message, 'success');
      } else {
        toast(res.message, 'error');
      }
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const res = await saveSyncServerAction(null, formData);
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const columns: ColumnDef<SyncServer>[] = [
    { 
      id: 'serverNm',
      header: 'Node Identity', 
      width: 250,
      accessor: (item: SyncServer) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-12 h-12 bg-slate-900 border border-white/10 rounded-2xl flex items-center justify-center shadow-xl group-hover:bg-primary transition-all duration-500">
            <Server size={18} className="text-white" />
          </div>
          <div className="flex flex-col gap-1">
              <span className="text-sm font-black text-slate-900 italic tracking-tight uppercase leading-none">{item.serverNm}</span>
              <div className="flex items-center gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
                  <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest">{item.serverIp}:{item.serverPort}</span>
              </div>
          </div>
        </div>
      )
    },
    { 
      id: 'targetDrctry',
      header: 'Mirror Endpoint', 
      width: 300,
      accessor: (item: SyncServer) => (
          <div className="px-5 py-3 bg-slate-50 border border-slate-100 rounded-2xl flex items-center gap-3 group-hover:bg-white group-hover:shadow-lg transition-all">
              <HardDrive size={14} className="text-slate-300 group-hover:text-primary transition-colors" />
              <span className="text-xs font-mono font-black text-slate-500 italic lowercase tracking-tight">{item.targetDrctry}</span>
          </div>
      )
    },
    { 
      id: 'syncAt',
      header: 'Protocol State', 
      width: 150,
      accessor: (item: SyncServer) => (
        <div className="flex flex-col gap-2">
            <StatusBadge status={item.syncAt} />
            <div className="flex items-center gap-2 px-2">
                <Clock size={10} className="text-slate-300" />
                <span className="text-[9px] font-mono font-bold text-slate-400 italic tabular-nums">{item.syncDt || 'No history'}</span>
            </div>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Stream Control',
      className: 'text-right',
      accessor: (item: SyncServer) => (
        <div className="flex justify-end gap-2 pr-4">
          <button 
            onClick={() => handleSync(item.serverId)}
            className="h-10 w-10 bg-primary/5 text-primary hover:text-white hover:bg-primary hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-primary/10" 
            title="동기화 실행"
          >
            <Play size={16} className="fill-current" />
          </button>
          <button onClick={() => handleEdit(item)} className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-transparent hover:border-slate-100">
            <Edit size={16} />
          </button>
          <button onClick={() => handleDelete(item.serverId)} className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-transparent hover:border-rose-100">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="서버 다이나믹 데이터 미러링 엔진"
        breadcrumbs={[{ label: '시스템관리' }, { label: '서버동기화' }]}
        actions={
          <div className="flex items-center gap-4">
            <Button 
                onClick={handleRefresh}
                className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl active:scale-95"
            >
                <RefreshCw size={20} className={cn(loading && "animate-spin")} />
            </Button>
            <Button 
                onClick={handleCreate}
                className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black italic uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 border border-white/10"
            >
                <Plus size={18} /> Establish New Cluster Node
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div className="md:col-span-2 p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl relative overflow-hidden group border border-white/5">
              <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/20 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2 animate-pulse" />
              <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
                  <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
                      <FolderSync size={40} className="text-primary-foreground group-hover:scale-110 transition-transform" />
                  </div>
                  <div className="space-y-4 flex-1 text-center md:text-left">
                      <h4 className="text-4xl font-black italic tracking-tighter uppercase tabular-nums leading-tight">Hyper-Sync Middleware</h4>
                      <p className="text-lg text-slate-400 font-bold leading-relaxed max-w-2xl">
                          서버 간 데이터 미러링 프로토콜을 설정하고 자동화를 가동하십시오. <br />
                          모든 <span className="text-white">Active Node</span>는 가용성 체크를 거쳐 실시간 동기화 스트림에 진입합니다.
                      </p>
                  </div>
              </div>
          </div>
          <div className="bg-white border-2 border-slate-100 rounded-[4rem] p-10 shadow-xl flex flex-col justify-center gap-6 overflow-hidden relative group">
              <div className="p-8 bg-slate-50 rounded-3xl space-y-2 border border-slate-100 group-hover:bg-slate-900 group-hover:text-white transition-all duration-700">
                  <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">Active Mirror Streams</p>
                  <p className="text-5xl font-black italic tabular-nums tracking-tighter">{initialServers.filter(s => s.syncAt === 'Y').length}</p>
              </div>
              <div className="flex items-center gap-4 px-4 py-2 bg-emerald-50 text-emerald-600 rounded-2xl border border-emerald-100/50">
                  <Activity size={16} />
                  <span className="text-[10px] font-black uppercase tracking-widest italic leading-none">Protocol Integrity: 100%</span>
              </div>
              <Terminal size={140} className="absolute right-[-40px] bottom-[-40px] opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-1000" />
          </div>
      </div>

      <div className="bg-white rounded-[5rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative overflow-hidden">
        <UltimateDataGrid
          title="SYNCHRONIZATION NODE INVENTORY"
          columns={columns as any}
          data={initialServers as any}
          keyField="serverId"
          loading={loading}
          className="bg-slate-50/50 p-10 rounded-[4.5rem] border border-dashed border-slate-200"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={editingItem ? 'Alter Protocol Interconnect' : 'Broadcast New Cluster Interconnect'}
        maxWidth="md"
      >
          <form onSubmit={handleSubmit} className="p-10 space-y-12">
              <input type="hidden" name="serverId" defaultValue={editingItem?.serverId} />
              
              <div className="space-y-10">
                  <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Node Nomenclature</label>
                      <input name="serverNm" type="text" defaultValue={editingItem?.serverNm} className="w-full h-16 rounded-2xl border-2 text-xl font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" required placeholder="SERVER IDENTITY" />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Virtual IPv4</label>
                          <input name="serverIp" type="text" defaultValue={editingItem?.serverIp} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="0.0.0.0" />
                      </div>
                      <div className="space-y-4">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Access Port</label>
                          <input name="serverPort" type="number" defaultValue={editingItem?.serverPort || 8080} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="PORT" />
                      </div>
                  </div>

                  <div className="space-y-4">
                      <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Mirror Endpoint Route</label>
                      <div className="relative">
                          <HardDrive className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
                          <input name="targetDrctry" type="text" defaultValue={editingItem?.targetDrctry} className="w-full h-16 pl-12 rounded-2xl border-2 text-sm font-black italic px-4 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" required placeholder="/SYSTEM/MIRROR/PATH" />
                      </div>
                  </div>
              </div>

              <div className="flex gap-4 pt-10">
                  <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 transition-all">Abort Action</Button>
                  <Button type="submit" className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 border border-white/10">
                      {editingItem ? 'Commit Configuration' : 'Establish Interconnect'}
                  </Button>
              </div>
          </form>
      </StandardModal>
    </div>
  );
}
