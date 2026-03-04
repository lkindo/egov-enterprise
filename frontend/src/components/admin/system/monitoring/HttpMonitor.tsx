'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { monitoringAdminService, HttpMon } from '@/services/admin/system/MonitoringAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Globe, Plus, Trash2, PlayCircle, Clock, ExternalLink, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';

export function HttpMonitor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<HttpMon[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<HttpMon>>({
    sysNm: '',
    siteUrl: 'http://',
    webKind: 'HOMEPAGE'
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = (await monitoringAdminService.getHttpMonList({ page: 0, size: 50 })) as any;
      setData(res.content || res.data?.content || []);
    } catch (error) {
      toast('HTTP 모니터링 정보를 불러오지 못했습니다.', 'error');
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
      await monitoringAdminService.checkHttpStatus(id);
      toast('엔드포인트 상태 확인이 완료되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('해당 모니터링 대상을 제거하시겠습니까?')) return;
    try {
      await monitoringAdminService.deleteHttpMon(id);
      toast('정상적으로 제거되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('제거 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringAdminService.createHttpMon(formData);
      toast('신규 모니터링 대상이 등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns: ColumnDef<HttpMon>[] = [
    {
      id: 'sysNm',
      header: 'Endpoint Identity',
      width: 250,
      accessor: (item: HttpMon) => (
        <div className="flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-lg group-hover:bg-primary transition-all">
            <Globe size={16} />
          </div>
          <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">{item.sysNm}</span>
        </div>
      )
    },
    {
      id: 'siteUrl',
      header: 'Service Address',
      width: 300,
      accessor: (item: HttpMon) => (
        <a
          href={item.siteUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="group/link flex items-center gap-2 text-xs font-mono font-bold text-slate-400 hover:text-primary transition-colors italic bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-100"
        >
          {item.siteUrl}
          <ExternalLink size={10} className="opacity-0 group-hover/link:opacity-100 transition-opacity" />
        </a>
      )
    },
    {
      id: 'httpSttusCd',
      header: 'Response Protocol',
      width: 150,
      accessor: (item: HttpMon) => (
        <div className="flex items-center gap-3">
          <div className={cn(
            "px-4 py-1.5 rounded-xl text-[10px] font-black italic tracking-widest border-2",
            item.httpSttusCd === '200'
              ? "bg-emerald-50 text-emerald-600 border-emerald-100 shadow-[0_0_10px_rgba(16,185,129,0.1)]"
              : "bg-rose-50 text-rose-600 border-rose-100 shadow-[0_0_10px_rgba(225,29,72,0.1)]"
          )}>
            {item.httpSttusCd === '200' ? "HTTP STATUS 200 OK" : `ERR: ${item.httpSttusCd || 'N/A'}`}
          </div>
        </div>
      )
    },
    {
      id: 'creatDt',
      header: 'Last Verification',
      accessor: (item: HttpMon) => (
        <div className="flex items-center gap-2 text-[10px] font-mono font-black text-slate-400 italic tabular-nums">
          <Clock size={12} className="opacity-30" /> {item.creatDt}
        </div>
      )
    },
    {
      id: 'actions',
      header: 'Edge Control',
      className: 'text-right',
      accessor: (item: HttpMon) => (
        <div className="flex justify-end gap-2 pr-4">
          <button
            onClick={() => handleCheck(item.sysId)}
            className="h-10 w-10 bg-primary/5 text-primary hover:text-white hover:bg-primary hover:shadow-xl transition-all rounded-xl flex items-center justify-center border border-primary/10"
            title="상태 확인"
          >
            <PlayCircle size={16} className="fill-current" />
          </button>
          <button
            onClick={() => handleDelete(item.sysId)}
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
          <Plus size={18} /> Establish New Edge Node
        </Button>
      </div>

      <div className="bg-white/50 rounded-[3rem] p-4 border border-slate-100 shadow-xl">
        <UltimateDataGrid
          title="HTTP SERVICE CONNECTIVITY MATRIX"
          columns={columns as any}
          data={data as any}
          loading={loading}
          keyField="sysId"
          className="rounded-[2.5rem] border-none"
        />
      </div>

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Establish Hyper-Sync Monitoring Node"
        maxWidth="md"
      >
        <form onSubmit={handleCreate} className="p-10 space-y-10">
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Endpoint Identity</label>
            <input
              className="w-full h-16 rounded-2xl border-2 text-xl font-black px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              placeholder="SYSTEM NAME"
              value={formData.sysNm}
              onChange={e => setFormData({ ...formData, sysNm: e.target.value })}
              required
            />
          </div>
          <div className="space-y-4">
            <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] italic px-2">Protocol URI</label>
            <input
              className="w-full h-16 rounded-2xl border-2 text-sm font-mono font-bold px-6 focus:ring-4 focus:ring-primary/10 transition-all shadow-inner"
              placeholder="http://example.com"
              value={formData.siteUrl}
              onChange={e => setFormData({ ...formData, siteUrl: e.target.value })}
              required
            />
          </div>

          <div className="flex gap-4 pt-4">
            <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1 h-16 rounded-2xl font-black uppercase text-[10px] tracking-widest border-2">Abort</Button>
            <Button type="submit" className="flex-[2] h-16 rounded-2xl bg-slate-900 text-white font-black shadow-2xl shadow-slate-900/20 italic uppercase tracking-[0.2em] text-[10px] flex items-center justify-center gap-3 hover:-translate-y-1 transition-all active:scale-95 border border-white/10">
              Deploy Monitoring Protocol
            </Button>
          </div>
        </form>
      </StandardModal>
    </div>
  );
}
