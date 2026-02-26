'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { monitoringService, ProcessMon } from '@/services/monitoringService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Cpu, Plus, Trash2, PlayCircle, Clock, Server, Terminal, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';

export function ProcessMonitor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<ProcessMon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<ProcessMon>>({
    processNm: '',
    serverNm: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const result = await monitoringService.getProcessMonList({ page: 0, size: 50 });
      setData((result as any)?.content || (result as any)?.data?.content || []);
    } catch (error) {
      toast('프로세스 모니터링 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheck = async (id: string) => {
    try {
      setLoading(true);
      await monitoringService.checkProcessStatus(id);
      toast('런타임 프로세스 생존 주기 확인 완료.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('해당 프로세스 감사 관제를 해제하시겠습니까?')) return;
    try {
      await monitoringService.deleteProcessMon(id);
      toast('정상적으로 해제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringService.createProcessMon(formData);
      toast('신규 프로세스 감사 노드가 등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns: ColumnDef<ProcessMon>[] = [
    { 
      id: 'processNm',
      header: 'Process Binary', 
      width: 250,
      accessor: (item: ProcessMon) => (
        <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:bg-primary transition-all">
                <Terminal size={16} />
            </div>
            <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter font-mono">{item.processNm}</span>
        </div>
      )
    },
    { 
      id: 'serverNm',
      header: 'Host Infrastructure', 
      width: 200,
      accessor: (item: ProcessMon) => (
        <div className="flex items-center gap-2">
            <Server size={14} className="text-slate-300" />
            <span className="text-xs font-black text-slate-500 italic uppercase tracking-tight">{item.serverNm}</span>
        </div>
      )
    },
    { 
      id: 'procsSttus',
      header: 'Execution State', 
      width: 150,
      accessor: (item: ProcessMon) => (
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", item.procsSttus === '01' ? "bg-emerald-400" : "bg-rose-400")}></span>
            <span className={cn("relative inline-flex rounded-full h-2 w-2", item.procsSttus === '01' ? "bg-emerald-500" : "bg-rose-500")}></span>
          </div>
          <span className={cn("text-[9px] font-black uppercase tracking-widest italic", item.procsSttus === '01' ? "text-emerald-600" : "text-rose-600 font-bold")}>
            {item.procsSttus === '01' ? 'RUNNING / PASS' : 'CRITICAL / STOP'}
          </span>
        </div>
      )
    },
    { 
      id: 'creatDt',
      header: 'Runtime Snapshot', 
      accessor: (item: ProcessMon) => (
        <div className="flex items-center gap-2 text-[10px] font-mono font-black text-slate-400 italic tabular-nums">
            <Clock size={12} className="opacity-30" /> {item.creatDt}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Runtime Action',
      className: 'text-right',
      accessor: (item: ProcessMon) => (
        <div className="flex justify-end gap-2 pr-4">
          <button 
            onClick={() => handleCheck(item.processNm)} 
            className="h-10 w-10 bg-primary/5 text-primary hover:text-white hover:bg-primary hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-primary/10"
            title="상태 확인"
          >
            <PlayCircle size={16} className="fill-current" />
          </button>
          <button 
            onClick={() => handleDelete(item.processNm)} 
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
          <Plus size={18} /> Establish New Runtime Audit
        </Button>
      </div>

      <div className="bg-white/50 rounded-[3rem] p-4 border border-slate-100 shadow-xl">
          <UltimateDataGrid 
            title="CORE RUNTIME PROCESS AUDIT MATRIX" 
            columns={columns as any} 
            data={data as any} 
            loading={loading}
            keyField="processNm"
            className="rounded-[2.5rem] border-none"
          />
      </div>

      <StandardModal 
        isOpen={isModalOpen} 
        onClose={() => setIsModalOpen(false)} 
        title="Broadcast New Runtime Audit Node"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="p-10 space-y-10">
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Process Binary Identity</label>
                <div className="relative">
                    <Terminal size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input className="w-full h-16 rounded-2xl border-2 text-xl font-mono font-black pl-12 pr-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" value={formData.processNm} onChange={e => setFormData({...formData, processNm: e.target.value})} required placeholder="java, nginx, postgres" />
                </div>
            </div>
            <div className="space-y-4">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Host Infrastructure</label>
                <div className="relative">
                    <Server size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-300" />
                    <input className="w-full h-16 rounded-2xl border-2 text-sm font-black uppercase pl-12 pr-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner italic" value={formData.serverNm} onChange={e => setFormData({...formData, serverNm: e.target.value})} required placeholder="HOSTNAME / CLUSTER ID" />
                </div>
            </div>

            <div className="flex gap-4 pt-4">
                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">Abort</Button>
                <Button type="submit" className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 border border-white/10">
                    <ShieldCheck size={18} /> Deploy Runtime Audit
                </Button>
            </div>
        </form>
      </StandardModal>
    </div>
  );
}
