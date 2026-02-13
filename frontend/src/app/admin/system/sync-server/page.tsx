'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { syncService, SyncServer } from '@/services/syncService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { RefreshCw, Server, FolderSync, Clock, Play } from 'lucide-react';

export default function SyncServerPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<SyncServer[]>([]);
  const [loading, setLoading] = useState(true);

  const loadData = async () => {
    try {
      setLoading(true);
      const res = await syncService.getSyncServers();
      if (res.success) setData(res.data || []);
    } catch (error) {
      toast('동기화 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSync = async (id: string) => {
    const isConfirmed = await confirm({
      title: '서버 동기화 실행',
      message: '해당 서버로의 데이터 동기화를 지금 진행하시겠습니까?',
      confirmText: '동기화 시작'
    });

    if (isConfirmed) {
      try {
        await syncService.executeSync(id);
        toast('동기화 요청이 완료되었습니다.', 'success');
        loadData();
      } catch (error) {
        toast('동기화 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const columns = [
    { header: '서버명', accessor: 'serverNm', className: 'font-black' },
    { header: 'IP 주소', accessor: 'serverIp', className: 'font-mono text-xs text-muted-foreground' },
    { header: '동기화 경로', accessor: 'targetDrctry', className: 'text-xs italic' },
    { header: '동기화 상태', accessor: (item: SyncServer) => <StatusBadge status={item.syncAt} /> },
    { header: '최종 동기화', accessor: 'syncDt', className: 'text-[10px] text-muted-foreground' },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: SyncServer) => (
        <button 
          onClick={() => handleSync(item.serverId)}
          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all"
          title="동기화 실행"
        >
          <Play size={16} fill="currentColor" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="서버 데이터 동기화 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '서버동기화' }]}
        actions={
          <button onClick={loadData} className="flex items-center gap-2 px-4 py-2 border rounded-xl font-bold hover:bg-accent transition-all">
            <RefreshCw size={16} /> 새로고침
          </button>
        }
      />

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <FolderSync size={14} /> 동기화 대상 노드
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={data} 
          loading={loading}
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}
