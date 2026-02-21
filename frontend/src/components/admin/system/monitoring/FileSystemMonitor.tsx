'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { monitoringService, FileSysMntrng } from '@/services/monitoringService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { HardDrive, Plus, Trash2, PlayCircle, CheckCircle2, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { FormField, StandardForm } from '@/app/components/ui/standard-form';

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
      const res = await monitoringService.getFileSysMntrngList({ page: 0, size: 50 });
      if (res.success) {
        setData(res.data.content || []);
      }
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
      await monitoringService.checkFileSysStatus(id);
      toast('디스크 상태 확인 완료.', 'success');
      loadData();
    } catch (error) {
      toast('상태 확인 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('삭제하시겠습니까?')) return;
    try {
      await monitoringService.deleteFileSysMntrng(id);
      toast('삭제되었습니다.', 'success');
      loadData();
    } catch (error) {
      toast('삭제 실패', 'error');
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await monitoringService.createFileSysMntrng(formData);
      toast('등록되었습니다.', 'success');
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('등록 실패', 'error');
    }
  };

  const columns = [
    { 
      header: '파일시스템명', 
      accessor: (item: FileSysMntrng) => item.fileSysNm, 
      className: 'font-bold' 
    },
    { 
      header: '마운트 경로', 
      accessor: (item: FileSysMntrng) => item.fileSysManageNm, 
      className: 'text-xs font-mono' 
    },
    { header: '전체 용량', accessor: (item: FileSysMntrng) => `${item.fileSysSize} GB`, className: 'text-xs' },
    { 
      header: '사용량', 
      accessor: (item: FileSysMntrng) => {
        const usage = item.fileSysSize > 0 ? (item.fileSysUsgQty / item.fileSysSize) * 100 : 0;
        return (
          <div className="flex flex-col gap-1 w-24">
            <div className="text-[10px] flex justify-between">
              <span>{item.fileSysUsgQty} GB</span>
              <span className={cn(usage > item.fileSysThrhld ? "text-red-500 font-bold" : "text-muted-foreground")}>{usage.toFixed(1)}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className={cn("h-full rounded-full", usage > item.fileSysThrhld ? "bg-red-500" : "bg-blue-500")} 
                style={{ width: `${Math.min(usage, 100)}%` }} 
              />
            </div>
          </div>
        );
      }
    },
    { 
      header: '상태', 
      accessor: (item: FileSysMntrng) => (
        <div className="flex items-center gap-1">
          {item.mntrngSttus === '01' ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          <span className={cn("text-xs font-bold", item.mntrngSttus === '01' ? "text-green-700" : "text-red-700")}>
            {item.mntrngSttus === '01' ? '정상' : '위험'}
          </span>
        </div>
      )
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: FileSysMntrng) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" onClick={() => handleCheck(item.fileSysId)} title="상태확인">
            <PlayCircle size={14} className="text-primary" />
          </Button>
          <Button variant="ghost" size="sm" onClick={() => handleDelete(item.fileSysId)} className="text-destructive">
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
          <Plus size={14} /> 파일시스템 등록
        </Button>
      </div>
      <StandardDataTable 
        columns={columns} 
        data={data} 
        loading={loading}
        className="border rounded-xl"
      />

      <StandardModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="파일시스템 모니터링 등록">
        <StandardForm onSubmit={handleCreate}>
          <FormField label="파일시스템명" required>
            <input className="w-full border rounded-md h-10 px-3" value={formData.fileSysNm} onChange={e => setFormData({...formData, fileSysNm: e.target.value})} placeholder="예: Root Disk, Data Disk" />
          </FormField>
          <FormField label="마운트 경로" required>
            <input className="w-full border rounded-md h-10 px-3" value={formData.fileSysManageNm} onChange={e => setFormData({...formData, fileSysManageNm: e.target.value})} placeholder="/, /mnt/data" />
          </FormField>
          <div className="grid grid-cols-2 gap-4">
            <FormField label="전체 용량 (GB)" required>
              <input type="number" className="w-full border rounded-md h-10 px-3" value={formData.fileSysSize} onChange={e => setFormData({...formData, fileSysSize: parseInt(e.target.value)})} />
            </FormField>
            <FormField label="임계치 (%)" required>
              <input type="number" className="w-full border rounded-md h-10 px-3" value={formData.fileSysThrhld} onChange={e => setFormData({...formData, fileSysThrhld: parseInt(e.target.value)})} />
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
