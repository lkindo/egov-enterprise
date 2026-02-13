'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { backupService, BackupOpert } from '@/services/backupService';
import { useToast } from '@/app/components/ui/toast';
import { Database, Save, Play, History, Calendar, Plus } from 'lucide-react';

export default function BackupAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [backups, setBackups] = useState<BackupOpert[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await backupService.getBackups({ page: 0, size: 20 });
      if (res.success) setBackups(res.data.content || []);
    } catch (error) {
      toast('백업 정책 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const columns = [
    { header: '백업 작업명', accessor: 'backupOpertNm', className: 'font-black text-primary' },
    { header: '원본 경로', accessor: 'backupOrginDrctry', className: 'text-xs text-muted-foreground italic' },
    { header: '백업 주기', accessor: (item: BackupOpert) => item.executCycle === '01' ? '매일' : '매주', className: 'text-xs font-bold' },
    { header: '실행 시간', accessor: (item: BackupOpert) => `${item.executSchdulHour}:${item.executSchdulMnt}`, className: 'font-mono text-xs' },
    { header: '사용여부', accessor: (item: BackupOpert) => <StatusBadge status={item.useAt} /> },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item: BackupOpert) => (
        <div className="flex justify-end gap-2">
          <button 
            onClick={() => toast('백업이 시작되었습니다.', 'success')}
            className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-all"
            title="즉시 실행"
          >
            <Play size={16} fill="currentColor" />
          </button>
          <button className="p-1.5 hover:bg-accent rounded-md text-muted-foreground"><History size={16} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader 
        title="백업 정책 및 자동화 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '백업관리' }]}
        actions={
          <button className="flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all">
            <Plus size={18} /> 새 백업 정책 추가
          </button>
        }
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Database size={14} /> 시스템 데이터 백업 목록
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={backups} 
          loading={loading}
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}
