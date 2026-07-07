'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
;
import { Plus,  Search,  FileText,  LayoutGrid,  Layers,  Zap,  Activity,  RefreshCcw } from "lucide-react";
import { getPollList } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO, PollSearchParams } from '@/types/business/poll';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';

export default function SurveyManageClient() {
  const router = useRouter();
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
  }, []);

  const [params, setParams] = useState<PollSearchParams>({
    page: 0,
    size: 10,
    searchKeyword: '',
  });

  const { data, isLoading } = useQuery({
    queryKey: ['admin-polls', params],
    queryFn: () => getPollList(params),
  });

  const polls: OnlinePollManageVO[] = data?.list || [];

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setParams(prev => ({ ...prev, page: 0 }));
  };

  const columns: Column<OnlinePollManageVO>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-slate-400">
          {(index !== undefined ? index + 1 + (params.page || 0) * (params.size || 10) : 0).toString().padStart(2, '0')}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '설문 명칭',
      accessor: (poll) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-slate-900 group-hover:text-primary transition-colors tracking-tight">
            {poll.pollNm}
          </span>
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest opacity-60">
            ID: {poll.pollId}
          </span>
        </div>
      )
    },
    {
      header: '설문 기간',
      accessor: (poll) => (
        <span className="text-xs font-bold text-slate-500 tabular-nums tracking-tighter">
          {poll.pollBgngYmd} ~ {poll.pollEndYmd}
        </span>
      ),
      className: 'w-48'
    },
    {
      header: '상태',
      accessor: (poll) => {
        const end = new Date(poll.pollEndYmd);
        const isActive = now ? end >= now : false;
        return (
          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${isActive
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : 'bg-slate-100 text-slate-400 border border-slate-200'
          }`}>
            {isActive ? '진행중' : '종료'}
          </div>
        );
      },
      className: 'w-32 text-center'
    },
    {
      header: '등록자',
      accessor: (poll) => (
        <span className="text-xs font-bold text-slate-600 tracking-tight">{poll.frstRgtrId}</span>
      ),
      className: 'w-32 text-center'
    },
    {
      header: '등록일',
      accessor: (poll) => (
        <span className="text-xs font-bold text-slate-300 tabular-nums tracking-widest uppercase">
          {poll.crtDt?.slice(0, 10).replace(/-/g, '.')}
        </span>
      ),
      className: 'w-32 text-right pr-8'
    }
  ];

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="설문 및 거버넌스 관리"
        breadcrumbs={[{ label: '설문관리' }, { label: '설문설정' }]}
      />

      <HubHeader 
        title="Survey" 
        highlight="Governance" 
        subtitle="조직 내 의견 수렴 및 투표 프로세스를 통합 관리하고 분석합니다." 
        icon={LayoutGrid} 
        actions={
          <div className="flex gap-4">
            <Button
              variant="outline"
              onClick={() => setParams(prev => ({ ...prev }))}
              className="h-11 w-14 rounded-xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary transition-all shadow-sm"
            >
              <RefreshCcw size={20} />
            </Button>
            <Button onClick={() => router.push('/admin/survey/manage/create')} className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
              <Plus size={20} /> 설문 등록
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 설문" value={data?.total || 0} icon={Layers} color="primary" />
        <HubMetricCard title="진행중" value={now ? polls.filter(p => new Date(p.pollEndYmd) >= now).length : 0} icon={Zap} color="emerald" status="활성" />
        <HubMetricCard title="참여 노드" value="2.4k" icon={Activity} color="indigo" />
        <HubMetricCard title="데이터 상태" value="Normal" icon={RefreshCcw} color="amber" />
      </HubMetricGrid>

      <HubSectionCard 
        title="설문 아카이브 매트릭스" 
        description="관리 중인 모든 온라인 설문 및 투표의 핵심 데이터 스트림입니다." 
        icon={FileText}
        className="bg-white/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-slate-100/50 pb-10 mb-8">
            <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-slate-300 group-focus-within/search:text-primary transition-colors" size={18} />
              <Input 
                value={params.searchKeyword}
                onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                className="h-11 bg-slate-50/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
                placeholder="설문 제목으로 검색.." 
              />
              <Button type="submit" className="h-11 px-10 rounded-xl bg-slate-900 text-white font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">SEARCH</Button>
            </form>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={polls}
              loading={isLoading}
              onRowClick={(poll) => router.push(`/admin/survey/manage/${poll.pollId}`)}
              emptyMessage="등록된 설문 정보가 없습니다."
              isPremium={true}
              className="border-none bg-transparent shadow-none"
              pagination={{
                currentPage: (params.page || 0) + 1,
                totalPages: Math.ceil((data?.total || 0) / (params.size || 10)),
                onPageChange: (p) => setParams(prev => ({ ...prev, page: p - 1 }))
              }}
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}
