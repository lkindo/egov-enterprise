'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { Network } from '@/services/admin/system/NetworkAdminService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { saveNetworkAction, deleteNetworkAction } from '@/app/actions/networkActions';
import {
  Network as NetworkIcon,
  Globe,
  Shield,
  Activity,
  Plus,
  Trash2,
  Edit,
  RefreshCcw,
  Wifi,
  Cpu,
  Server,
  Terminal,
  ArrowUpRight,
  User,
  Search
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useRouter } from 'next/navigation';
import { StandardModal } from '@/app/components/ui/standard-modal';

export default function NetworkAdminClient({ initialNetworks }: { initialNetworks: Network[] }) {
  const { toast } = useToast();
  const confirm = useConfirm();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [searchParams, setSearchParams] = useState({ manageIem: '', userNm: '' });

  // Modal State
  const [isModalOpen, setIsOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Network | null>(null);

  const handleRefresh = () => {
    setLoading(true);
    router.refresh();
    setTimeout(() => setLoading(false), 800);
  };

  const handleCreate = () => {
    setEditingItem(null);
    setIsOpen(true);
  };

  const handleEdit = (item: Network) => {
    setEditingItem(item);
    setIsOpen(true);
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: '네트워크 자산 삭제',
      message: '해당 네트워크 인프라 정보를 삭제하시겠습니까?',
      variant: 'destructive',
      confirmText: '자산 삭제'
    });
    if (isConfirmed) {
      const res = await deleteNetworkAction(id);
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
    const res = await saveNetworkAction(null, formData);
    if (res.success) {
      toast(res.message, 'success');
      setIsOpen(false);
    } else {
      toast(res.message, 'error');
    }
  };

  const filteredData = initialNetworks.filter(item =>
    item.manageIem.toLowerCase().includes(searchParams.manageIem.toLowerCase()) &&
    item.userNm.toLowerCase().includes(searchParams.userNm.toLowerCase())
  );

  const columns: ColumnDef<Network>[] = [
    {
      id: 'manageIem',
      header: 'Infra Cluster',
      width: 250,
      accessor: (item: Network) => (
        <div className="flex items-center gap-4 py-1">
          <div className="w-10 h-10 bg-slate-900 text-white rounded-xl flex items-center justify-center shadow-lg group-hover:bg-primary transition-all">
            <Server size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-black italic uppercase tracking-tighter text-slate-900">{item.manageIem}</span>
            <span className="text-[9px] font-mono text-slate-400 font-bold tracking-widest uppercase opacity-60">Node ID: {item.ntwrkId}</span>
          </div>
        </div>
      )
    },
    {
      id: 'ntwrkIp',
      header: 'Virtual Address',
      width: 200,
      accessor: (item: Network) => (
        <div className="flex flex-col gap-1">
          <span className="text-sm font-black font-mono text-primary tabular-nums">{item.ntwrkIp}</span>
          <div className="flex items-center gap-2 opacity-40">
            <div className="w-1.5 h-1.5 rounded-full bg-slate-400" />
            <span className="text-[9px] font-mono font-bold tracking-widest uppercase">Sub: {item.subnet}</span>
          </div>
        </div>
      )
    },
    {
      id: 'gtwy',
      header: 'Gateway Logic',
      accessor: (item: Network) => (
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-slate-100 flex items-center justify-center text-slate-400">
            <Wifi size={12} />
          </div>
          <span className="text-xs font-mono font-black text-slate-500">{item.gtwy}</span>
        </div>
      )
    },
    {
      id: 'userNm',
      header: 'Node Controller',
      accessor: (item: Network) => (
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-slate-50 border border-slate-100 flex items-center justify-center text-slate-400">
            <User size={14} />
          </div>
          <span className="text-xs font-black text-slate-900 italic tracking-tight">{item.userNm}</span>
        </div>
      )
    },
    {
      id: 'useAt',
      header: 'State',
      width: 100,
      accessor: (item: Network) => <StatusBadge status={item.useAt === 'Y' ? 'Y' : 'N'} />
    },
    {
      id: 'actions',
      header: 'Control',
      className: 'text-right',
      accessor: (item: Network) => (
        <div className="flex justify-end gap-2 pr-4">
          <button onClick={() => handleEdit(item)} className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-slate-900 hover:bg-white hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-transparent hover:border-slate-100">
            <Edit size={16} />
          </button>
          <button onClick={() => handleDelete(item.ntwrkId)} className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-transparent hover:border-rose-100">
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="max-w-6xl mx-auto space-y-12 pb-24 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <PageHeader
        title="네트워크 인프라 최적화 엔진"
        breadcrumbs={[{ label: '시스템관리' }, { label: '네트워크관리' }]}
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
              <Plus size={18} /> Register Active Node
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
        <LuxurySummaryCard title="ACTIVE SLOTS" count={initialNetworks.filter(n => n.useAt === 'Y').length} icon={<Activity size={24} />} color="emerald" />
        <LuxurySummaryCard title="IP CLUSTERS" count={initialNetworks.length} icon={<Globe size={24} />} color="primary" />
        <LuxurySummaryCard title="SECURITY ZONES" count={new Set(initialNetworks.map(n => n.manageIem)).size} icon={<Shield size={24} />} color="indigo" />
        <LuxurySummaryCard title="LOGICAL NODES" count={initialNetworks.length} icon={<NetworkIcon size={24} />} color="slate" />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="md:col-span-2 p-12 bg-slate-900 text-white rounded-[4rem] shadow-2xl relative overflow-hidden group border border-white/5">
          <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-indigo-500/10 rounded-full blur-[120px] -translate-y-1/2 translate-x-1/2" />
          <div className="flex flex-col md:flex-row items-center gap-12 relative z-10">
            <div className="w-24 h-24 bg-white/10 rounded-[2.5rem] flex items-center justify-center backdrop-blur-3xl border border-white/20 shadow-2xl group-hover:rotate-12 transition-transform duration-700">
              <Cpu size={40} className="text-primary-foreground group-hover:scale-110 transition-transform" />
            </div>
            <div className="space-y-4 flex-1 text-center md:text-left">
              <h4 className="text-4xl font-black italic tracking-tighter uppercase tabular-nums leading-tight">Infrastructure Intelligence Core</h4>
              <p className="text-lg text-slate-400 font-bold leading-relaxed max-w-2xl">
                시스템 네트워크 토폴로지를 시각화하고 제어하십시오. <br />
                모든 <span className="text-white">Logical Interconnect</span>는 보안 프로토콜을 준수하며 실시간으로 모니터링됩니다.
              </p>
            </div>
          </div>
          <Terminal size={240} className="absolute left-[-60px] bottom-[-60px] opacity-[0.03] rotate-12 group-hover:rotate-0 transition-all duration-1000" />
        </div>

        <div className="bg-white border-2 border-slate-100 rounded-[4rem] p-10 shadow-xl flex flex-col gap-8 justify-center">
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Infra Cluster Search</label>
            <div className="relative">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                value={searchParams.manageIem}
                onChange={(e) => setSearchParams({ ...searchParams, manageIem: e.target.value })}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all text-sm font-black italic outline-none"
                placeholder="CLUSTER IDENTITY"
              />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Controller Probe</label>
            <div className="relative">
              <User className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" size={16} />
              <input
                value={searchParams.userNm}
                onChange={(e) => setSearchParams({ ...searchParams, userNm: e.target.value })}
                className="w-full h-14 pl-12 pr-4 bg-slate-50 rounded-2xl border-2 border-transparent focus:border-primary/20 focus:bg-white transition-all text-sm font-black italic outline-none"
                placeholder="OPERATOR NAME"
              />
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-[5rem] p-4 shadow-2xl border border-slate-100 ring-1 ring-slate-50 relative overflow-hidden">
        <UltimateDataGrid
          title="INFRASTRUCTURE STREAM INVENTORY"
          columns={columns as any}
          data={filteredData as any}
          keyField="ntwrkId"
          loading={loading}
          className="bg-slate-50/50 p-10 rounded-[4.5rem] border border-dashed border-slate-200"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsOpen(false)}
        title={editingItem ? 'Alter Infrastructure Node' : 'Broadcast New Network Slot'}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="p-10 space-y-12">
          <input type="hidden" name="ntwrkId" defaultValue={editingItem?.ntwrkId} />

          <div className="space-y-10">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Cluster Nomenclature</label>
              <input name="manageIem" type="text" defaultValue={editingItem?.manageIem} className="w-full h-16 rounded-2xl border-2 text-xl font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" required placeholder="CLUSTER IDENTITY" />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Virtual IPv4</label>
                <input name="ntwrkIp" type="text" defaultValue={editingItem?.ntwrkIp} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="0.0.0.0" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Gateway Logic</label>
                <input name="gtwy" type="text" defaultValue={editingItem?.gtwy} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="0.0.0.0" />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Subnet Mask</label>
                <input name="subnet" type="text" defaultValue={editingItem?.subnet} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="255.255.255.0" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Domain Server</label>
                <input name="domnServer" type="text" defaultValue={editingItem?.domnServer} className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="DNS POINT" />
              </div>
              <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Primary Operator</label>
                <input name="userNm" type="text" defaultValue={editingItem?.userNm} className="w-full h-14 rounded-xl border-2 text-sm font-black italic px-4 focus:ring-4 focus:ring-primary/10 transition-all" required placeholder="CONTROLLER NAME" />
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2">Node Activation State</label>
              <div className="flex gap-4">
                <label className="flex-1 cursor-pointer group">
                  <input type="radio" name="useAt" value="Y" defaultChecked={editingItem?.useAt !== 'N'} className="hidden peer" />
                  <div className="h-16 rounded-2xl border-2 border-slate-100 flex items-center justify-center gap-3 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all">
                    <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Live Infra</span>
                  </div>
                </label>
                <label className="flex-1 cursor-pointer group">
                  <input type="radio" name="useAt" value="N" defaultChecked={editingItem?.useAt === 'N'} className="hidden peer" />
                  <div className="h-16 rounded-2xl border-2 border-slate-100 flex items-center justify-center gap-3 peer-checked:bg-slate-900 peer-checked:text-white peer-checked:border-slate-900 transition-all">
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                    <span className="text-[11px] font-black uppercase tracking-widest italic">Deactivated</span>
                  </div>
                </label>
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
    primary: "bg-white text-primary border-primary/5 shadow-xl shadow-primary/5",
    indigo: "bg-indigo-600 text-white border-indigo-700 shadow-2xl shadow-indigo-600/20",
    slate: "bg-white text-slate-900 border-slate-100 shadow-xl shadow-slate-900/5"
  };

  const iconBgMap: any = {
    emerald: "bg-emerald-50 shadow-inner",
    primary: "bg-primary/5 shadow-inner",
    indigo: "bg-white/10",
    slate: "bg-slate-900 text-white"
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
        <div className="w-8 h-8 rounded-lg bg-slate-50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all border border-slate-100">
          <ArrowUpRight size={14} className="text-slate-400" />
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
