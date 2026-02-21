'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { monitoringService, HttpMon } from '@/services/monitoringService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Globe, Plus, Trash2, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';

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
      const res = await monitoringService.getHttpMonList({ page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
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
      await monitoringService.checkHttpStatus(id);
      toast('상태 확인이 완료되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await monitoringService.deleteHttpMon(id);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringService.createHttpMon(formData);
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
      accessor: (item: HttpMon) => item.sysNm, 
      className: 'font-bold' 
    },
    { 
      header: 'URL', 
      accessor: (item: HttpMon) => item.siteUrl, 
      className: 'text-xs text-blue-600 underline cursor-pointer' 
    },
    {
      header: '상태코드',
      accessor: (item: HttpMon) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-bold",
          item.httpSttusCd === '200' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {item.httpSttusCd || 'N/A'}
        </span>
      )
    },
    { 
      header: '최근확인', 
      accessor: (item: HttpMon) => item.creatDt, 
      className: 'text-xs text-muted-foreground' 
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: HttpMon) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleCheck(item.sysId)} title="상태확인">
            <PlayCircle size={14} className="text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.sysId)} className="text-destructive">
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
          <Plus size={14} /> 모니터링 대상 등록
        </Button>
      </div>
      <StandardDataTable 
        columns={columns} 
        data={data} 
        loading={loading}
        className="border rounded-xl"
      />

      <StandardModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="HTTP 모니터링 등록">
        <StandardForm onSubmit={handleCreate}>
          <FormField label="시스템명" required>
            <input 
              className="w-full border rounded-md h-10 px-3" 
              value={formData.sysNm} 
              onChange={e => setFormData({...formData, sysNm: e.target.value})} 
            />
          </FormField>
          <FormField label="URL" required>
            <input 
              className="w-full border rounded-md h-10 px-3" 
              value={formData.siteUrl} 
              onChange={e => setFormData({...formData, siteUrl: e.target.value})} 
            />
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
