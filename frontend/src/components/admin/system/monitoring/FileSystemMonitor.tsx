'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { monitoringAdminService, FileSysMntrng } from '@/services/admin/system/MonitoringAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { HardDrive, Plus, Trash2, PlayCircle, Clock, FolderOpen, AlertCircle, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';

export function FileSystemMonitor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<FileSysMntrng[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<FileSysMntrng>>({
    fileSysNm: '',
    fileSysManageNm: '',
    fileSysSize: 0,
    fileSysThrhld: 90
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await monitoringAdminService.getFileSysMntrngList({ page: 0, size: 50 })) as any;
      setData(res.content || res.data?.content || []);
    } catch (error) {
      toast('파일시스템 모니터링 정보를 불러오지 못했습니다.', 'error');
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
      await monitoringAdminService.checkFileSysStatus(id);
      toast('디스크 I/O 및 용량 동기화 완료.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('해당 볼륨 모니터링을 해제하시겠습니까?')) return;
    try {
      await monitoringAdminService.deleteFileSysMntrng(id);
      toast('정상적으로 해제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringAdminService.createFileSysMntrng(formData);
      toast('신규 볼륨이 모니터링 대상으로 등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns: ColumnDef<FileSysMntrng>[] = [
    {
      id: 'fileSysNm',
      header: 'Volume Alias',
      width: 250,
      accessor: (item: FileSysMntrng) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:bg-primary transition-all">
            <HardDrive size={16} />
          </div>
          <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">{item.fileSysNm}</span>
        </div>
      )
    },
    {
      id: 'fileSysManageNm',
      header: 'Mount Endpoint',
      width: 200,
      accessor: (item: FileSysMntrng) => (
        <div className="flex items-center gap-2">
          <FolderOpen size={14} className="text-slate-300" />
          <span className="text-xs font-mono font-black text-slate-500 italic lowercase tracking-tight">{item.fileSysManageNm}</span>
        </div>
      )
    },
    {
      id: 'usage',
      header: 'Occupancy Distribution',
      width: 300,
      accessor: (item: FileSysMntrng) => {
        const usage = item.fileSysSize > 0 ? (item.fileSysUsgQty / item.fileSysSize) * 100 : 0;
        const isCritical = usage > item.fileSysThrhld;
        return (
          <div className="flex flex-col gap-2 py-2 w-full max-w-[240px]">
            <div className="flex justify-between items-center px-1">
              <span className="text-[10px] font-black italic uppercase text-slate-400 tabular-nums">Used {item.fileSysUsgQty} / Total {item.fileSysSize} GB</span>
              <span className={cn("text-xs font-black tabular-nums italic", isCritical ? "text-rose-600 animate-pulse" : "text-slate-900")}>
                {usage.toFixed(1)}%
              </span>
            </div>
            <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-200/50">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-1000",
                  isCritical ? "bg-gradient-to-r from-rose-500 to-rose-400" : "bg-gradient-to-r from-blue-500 to-blue-400"
                )}
                style={{ width: `${Math.min(usage, 100)}%` }}
              />
            </div>
          </div>
        );
      }
    },
    {
      id: 'mntrngSttus',
      header: 'Volume Integrity',
      width: 150,
      accessor: (item: FileSysMntrng) => (
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", item.mntrngSttus === '01' ? "bg-emerald-400" : "bg-rose-400")}></span>
            <span className={cn("relative inline-flex rounded-full h-2 w-2", item.mntrngSttus === '01' ? "bg-emerald-500" : "bg-rose-500")}></span>
          </div>
          <span className={cn("text-[9px] font-black uppercase tracking-widest italic", item.mntrngSttus === '01' ? "text-emerald-600" : "text-rose-600")}>
            {item.mntrngSttus === '01' ? 'OPTIMAL' : 'CRITICAL'}
          </span>
        </div>
      )
    },
    {
      id: 'creatDt',
      header: 'I/O Snapshot',
      accessor: (item: FileSysMntrng) => (
        <div className="flex items-center gap-2 text-[10px] font-mono font-black text-slate-400 italic tabular-nums">
          <Clock size={12} className="opacity-30" /> {item.creatDt}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Volume Action',
      className: 'text-right',
      accessor: (item: FileSysMntrng) => (
        <div className="flex justify-end gap-2 pr-4">
          <button
            onClick={() => handleCheck(item.fileSysId)}
            className="h-10 w-10 bg-primary/5 text-primary hover:text-white hover:bg-primary hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-primary/10"
            title="상태 확인"
          >
            <PlayCircle size={16} className="fill-current" />
          </button>
          <button
            onClick={() => handleDelete(item.fileSysId)}
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
          <Plus size={18} /> Establish New Storage Node
        </Button>
      </div>

      <div className="bg-white/50 rounded-[3rem] p-4 border border-slate-100 shadow-xl">
        <UltimateDataGrid
          title="STORAGE INFRASTRUCTURE MONITOR MATRIX"
          columns={columns as any}
          data={data as any}
          loading={loading}
          keyField="fileSysId"
          className="rounded-[2.5rem] border-none"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Broadcast New Volume Interface"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="p-10 space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Volume Nomenclature</label>
            <input className="w-full h-16 rounded-2xl border-2 text-xl font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner" value={formData.fileSysNm} onChange={e => setFormData({ ...formData, fileSysNm: e.target.value })} required placeholder="VOLUME IDENTITY" />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Mount Endpoint Route</label>
            <input className="w-full h-16 rounded-2xl border-2 text-sm font-mono font-bold px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner italic" value={formData.fileSysManageNm} onChange={e => setFormData({ ...formData, fileSysManageNm: e.target.value })} required placeholder="/var/data" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 p-8 bg-slate-50/50 rounded-[2.5rem] border border-dashed border-slate-200">
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-center block">Capacity (GB)</label>
              <input type="number" className="w-full h-14 rounded-xl border-2 text-center text-xl font-black px-4 focus:ring-4 focus:ring-primary/10 transition-all" value={formData.fileSysSize} onChange={e => setFormData({ ...formData, fileSysSize: parseInt(e.target.value) })} required />
            </div>
            <div className="space-y-4">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-2 text-center block">Threshold (%)</label>
              <input type="number" className="w-full h-14 rounded-xl border-2 text-center text-xl font-black px-4 focus:ring-4 focus:ring-primary/10 transition-all text-rose-600" value={formData.fileSysThrhld} onChange={e => setFormData({ ...formData, fileSysThrhld: parseInt(e.target.value) })} required />
            </div>
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">Abort</Button>
            <Button type="submit" className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 border border-white/10">
              <ShieldCheck size={18} /> Establish Storage Interface
            </Button>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}
