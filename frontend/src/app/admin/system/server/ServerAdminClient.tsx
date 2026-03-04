'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { ServerInfo } from '@/services/admin/system/ServerAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { saveServerAction, deleteServerAction } from '@/app/actions/serverActions';
import {
  Server,
  Monitor,
  Database,
  Globe,
  Cpu,
  Plus,
  Trash2,
  Edit,
  RefreshCcw,
  Activity,
  Zap,
  ShieldCheck,
  Search,
  ArrowRight,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { StandardModal } from '@/app/components/ui/standard-modal';

export default function ServerAdminClient({ initialServers }: { initialServers: ServerInfo[] }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [serverNm, setServerNm] = useState('');

  // Modal State
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ServerInfo | null>(null);

  const handleRefresh = async () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsOpen(true);
  };

  const handleEdit = (item: ServerInfo) => {
    setEditingItem(item);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: '서버 자산 폐기',
      message: '해당 서버 인프라 정보를 시스템에서 영구히 삭제하시겠습니까?',
      variant: 'destructive',
      confirmText: '자산 삭제'
    });
    if (isConfirmed) {
      const res = await deleteServerAction(id);
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
    const res = await saveServerAction(null, formData);
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const filteredData = initialServers.filter(s =>
    s.serverNm.toLowerCase().includes(serverNm.toLowerCase())
  );

  const columns: ColumnDef<ServerInfo>[] = [
    {
      id: 'serverKnd',
      header: 'Compute Grade',
      width: 150,
      accessor: (item: ServerInfo) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-all transform group-hover:scale-110",
            item.serverKnd === '1' ? "bg-orange-900 border border-orange-700/50" :
              item.serverKnd === '2' ? "bg-blue-900 border border-blue-700/50" :
                "bg-emerald-900 border border-emerald-700/50"
          )}>
            {item.serverKnd === '1' ? <Cpu size={16} className="text-orange-400" /> :
              item.serverKnd === '2' ? <Database size={16} className="text-blue-400" /> :
                <Globe size={16} className="text-emerald-400" />}
          </div>
          <span className="text-[10px] font-black italic uppercase tracking-[0.2em] text-slate-400">
            {item.serverKnd === '1' ? 'WAS Node' : item.serverKnd === '2' ? 'DB Instance' : 'Web Proxy'}
          </span>
        </div>
      )
    },
    {
      id: 'serverNm',
      header: 'Infrastructure Identity',
      width: 300,
      accessor: (item: ServerInfo) => (
        <div className="flex flex-col gap-1 py-2">
          <span className="text-sm font-black text-slate-900 tracking-tight italic uppercase">{item.serverNm}</span>
          <div className="flex items-center gap-2 text-[9px] font-mono font-black text-slate-400 uppercase tracking-widest opacity-60">
            Cluster SID: <span className="text-primary">{item.serverId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'regstYmd',
      header: 'Lifecycle Init',
      accessor: (item: ServerInfo) => (
        <div className="flex items-center gap-2 text-[10px] font-mono font-black text-slate-400 italic tabular-nums">
          <Clock size={12} className="opacity-30" /> {item.regstYmd}
        </div>
      )
    },
    {
      id: 'status',
      header: 'Pulse State',
      accessor: () => (
        <div className="flex items-center gap-3">
          <div className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]"></span>
          </div>
          <span className="text-[10px] font-black text-emerald-600 uppercase tracking-widest italic">Live / Online</span>
        </div>
      )
    },
    {
      id: 'actions',
      header: 'System Action',
      className: 'text-right',
      accessor: (item: ServerInfo) => (
        <div className="flex justify-end gap-2 pr-4">
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
        title="전사 지능형 인프라 관제 엔진"
        breadcrumbs={[{ label: '시스템관리' }, { label: '서버정보' }]}
        actions={
          <div className="flex items-center gap-4">
            <Button
              onClick={handleRefresh}
              className="h-14 w-14 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl active:scale-95"
            >
              <RefreshCcw size={20} className={cn(loading && "animate-spin")} />
            </Button>
            <Button
              onClick={handleCreate}
              className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black italic uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3"
            >
              <Plus size={18} /> Register Compute Node
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <LuxurySummaryCard title="TOTAL ASSETS" count={initialServers.length} icon={<Server size={24} />} color="slate" />
        <LuxurySummaryCard title="COMPUTE WAS" count={initialServers.filter(s => s.serverKnd === '1').length} icon={<Cpu size={24} />} color="orange" />
        <LuxurySummaryCard title="DATA ARCH" count={initialServers.filter(s => s.serverKnd === '2').length} icon={<Database size={24} />} color="blue" />
        <LuxurySummaryCard title="WEB EDGE" count={initialServers.filter(s => s.serverKnd === '3').length} icon={<Globe size={24} />} color="emerald" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-primary/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
              <Zap size={40} className="text-primary-foreground group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-4 flex-1 text-center md:text-left">
              <h4 className="text-4xl font-black italic tracking-tighter uppercase tabular-nums leading-tight">High-Performance Infrastructure</h4>
              <p className="text-lg text-slate-400 font-bold leading-relaxed max-w-2xl">
                서버 인벤토리를 체계적으로 시각화하고 리소스를 최적화하십시오. <br />
                모든 <span className="text-white">Compute Resource</span>는 표준 프레임워크 규격에 맞춰 안전하게 관리됩니다.
              </p>
            </div>
          </div>
          <Monitor size={240} className="absolute left-[-60px] bottom-[-60px] opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-1000" />
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-[4rem] p-10 shadow-xl flex flex-col gap-8 justify-center overflow-hidden group">
          <div className="flex items-center gap-4 mb-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-600 shadow-inner group-hover:scale-110 transition-transform">
              <ShieldCheck size={24} />
            </div>
            <div>
              <h5 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Protocol Active</h5>
              <p className="text-sm font-black italic">ASSET SECURITY VERIFIED</p>
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Identity Probe</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                value={serverNm}
                onChange={(e) => setServerNm(e.target.value)}
                className="w-full h-16 pl-12 pr-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all text-sm font-black italic outline-none"
                placeholder="PROBE SERVER NAME..."
              />
            </div>
          </div>
          <div className="flex items-center justify-between pt-4 border-t border-slate-50">
            <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest italic">Analysis Active</span>
            <ArrowRight size={16} className="text-primary opacity-20" />
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[5rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative overflow-hidden">
        <UltimateDataGrid
          title="INFRASTRUCTURE STREAM INVENTORY"
          columns={columns as any}
          data={filteredData as any}
          keyField="serverId"
          loading={loading}
          className="bg-slate-50/50 p-10 rounded-[4.5rem] border border-dashed border-slate-200"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={editingItem ? 'Alter Configuration' : 'Broadcast New Node'}
        maxWidth="md"
      >
        <form onSubmit={handleSubmit} className="p-10 space-y-12">
          <input type="hidden" name="serverId" defaultValue={editingItem?.serverId} />

          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Identity Nomenclature</label>
              <input name="serverNm" type="text" defaultValue={editingItem?.serverNm} className="w-full h-16 rounded-2xl border-2 text-xl font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" required placeholder="SERVER IDENTITY" />
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Compute Classification</label>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {[
                  { label: 'WAS NODE', value: '1', icon: <Cpu size={16} /> },
                  { label: 'DB INSTANCE', value: '2', icon: <Database size={16} /> },
                  { label: 'WEB PROXY', value: '3', icon: <Globe size={16} /> }
                ].map((cat) => (
                  <label key={cat.value} className="cursor-pointer group">
                    <input type="radio" name="serverKnd" value={cat.value} defaultChecked={editingItem?.serverKnd === cat.value || (cat.value === '1' && !editingItem)} className="hidden peer" />
                    <div className="h-24 rounded-2xl border-2 border-slate-100 flex flex-col items-center justify-center gap-2 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all hover:border-slate-300">
                      <div className="opacity-40 group-hover:scale-110 transition-transform">{cat.icon}</div>
                      <span className="text-[10px] font-black uppercase tracking-widest italic">{cat.label}</span>
                    </div>
                  </label>
                ))}
              </div>
            </div>
          </div>

          <div className="flex gap-4 pt-10">
            <Button type="button" variant="outline" onClick={() => setIsOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2 hover:bg-slate-50 transition-all">Abort Action</Button>
            <Button type="submit" className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95">
              {editingItem ? 'Commit Configuration' : 'Establish New Interconnect'}
            </Button>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}

function LuxurySummaryCard({ title, count, icon, color }: any) {
  const colorMap: any = {
    emerald: "bg-white text-emerald-600 border-emerald-50 shadow-xl shadow-emerald-600/5",
    blue: "bg-white text-blue-600 border-blue-50 shadow-xl shadow-blue-600/5",
    orange: "bg-white text-orange-600 border-orange-50 shadow-xl shadow-orange-600/5",
    slate: "bg-slate-900 text-white border-slate-800 shadow-2xl shadow-slate-900/20"
  };

  const iconBgMap: any = {
    emerald: "bg-emerald-50 shadow-inner",
    blue: "bg-blue-50 shadow-inner",
    orange: "bg-orange-50 shadow-inner",
    slate: "bg-white/10"
  };

  return (
    <div className={cn(
      "p-10 rounded-[3rem] border-2 transition-all hover:scale-[1.02] hover:shadow-2xl group overflow-hidden relative cursor-default",
      colorMap[color]
    )}>
      <div className="flex items-start justify-between mb-8 relative z-10">
        <div className={cn("w-14 h-14 rounded-2xl flex items-center justify-center group-hover:rotate-12 transition-transform", iconBgMap[color])}>
          {icon}
        </div>
      </div>
      <div className="relative z-10 italic">
        <p className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-1">{title}</p>
        <h4 className="text-4xl font-black tracking-tighter tabular-nums mb-1">{count}</h4>
        <div className="h-1 w-12 bg-current opacity-10 rounded-full" />
      </div>
      <div className="absolute right-[-10%] bottom-[-10%] opacity-[0.03] -rotate-12 group-hover:rotate-0 transition-all duration-1000">
        {React.cloneElement(icon, { size: 180 })}
      </div>
    </div>
  );
}
