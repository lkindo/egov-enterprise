'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { monitoringAdminService, NtwrkSvcMntrng } from '@/services/admin/system/MonitoringAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Network, Plus, Trash2, PlayCircle, Clock, Server, ArrowRight, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';

export function NetworkServiceMonitor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<NtwrkSvcMntrng[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<NtwrkSvcMntrng>>({
    sysNm: '',
    sysIp: '',
    sysPort: 80
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await monitoringAdminService.getNtwrkSvcMntrngList({ page: 0, size: 50 })) as any;
      setData(res.content || res.data?.content || []);
    } catch (error) {
      toast('네트워크 서비스 모니터링 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheck = async (ip: string, port: number) => {
    try {
      setLoading(true);
      await monitoringAdminService.checkNtwrkSvcStatus(ip, port);
      toast('포트 바인딩 및 패킷 도달 확인 완료.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (ip: string, port: number) => {
    if (!confirm('해당 네트워크 포트 모니터링을 해제하시겠습니까?')) return;
    try {
      await monitoringAdminService.deleteNtwrkSvcMntrng(ip, port);
      toast('정상적으로 해제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringAdminService.createNtwrkSvcMntrng(formData);
      toast('신규 네트워크 포트 노드가 등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns: ColumnDef<NtwrkSvcMntrng>[] = [
    {
      id: 'sysNm',
      header: 'Protocol Identity',
      width: 250,
      accessor: (item: NtwrkSvcMntrng) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:bg-primary transition-all">
            <Network size={16} />
          </div>
          <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">{item.sysNm}</span>
        </div>
      )
    },
    {
      id: 'sysIp',
      header: 'Network Intersection',
      width: 250,
      accessor: (item: NtwrkSvcMntrng) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black italic uppercase text-slate-400">Target IPv4</span>
            <span className="text-[10px] font-mono font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded-md border border-slate-200">{item.sysIp}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black italic uppercase text-slate-400">Service Port</span>
            <span className="text-xs font-mono font-black text-primary">{item.sysPort}</span>
          </div>
        </div>
      )
    },
    {
      id: 'mntrngSttus',
      header: 'Packet Reachability',
      width: 180,
      accessor: (item: NtwrkSvcMntrng) => (
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", item.mntrngSttus === '01' ? "bg-emerald-400" : "bg-rose-400")}></span>
            <span className={cn("relative inline-flex rounded-full h-2 w-2", item.mntrngSttus === '01' ? "bg-emerald-500" : "bg-rose-500")}></span>
          </div>
          <span className={cn("text-[9px] font-black uppercase tracking-widest italic", item.mntrngSttus === '01' ? "text-emerald-600" : "text-rose-600 font-bold")}>
            {item.mntrngSttus === '01' ? 'ESTABLISHED / UP' : 'TIMEOUT / CLOSED'}
          </span>
        </div>
      )
    },
    {
      id: 'creatDt',
      header: 'Probe Timestamp',
      accessor: (item: NtwrkSvcMntrng) => (
        <div className="flex items-center gap-2 text-[10px] font-mono font-black text-slate-400 italic tabular-nums">
          <Clock size={12} className="opacity-30" /> {item.creatDt}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Network Action',
      className: 'text-right',
      accessor: (item: NtwrkSvcMntrng) => (
        <div className="flex justify-end gap-2 pr-4">
          <button
            onClick={() => handleCheck(item.sysIp, item.sysPort)}
            className="h-10 w-10 bg-primary/5 text-primary hover:text-white hover:bg-primary hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-primary/10"
            title="연결 확인"
          >
            <PlayCircle size={16} className="fill-current" />
          </button>
          <button
            onClick={() => handleDelete(item.sysIp, item.sysPort)}
            className="h-10 w-10 bg-slate-50 text-slate-400 hover:text-rose-600 hover:bg-white hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-transparent hover:border-rose-100"
          >
            <Trash2 size={16} />
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex justify-end">
        <Button
          onClick={() => setIsModalOpen(true)}
          className="h-14 px-8 bg-slate-900 text-white rounded-2xl font-black italic uppercase tracking-widest text-[10px] shadow-2xl shadow-slate-900/20 hover:-translate-y-1 transition-all active:scale-95 flex items-center gap-3 border border-white/10"
        >
          <Plus size={18} /> Establish New Port Probe
        </Button>
      </div>

      <div className="bg-white/50 rounded-[3rem] p-4 border border-slate-100 shadow-xl">
        <UltimateDataGrid
          title="NETWORK PROTOCOL INTERFACE MATRIX"
          columns={columns as any}
          data={data as any}
          loading={loading}
          keyField="sysIp"
          className="rounded-[2.5rem] border-none"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Broadcast New Port Audit Node"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="p-10 space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Protocol Identity Alias</label>
            <input className="w-full h-16 rounded-2xl border-2 text-xl font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" value={formData.sysNm} onChange={e => setFormData({ ...formData, sysNm: e.target.value })} required placeholder="SYSTEM ALIAS" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">IPv4 Configuration</label>
              <input className="w-full h-14 rounded-xl border-2 text-xs font-mono font-bold px-4 focus:ring-4 focus:ring-primary/10 transition-all" value={formData.sysIp} onChange={e => setFormData({ ...formData, sysIp: e.target.value })} required placeholder="0.0.0.0" />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 block">Service Bind Port</label>
              <input type="number" className="w-full h-14 rounded-xl border-2 text-center text-xl font-black px-4 focus:ring-4 focus:ring-primary/10 transition-all text-primary" value={formData.sysPort} onChange={e => setFormData({ ...formData, sysPort: parseInt(e.target.value) })} required />
            </div>
          </div>

          <div className="flex gap-4 pt-4 text-center">
            <div className="flex-1 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 hover:bg-slate-100 transition-colors group cursor-default">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Protocol</p>
              <p className="text-xs font-black italic text-slate-900 group-hover:text-primary transition-colors">TCP / IP STACK</p>
            </div>
            <div className="flex-1 p-6 bg-slate-50 rounded-2xl border border-slate-100 space-y-1 hover:bg-slate-100 transition-colors group cursor-default">
              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Method</p>
              <p className="text-xs font-black italic text-slate-900 group-hover:text-primary transition-colors">PORT AUDIT</p>
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">Abort</Button>
            <Button type="submit" className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 border border-white/10">
              <ShieldCheck size={18} /> Establish Probe Interface
            </Button>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}
