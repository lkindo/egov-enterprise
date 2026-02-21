'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { batchService, BatchSchedule, BatchResult } from '@/services/batchService';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { Play, Calendar, History, RefreshCcw, Activity } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function BatchAdminPage() {
  const { toast } = useToast();
  const confirm = useConfirm();
  const [activeTab, setTab] = useState<'schedule' | 'result'>('schedule');
  const [loading, setLoading] = useState(true);
  
  const [schedules, setSchedules] = useState<BatchSchedule[]>([]);
  const [results, setResults] = useState<BatchResult[]>([]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'schedule') {
        const res = await batchService.getSchedules({ page: 0, size: 20 });
        if (res.success) setSchedules(res.data.content || []);
      } else {
        const res = await batchService.getResults({ page: 0, size: 20 });
        if (res.success) setResults(res.data.content || []);
      }
    } catch (error) {
      toast('배치 데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleExecuteNow = async (id: string) => {
    const isConfirmed = await confirm({
      title: '배치 즉시 실행',
      message: '해당 배치를 지금 즉시 실행하시겠습니까?',
      confirmText: '실행하기'
    });

    if (isConfirmed) {
      try {
        await batchService.executeNow(id);
        toast('배치 실행 요청이 전송되었습니다.', 'success');
        setTab('result'); // 결과 탭으로 이동하여 확인 유도
      } catch (error) {
        toast('실행 요청 중 오류가 발생했습니다.', 'error');
      }
    }
  };

  const scheduleColumns = [
    { 
      header: '배치 작업명', 
      accessor: (item: BatchSchedule) => item.batchOpertNm, 
      className: 'font-black' 
    },
    { 
      header: '주기', 
      accessor: (item: BatchSchedule) => (
        <span className="text-xs font-bold text-primary">
          {item.executCycle === '01' ? '매일' : '기타'}
        </span>
      )
    },
    { 
      header: '실행 시간', 
      accessor: (item: BatchSchedule) => `${item.executSchdulHour}:${item.executSchdulMnt}:${item.executSchdulSecnd}`,
      className: 'text-xs font-mono text-muted-foreground'
    },
    {
      header: '액션',
      className: 'text-right',
      accessor: (item: BatchSchedule) => (
        <button 
          onClick={() => handleExecuteNow(item.batchSchdulId)}
          className="p-2 hover:bg-primary/10 text-primary rounded-lg transition-all"
          title="즉시 실행"
        >
          <Play size={16} fill="currentColor" />
        </button>
      )
    }
  ];

  const resultColumns = [
    { 
      header: '배치 작업명', 
      accessor: (item: BatchResult) => item.batchOpertNm, 
      className: 'font-bold' 
    },
    { 
      header: '시작 시간', 
      accessor: (item: BatchResult) => item.executBeginTime, 
      className: 'text-xs' 
    },
    { 
      header: '종료 시간', 
      accessor: (item: BatchResult) => item.executEndTime, 
      className: 'text-xs text-muted-foreground' 
    },
    { 
      header: '상태', 
      accessor: (item: BatchResult) => <StatusBadge status={item.sttus === '01' ? 'Y' : item.sttus === '03' ? 'R' : 'N'} /> 
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="배치 작업 관리 센터" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '배치관리' }]}
        actions={
          <button onClick={loadData} className="p-2.5 border rounded-xl hover:bg-accent transition-all">
            <RefreshCcw size={18} className={cn(loading && "animate-spin")} />
          </button>
        }
      />

      {/* Tabs */}
      <div className="flex bg-card border rounded-2xl p-1.5 w-fit shadow-sm">
        <TabButton active={activeTab === 'schedule'} onClick={() => setTab('schedule')} icon={<Calendar size={18} />} label="실행 스케줄" />
        <TabButton active={activeTab === 'result'} onClick={() => setTab('result')} icon={<History size={18} />} label="실행 이력" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-6 bg-card border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-blue-50 text-blue-600"><Activity size={20} /></div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">등록된 배치</p>
            <h4 className="text-xl font-black">{schedules.length} 건</h4>
          </div>
        </div>
        <div className="p-6 bg-card border rounded-2xl shadow-sm flex items-center gap-4">
          <div className="p-3 rounded-xl bg-green-50 text-green-600"><Play size={20} /></div>
          <div>
            <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">오늘 성공</p>
            <h4 className="text-xl font-black">{results.filter(r => r.sttus === '01').length} 건</h4>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <StandardDataTable
          columns={activeTab === 'schedule' ? scheduleColumns : resultColumns}
          data={activeTab === 'schedule' ? (schedules as any) : (results as any)}
          loading={loading}
          emptyMessage="데이터가 없습니다."
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}

function TabButton({ active, onClick, icon, label }: any) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "flex items-center gap-2 px-8 py-2.5 rounded-xl text-sm font-black transition-all",
        active ? "bg-primary text-white shadow-md" : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
      )}
    >
      {icon}
      {label}
    </button>
  );
}
