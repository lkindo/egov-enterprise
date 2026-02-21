'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { syncService, SyncServer } from '@/services/syncService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { RefreshCw, Server, FolderSync, Clock, Play, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { SyncServerForm } from '@/components/admin/system/SyncServerForm';

export default function SyncServerPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [data, setData] = useState<SyncServer[]>([]);
  const [loading, setLoading] = useState(true);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedServer, setSelectedServer] = useState<SyncServer | undefined>(undefined);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      const res = await syncService.getSyncServers();
      if (res.success) setData(res.data || []);
    } catch (error) {
      toast('동기화 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedServer(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (server: SyncServer) => {
    setMode('edit');
    setSelectedServer(server);
    setIsModalOpen(true);
  };

  const handleSubmit = async (formData: Partial<SyncServer>) => {
    try {
      if (mode === 'create') {
        await syncService.createSyncServer(formData);
        toast('신규 동기화 서버가 등록되었습니다.', 'success');
      } else {
        await syncService.updateSyncServer(selectedServer!.serverId, formData);
        toast('동기화 서버 정보가 수정되었습니다.', 'success');
      }
      setIsModalOpen(false);
      loadData();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    const isConfirmed = await confirm({
      title: '서버 삭제',
      message: '해당 동기화 서버 설정을 삭제하시겠습니까?',
      variant: 'destructive'
    });

    if (isConfirmed) {
      try {
        await syncService.deleteSyncServer(id);
        toast('삭제되었습니다.', 'success');
        loadData();
      } catch (error) {
        toast('삭제 중 오류가 발생했습니다.', 'error');
      }
    }
  };

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
    { 
      header: '서버명', 
      accessor: (item: SyncServer) => item.serverNm, 
      className: 'font-black' 
    },
    { 
      header: 'IP 주소', 
      accessor: (item: SyncServer) => item.serverIp, 
      className: 'font-mono text-xs text-muted-foreground' 
    },
    { 
      header: '동기화 경로', 
      accessor: (item: SyncServer) => item.targetDrctry, 
      className: 'text-xs italic' 
    },
    { header: '동기화 상태', accessor: (item: SyncServer) => <StatusBadge status={item.syncAt} /> },
    { 
      header: '최종 동기화', 
      accessor: (item: SyncServer) => item.syncDt, 
      className: 'text-[10px] text-muted-foreground' 
    },
    {
      header: '관리',
      className: 'text-right',
      accessor: (item: SyncServer) => (
        <div className="flex justify-end gap-1">
          <button 
            onClick={() => handleSync(item.serverId)}
            className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all"
            title="동기화 실행"
          >
            <Play size={16} fill="currentColor" />
          </button>
          <button onClick={() => handleOpenEdit(item)} className="p-2 hover:bg-accent rounded-lg text-muted-foreground"><Edit size={16} /></button>
          <button onClick={() => handleDelete(item.serverId)} className="p-2 hover:bg-destructive/10 rounded-lg text-destructive"><Trash2 size={16} /></button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="서버 데이터 동기화 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '서버동기화' }]}
        actions={
          <div className="flex gap-2">
            <Button variant="outline" onClick={loadData} className="rounded-full gap-2">
              <RefreshCw size={16} /> 새로고침
            </Button>
            <Button onClick={handleOpenCreate} className="rounded-full gap-2">
              <Plus size={16} /> 서버 추가
            </Button>
          </div>
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

      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? '신규 동기화 서버 등록' : '서버 정보 수정'}
        maxWidth="md"
      >
        <SyncServerForm 
          initialData={selectedServer} 
          onSubmit={handleSubmit} 
          onCancel={() => setIsModalOpen(false)} 
        />
      </StandardModal>
    </div>
  );
}
