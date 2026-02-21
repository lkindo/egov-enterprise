'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { monitoringService, DbMntrng } from '@/services/monitoringService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Database, Plus, Trash2, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';

export function DbMonitor() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState<DbMntrng[]>([]);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [formData, setFormData] = useState<Partial<DbMntrng>>({
    dataSourcNm: '',
    serverNm: '',
    dbmsKind: '',
    dbmsIp: '',
    dbmsPort: 3306,
    dbmsId: '',
    dbmsPw: ''
  });

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await monitoringService.getDbMntrngList({ page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
    } catch (error) {
      toast('DB 모니터링 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCheck = async (id: string) => {
    try {
      await monitoringService.checkDbStatus(id);
      toast('DB 연결 상태 확인 완료.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await monitoringService.deleteDbMntrng(id);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringService.createDbMntrng(formData);
      toast('등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns = [
    { 
      header: '데이터소스명', 
      accessor: (item: DbMntrng) => item.dataSourcNm, 
      className: 'font-bold' 
    },
    { 
      header: 'DBMS', 
      accessor: (item: DbMntrng) => item.dbmsKind, 
      className: 'text-xs uppercase font-mono' 
    },
    { header: 'IP/Port', accessor: (item: DbMntrng) => `${item.dbmsIp}:${item.dbmsPort}`, className: 'text-xs font-mono' },
    { 
      header: '상태', 
      accessor: (item: DbMntrng) => (
        <div className="flex items-center gap-1">
          {item.mntrngSttus === '01' ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          <span className={cn("text-xs font-bold", item.mntrngSttus === '01' ? "text-green-700" : "text-red-700")}>
            {item.mntrngSttus === '01' ? '정상' : '장애'}
          </span>
        </div>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: DbMntrng) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleCheck(item.dataSourcNm)} title="연결확인">
            <PlayCircle size={14} className="text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.dataSourcNm)} className="text-destructive">
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
          <Plus size={14} /> DB 모니터링 등록
        </Button>
      </div>
      <StandardDataTable 
        columns={columns} 
        data={data} 
        loading={loading}
        className="border rounded-xl"
      />

      <StandardModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="DB 모니터링 등록">
        <StandardForm onSubmit={handleCreate}>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="데이터소스명" required>
              <input className="w-full border rounded-md h-10 px-3" value={formData.dataSourcNm} onChange={e => setFormData({...formData, dataSourcNm: e.target.value})} />
            </FormField>
            <FormField label="DBMS 종류" required>
              <input className="w-full border rounded-md h-10 px-3" value={formData.dbmsKind} onChange={e => setFormData({...formData, dbmsKind: e.target.value})} placeholder="mysql, oracle..." />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="IP 주소" required>
              <input className="w-full border rounded-md h-10 px-3" value={formData.dbmsIp} onChange={e => setFormData({...formData, dbmsIp: e.target.value})} />
            </FormField>
            <FormField label="포트" required>
              <input type="number" className="w-full border rounded-md h-10 px-3" value={formData.dbmsPort} onChange={e => setFormData({...formData, dbmsPort: parseInt(e.target.value)})} />
            </FormField>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="계정 ID" required>
              <input className="w-full border rounded-md h-10 px-3" value={formData.dbmsId} onChange={e => setFormData({...formData, dbmsId: e.target.value})} />
            </FormField>
            <FormField label="비밀번호" required>
              <input type="password" className="w-full border rounded-md h-10 px-3" value={formData.dbmsPw} onChange={e => setFormData({...formData, dbmsPw: e.target.value})} />
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
