'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardSearchFilter } from '@/app/components/ui/standard-search-filter';
import { backupService, BackupOpert, BackupResult } from '@/services/backupService';
import { useToast } from '@/app/components/ui/toast';
import { Database, Play, History, Plus, Trash2, Edit, CheckCircle2, XCircle, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { BackupForm } from '@/components/admin/system/BackupForm';

export default function BackupAdminPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('operations');
  const [operations, setOperations] = useState<BackupOpert[]>([]);
  const [results, setResults] = useState<BackupResult[]>([]);

  // 모달 상태
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [selectedOp, setSelectedOp] = useState<BackupOpert | undefined>(undefined);

  const loadOperations = useCallback(async () => {
    try {
      setLoading(true);
      const res = await backupService.getOperations({ page: 0, size: 50 });
      if (res.success) setOperations(res.data.content || []);
    } catch (error) {
      toast('백업 정책 정보를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  const loadResults = useCallback(async () => {
    try {
      setLoading(true);
      const res = await backupService.getResults({ page: 0, size: 50 });
      if (res.success) setResults(res.data.content || []);
    } catch (error) {
      toast('백업 실행 결과를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    if (activeTab === 'operations') loadOperations();
    else loadResults();
  }, [activeTab, loadOperations, loadResults]);

  const handleOpenCreate = () => {
    setMode('create');
    setSelectedOp(undefined);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (op: BackupOpert) => {
    setMode('edit');
    setSelectedOp(op);
    setIsModalOpen(true);
  };

  const handleSubmit = async (data: Partial<BackupOpert>) => {
    try {
      if (mode === 'create') {
        await backupService.createOperation(data);
        toast('신규 백업 정책이 등록되었습니다.', 'success');
      } else {
        await backupService.updateOperation(selectedOp!.backupOpertId, data);
        toast('백업 정책이 수정되었습니다.', 'success');
      }
      setIsModalOpen(false);
      loadOperations();
    } catch (error) {
      toast('저장 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('정말 삭제하시겠습니까?')) return;
    try {
      const res = await backupService.deleteOperation(id);
      if (res.success) {
        toast('백업 정책이 삭제되었습니다.', 'success');
        loadOperations();
      }
    } catch (error) {
      toast('삭제 중 오류가 발생했습니다.', 'error');
    }
  };

  const opColumns = [
    { 
      header: '백업 작업명', 
      accessor: (item: BackupOpert) => item.backupOpertNm, 
      className: 'font-black text-primary' 
    },
    { 
      header: '원본 경로', 
      accessor: (item: BackupOpert) => item.backupOrginlDrctry, 
      className: 'text-xs text-muted-foreground' 
    },
    { 
      header: '보관 경로', 
      accessor: (item: BackupOpert) => item.backupStreDrctry, 
      className: 'text-xs text-muted-foreground' 
    },
    {
      header: '주기',
      accessor: (item: BackupOpert) => (
        <span className="px-2 py-0.5 bg-muted rounded text-[10px] font-bold uppercase">
          {item.executCycle === '01' ? '매일' : item.executCycle === '02' ? '매주' : '기타'}
        </span>
      )
    },
    { header: '시간', accessor: (item: BackupOpert) => `${item.executSchdulHour}:${item.executSchdulMnt}`, className: 'font-mono text-xs' },
    {
      header: '상태',
      accessor: (item: BackupOpert) => (
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-black",
          item.useAt === 'Y' ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-500"
        )}>
          {item.useAt === 'Y' ? '활성' : '중지'}
        </span>
      )
    },
    {
      header: '작업',
      className: 'text-right',
      accessor: (item: BackupOpert) => (
        <div className="flex justify-end gap-1">
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" title="즉시 실행"><Play size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={() => handleOpenEdit(item)}><Edit size={14} /></Button>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0 text-destructive" onClick={() => handleDelete(item.backupOpertId)}><Trash2 size={14} /></Button>
        </div>
      )
    }
  ];

  const resColumns = [
    { 
      header: '작업명', 
      accessor: (item: BackupResult) => item.backupOpertNm, 
      className: 'font-bold' 
    },
    {
      header: '결과',
      accessor: (item: BackupResult) => (
        <div className="flex items-center gap-1">
          {item.sttus === '01' ? <CheckCircle2 size={14} className="text-green-500" /> : <XCircle size={14} className="text-red-500" />}
          <span className={cn("text-xs font-bold", item.sttus === '01' ? "text-green-700" : "text-red-700")}>
            {item.sttus === '01' ? '성공' : '실패'}
          </span>
        </div>
      )
    },
    { 
      header: '시작시간', 
      accessor: (item: BackupResult) => item.executBeginTime, 
      className: 'text-xs text-muted-foreground' 
    },
    { 
      header: '종료시간', 
      accessor: (item: BackupResult) => item.executEndTime, 
      className: 'text-xs text-muted-foreground' 
    },
    {
      header: '로그',
      className: 'text-right',
      accessor: () => (
        <Button variant="ghost" size="sm" className="h-8 text-xs gap-1"><History size={12} /> 로그보기</Button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="백업 정책 및 자동화 관리"
        breadcrumbs={[{ label: '시스템관리' }, { label: '백업관리' }]}
        actions={
          <Button className="rounded-full gap-2" onClick={handleOpenCreate}>
            <Plus size={16} /> 신규 백업 설정
          </Button>
        }
      />

      <Tabs defaultValue="operations" onValueChange={setActiveTab}>
        <TabsList className="bg-muted/50 p-1 rounded-2xl h-12">
          <TabsTrigger value="operations" className="rounded-xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            백업 정책 설정
          </TabsTrigger>
          <TabsTrigger value="results" className="rounded-xl px-8 data-[state=active]:bg-card data-[state=active]:shadow-sm">
            실행 결과 이력
          </TabsTrigger>
        </TabsList>

        <div className="mt-6">
          <TabsContent value="operations" className="space-y-4">
            <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
              <StandardDataTable
                columns={opColumns}
                data={operations}
                loading={loading}
                emptyMessage="등록된 백업 정책이 없습니다."
                className="border-none rounded-none"
              />
            </div>
          </TabsContent>

          <TabsContent value="results" className="space-y-4">
            <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
              <StandardDataTable
                columns={resColumns}
                data={results}
                loading={loading}
                emptyMessage="실행 결과 이력이 없습니다."
                className="border-none rounded-none"
              />
            </div>
          </TabsContent>
        </div>
      </Tabs>

      {/* 백업 정책 등록/수정 모달 */}
      <StandardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={mode === 'create' ? '신규 백업 정책 등록' : '백업 정책 수정'}
        maxWidth="lg"
      >
        <BackupForm
          initialData={selectedOp}
          onSubmit={handleSubmit}
          onCancel={() => setIsModalOpen(false)}
        />
      </StandardModal>
    </div>
  );
}
