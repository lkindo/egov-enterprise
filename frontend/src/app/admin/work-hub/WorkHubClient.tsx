'use client';

import React, { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Briefcase, 
  Search, 
  ClipboardList, 
  FileText, 
  Activity, 
  Plus, 
  Layers, 
  RefreshCcw, 
  MoreVertical } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/components/composite/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
;
import { useQuery, useQueryClient } from '@tanstack/react-query';
;
import { deptJobUserService } from '@/services/business/user/deptJob/DeptJobUserService';
import { reportService } from '@/services/business/user/ReportService';

export default function WorkHubClient({ jobs: initialJobs = [], reports: initialReports = [], defaultTab = 'job' }: any) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const queryClient = useQueryClient();

  const queryTab = searchParams.get('tab');
  const initialTab = (queryTab === 'calendar' ? 'calendar' :
    queryTab === 'report' ? 'report' :
      (defaultTab || '').toLowerCase().includes('report') ? 'report' :
        (defaultTab || '').toLowerCase().includes('calendar') || (defaultTab || '').toLowerCase().includes('schedule') ? 'calendar' : 'job') as 'job' | 'report' | 'calendar';

  const [activeTab, setTabState] = useState<'job' | 'report' | 'calendar'>(initialTab);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [currentDate, setCurrentDate] = useState(new Date());

  const setTab = (tab: 'job' | 'report' | 'calendar') => {
    setTabState(tab);
    const params = new URLSearchParams(searchParams);
    params.set('tab', tab);
    router.push(`/admin/work-hub?${params.toString()}`, { scroll: false });
  };

  const { data: jobData, isLoading: isJobLoading } = useQuery({
    queryKey: ['work-jobs', searchKeyword],
    queryFn: () => deptJobUserService.getDeptJobBoxes({ searchWrd: searchKeyword }),
    enabled: activeTab === 'job'
  });
  const jobs = jobData?.list || [];

  const { data: reportData, isLoading: isReportLoading } = useQuery({
    queryKey: ['work-reports', searchKeyword],
    queryFn: () => reportService.getReports({ page: 0, size: 50, searchWrd: searchKeyword }),
    enabled: activeTab === 'report'
  });
  const reports = reportData?.list || [];

  const jobColumns: Column<any>[] = [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-slate-400">{(index! + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center'
    },
    {
      header: '업무함 명칭',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">{item.deptTaskBoxNm}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">ID: {item.deptTaskBoxId}</span>
        </div>
      )
    },
    {
      header: '부서',
      accessor: (item) => <span className="text-xs font-bold text-slate-500 uppercase tracking-tight">{item.deptId || '글로벌'}</span>,
      className: 'w-32'
    },
    {
      header: '관리',
      accessor: () => (
        <div className="flex justify-end pr-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-slate-100">
            <MoreVertical size={16} className="text-slate-400" />
          </Button>
        </div>
      ),
      className: 'w-20 text-right'
    }
  ];

  const reportColumns: Column<any>[] = [
    {
      header: '번호',
      accessor: (_, index) => <span className="font-mono text-xs font-bold text-slate-400">{(index! + 1).toString().padStart(2, '0')}</span>,
      className: 'w-20 text-center'
    },
    {
      header: '보고서 제목',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">{item.rptTtl}</span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">작성일: {item.rptYmd}</span>
        </div>
      )
    },
    {
      header: '작성자',
      accessor: (item) => <span className="text-xs font-bold text-slate-600 tracking-tight">{item.userId}</span>,
      className: 'w-32'
    },
    {
      header: '관리',
      accessor: () => (
        <div className="flex justify-end pr-4">
          <Button variant="ghost" size="icon" className="h-10 w-10 rounded-lg hover:bg-slate-100">
            <MoreVertical size={16} className="text-slate-400" />
          </Button>
        </div>
      ),
      className: 'w-20 text-right'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="워크플로우 및 자산 관리"
        breadcrumbs={[{ label: '업무관리' }, { label: '워크허브' }]}
      />

      <HubHeader
        title="업무 및"
        highlight="인텔리전스"
        subtitle="전사 업무 프로세스 및 비즈니스 데이터 자산을 통합 관리합니다."
        icon={Briefcase}
        actions={
          <div className="flex gap-4">
             <div className="flex bg-slate-100 p-1 rounded-xl border border-slate-200/50">
               <Button
                 variant="ghost"
                 size="sm"
                 className={cn("h-8 rounded-lg px-6 text-[10px] font-black uppercase transition-all", activeTab === 'job' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                 onClick={() => setTab('job')}
               >
                 워크플로우
               </Button>
               <Button
                 variant="ghost"
                 size="sm"
                 className={cn("h-8 rounded-lg px-6 text-[10px] font-black uppercase transition-all", activeTab === 'report' ? "bg-white shadow-sm text-primary" : "text-slate-500")}
                 onClick={() => setTab('report')}
               >
                 자산
               </Button>
             </div>
            <Button className="h-11 px-8 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
              <Plus size={18} /> 새 업무 생성
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="업무 노드" value={jobs.length} icon={Layers} color="primary" />
        <HubMetricCard title="보고 데이터" value={reports.length} icon={FileText} color="amber" />
        <HubMetricCard title="시스템 상태" value="정상" icon={Activity} color="emerald" status="안전함" />
        <HubMetricCard title="동기화 빈도" value="매일" icon={RefreshCcw} color="indigo" />
      </HubMetricGrid>

      <HubSectionCard
        title={activeTab === 'job' ? "업무 워크플로우 매트릭스" : "비즈니스 자산 아카이브"}
        description={activeTab === 'job' ? "부서별 업무 흐름 및 처리 상태에 대한 실시간 스트림입니다." : "조직 내에서 생성된 모든 보고 및 데이터 자산의 명세입니다."}
        icon={activeTab === 'job' ? ClipboardList : FileText}
        className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
            <div className="relative group max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within:text-primary transition-colors" size={18} />
              <Input
                value={searchKeyword}
                onChange={(e) => setSearchKeyword(e.target.value)}
                className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="검색어를 입력하십시오..."
              />
            </div>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={activeTab === 'job' ? jobColumns : reportColumns}
              data={activeTab === 'job' ? jobs : reports}
              loading={activeTab === 'job' ? isJobLoading : isReportLoading}
              emptyMessage="식별된 데이터 유닛이 없습니다."
              isPremium={true}
              className="border-none bg-transparent shadow-none"
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}
