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
import { toDisplayYmd, todayStorageYmd } from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL } from '@/lib/poll-status';

export default function SurveyManageClient() {
  const router = useRouter();
  // 기준일은 저장 포맷과 동일한 'yyyyMMdd' 문자열로 고정한다.
  // (SSR 시점 시각을 쓰면 하이드레이션 불일치가 나므로 마운트 후 세팅)
  const [todayYmd, setTodayYmd] = useState<string>('');
  useEffect(() => {
    setTodayYmd(todayStorageYmd());
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
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {(index !== undefined ? index + 1 + (params.page || 0) * (params.size || 10) : 0).toString().padStart(2, '0')}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '설문 명칭',
      accessor: (poll) => (
        <div className="flex flex-col gap-1 py-1">
          <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
            {poll.pollNm}
          </span>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            ID: {poll.pollId}
          </span>
        </div>
      )
    },
    {
      header: '설문 기간',
      accessor: (poll) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
          {toDisplayYmd(poll.pollBgngYmd)} ~ {toDisplayYmd(poll.pollEndYmd)}
        </span>
      ),
      className: 'w-48'
    },
    {
      header: '상태',
      accessor: (poll) => {
        // 저장값은 'yyyyMMdd' 8자다. new Date('20260722') 는 Invalid Date 라
        // 종전 판정은 전건 '종료'로 무너져 있었다. 판정은 poll-status 유틸로 단일화한다.
        const status = getPollStatus(poll, todayYmd);
        const tone =
          status === 'active'
            ? 'bg-emerald-500/10 text-emerald-600 border border-emerald-500/20'
            : status === 'scheduled'
              ? 'bg-amber-500/10 text-amber-600 border border-amber-500/20'
              : 'bg-muted text-muted-foreground border border-border';
        return (
          <div className={`inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest uppercase transition-all ${tone}`}>
            {POLL_STATUS_LABEL[status]}
          </div>
        );
      },
      className: 'w-32 text-center'
    },
    {
      header: '등록자',
      accessor: (poll) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">{poll.frstRgtrId}</span>
      ),
      className: 'w-32 text-center'
    },
    {
      header: '등록일',
      accessor: (poll) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-widest uppercase">
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
              className="h-11 w-14 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
            >
              <RefreshCcw size={20} />
            </Button>
            <Button onClick={() => router.push('/admin/survey/manage/create')} className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
              <Plus size={20} /> 설문 등록
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 설문" value={data?.total || 0} icon={Layers} color="primary" />
        <HubMetricCard title="진행중" value={todayYmd ? polls.filter(p => getPollStatus(p, todayYmd) === 'active').length : 0} icon={Zap} color="emerald" status="활성" />
        <HubMetricCard title="참여 노드" value="2.4k" icon={Activity} color="indigo" />
        <HubMetricCard title="데이터 상태" value="Normal" icon={RefreshCcw} color="amber" />
      </HubMetricGrid>

      <HubSectionCard 
        title="설문 아카이브 매트릭스" 
        description="관리 중인 모든 온라인 설문 및 투표의 핵심 데이터 스트림입니다." 
        icon={FileText}
        className="bg-card/40 backdrop-blur-md border border-white/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8">
          <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
            <form onSubmit={handleSearch} className="flex items-center gap-4 relative group/search max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} />
              <Input 
                value={params.searchKeyword}
                onChange={(e) => setParams(prev => ({ ...prev, searchKeyword: e.target.value }))}
                className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all" 
                placeholder="설문 제목으로 검색.." 
              />
              <Button type="submit" className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest uppercase shadow-xl hover:bg-primary transition-all">SEARCH</Button>
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
