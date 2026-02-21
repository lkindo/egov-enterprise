'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { monitoringService, NtwrkSvcMntrng } from '@/services/monitoringService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Network, Plus, Trash2, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';

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
      const res = await monitoringService.getNtwrkSvcMntrngList({ page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
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
      await monitoringService.checkNtwrkSvcStatus(ip, port);
      toast('포트 상태 확인 완료.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (ip: string, port: number) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await monitoringService.deleteNtwrkSvcMntrng(ip, port);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringService.createNtwrkSvcMntrng(formData);
      toast('등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns = [
    { 
      header: '시스템명', 
      accessor: (item: NtwrkSvcMntrng) => item.sysNm, 
      className: 'font-bold' 
    },
    { 
      header: 'IP 주소', 
      accessor: (item: NtwrkSvcMntrng) => item.sysIp, 
      className: 'font-mono text-xs' 
    },
    { 
      header: '포트', 
      accessor: (item: NtwrkSvcMntrng) => item.sysPort, 
      className: 'font-mono text-xs w-16' 
    },
    {
      header: '상태',
      accessor: (item: NtwrkSvcMntrng) => (
        <div className="flex items-center gap-1">
          {item.mntrngSttus === '01' ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          <span className={cn("text-xs font-bold", item.mntrngSttus === '01' ? "text-green-700" : "text-red-700")}>
            {item.mntrngSttus === '01' ? '연결성공' : '연결실패'}
          </span>
        </div>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: NtwrkSvcMntrng) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleCheck(item.sysIp, item.sysPort)} title="연결확인">
            <PlayCircle size={14} className="text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.sysIp, item.sysPort)} className="text-destructive">
            <Trash2 size={14} />
          </Button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={() => setIsModalOpen(true)} size="sm" className="gap-2">
          <Plus size={14} /> 네트워크 서비스 등록
        </Button>
      </div>
      <StandardDataTable 
        columns={columns} 
        data={data} 
        loading={loading}
        className="border rounded-xl"
      />

      <StandardModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="네트워크 서비스(Port) 모니터링 등록">
        <StandardForm onSubmit={handleCreate}>
          <FormField label="시스템명" required>
            <input className="w-full border rounded-md h-10 px-3" value={formData.sysNm} onChange={e => setFormData({...formData, sysNm: e.target.value})} placeholder="예: 메일서버 SMTP" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="IP 주소" required>
              <input className="w-full border rounded-md h-10 px-3" value={formData.sysIp} onChange={e => setFormData({...formData, sysIp: e.target.value})} placeholder="127.0.0.1" />
            </FormField>
            <FormField label="포트" required>
              <input type="number" className="w-full border rounded-md h-10 px-3" value={formData.sysPort} onChange={e => setFormData({...formData, sysPort: parseInt(e.target.value)})} placeholder="25" />
            </FormField>
          </div>
          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>취소</Button>
            <Button type="submit">저장</Button>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}
