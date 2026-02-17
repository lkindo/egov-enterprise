'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { monitoringService, ProcessMon } from '@/services/monitoringService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Cpu, Plus, Trash2, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';

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
      const res = await monitoringService.getProcessMonList({ page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
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
      await monitoringService.checkProcessStatus(id);
      toast('프로세스 상태 확인 완료.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await monitoringService.deleteProcessMon(id);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringService.createProcessMon(formData);
      toast('등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns = [
    { header: '프로세스명', accessor: 'processNm', className: 'font-bold font-mono text-primary' },
    { header: '서버명', accessor: 'serverNm', className: 'text-xs' },
    { 
      header: '상태', 
      accessor: (item: ProcessMon) => (
        <div className="flex items-center gap-1">
          {item.procsSttus === '01' ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          <span className={cn("text-xs font-bold", item.procsSttus === '01' ? "text-green-700" : "text-red-700")}>
            {item.procsSttus === '01' ? '실행중' : '중지됨'}
          </span>
        </div>
      )
    },
    { header: '최근확인', accessor: 'creatDt', className: 'text-xs text-muted-foreground' },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: ProcessMon) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleCheck(item.processNm)} title="상태확인">
            <PlayCircle size={14} className="text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.processNm)} className="text-destructive">
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
          <Plus size={14} /> 프로세스 등록
        </Button>
      </div>
      <StandardDataTable 
        columns={columns} 
        data={data} 
        loading={loading}
        className="border rounded-xl"
      />

      <StandardModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="프로세스 모니터링 등록">
        <StandardForm onSubmit={handleCreate}>
          <FormField label="프로세스명" required>
            <input className="w-full border rounded-md h-10 px-3" value={formData.processNm} onChange={e => setFormData({...formData, processNm: e.target.value})} placeholder="java, nginx, postgres..." />
          </FormField>
          <FormField label="대상 서버" required>
            <input className="w-full border rounded-md h-10 px-3" value={formData.serverNm} onChange={e => setFormData({...formData, serverNm: e.target.value})} placeholder="Hostname" />
          </FormField>
          <div className="flex justify-end pt-4 gap-2">
            <Button variant="outline" onClick={() => setIsModalOpen(false)}>취소</Button>
            <Button type="submit">저장</Button>
          </div>
        </StandardForm>
      </StandardModal>
    </div>
  );
}
