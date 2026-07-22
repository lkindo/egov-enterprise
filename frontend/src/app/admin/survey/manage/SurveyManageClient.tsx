'use client';

import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search, FileText, LayoutGrid, Layers, Zap, RefreshCcw } from "lucide-react";
import { getPollList } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO } from '@/types/business/poll';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
import { toDisplayYmd, todayStorageYmd } from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL } from '@/lib/poll-status';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

const PAGE_SIZE = 10;

export default function SurveyManageClient() {
  const router = useRouter();
  // 기준일은 저장 포맷과 동일한 'yyyyMMdd' 문자열로 고정한다.
  // (SSR 시점 시각을 쓰면 하이드레이션 불일치가 나므로 마운트 후 세팅)
  const [todayYmd, setTodayYmd] = useState<string>('');
  useEffect(() => {
    setTodayYmd(todayStorageYmd());
  }, []);

  // 검색어는 입력 컨트롤에 그대로 바인딩하고, 서버 요청에는 디바운스 값만 쓴다(P1-8).
  // 종전에는 params 객체에 검색어가 직접 들어 있어 **타이핑 한 글자마다 서버 요청**이 나갔다.
  const [page, setPage] = useState(0); // 0-base (서버 Pageable 과 동일)
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-polls', page, debouncedKeyword],
    queryFn: () => getPollList({ page, size: PAGE_SIZE, searchKeyword: debouncedKeyword }),
  });

  const polls: OnlinePollManageVO[] = data?.list || [];
  const total = data?.total || 0;

  /** 검색어 변경 시 페이지를 항상 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되던 결함(P1-8). */
  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const columns: Column<OnlinePollManageVO>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {(index !== undefined ? index + 1 + page * PAGE_SIZE : 0).toString().padStart(2, '0')}
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
        title="설문"
        highlight="거버넌스"
        subtitle="조직 내 의견 수렴 및 투표 프로세스를 통합 관리하고 분석합니다."
        icon={LayoutGrid}
        actions={
          <div className="flex gap-4">
            {/* 종전에는 setParams(prev => ({...prev})) 로 동일 내용 객체만 새로 만들었다.
                React Query 는 queryKey 를 직렬화해 해시하므로 키가 그대로여서 **재요청이 없었다**(死버튼).
                refetch() 로 배선한다(P1-6). */}
            <Button
              variant="outline"
              onClick={() => void refetch()}
              aria-label="설문 목록 새로고침"
              className="h-11 w-14 rounded-xl bg-card border-2 border-border text-muted-foreground hover:text-primary transition-all shadow-sm"
            >
              <RefreshCcw size={20} className={isLoading ? 'animate-spin' : undefined} />
            </Button>
            <Button onClick={() => router.push('/admin/survey/manage/create')} className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold tracking-widest text-xs uppercase hover:bg-primary transition-all shadow-2xl">
              <Plus size={20} /> 설문 등록
            </Button>
          </div>
        }
      />

      {/* 지표는 서버가 실제로 준 값만 남긴다.
          삭제: '참여 노드 2.4k'(하드코딩), '데이터 상태 Normal'(산출 근거 없음) — 감사 P1-5. */}
      <HubMetricGrid>
        <HubMetricCard title="전체 설문" value={total} unit="건" icon={Layers} color="primary" status="서버 집계" />
        <HubMetricCard
          title="진행중 (현재 페이지)"
          value={todayYmd ? polls.filter(p => getPollStatus(p, todayYmd) === 'active').length : 0}
          unit="건"
          icon={Zap}
          color="emerald"
          status={`${polls.length}건 중`}
        />
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
              <label htmlFor="survey-manage-search" className="sr-only">설문 제목 검색</label>
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within/search:text-primary transition-colors" size={18} />
              <Input
                id="survey-manage-search"
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
                className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="설문 제목으로 검색.."
              />
              <Button type="submit" className="h-11 px-10 rounded-xl bg-surface-inverse text-surface-inverse-foreground font-bold text-xs tracking-widest shadow-xl hover:bg-primary transition-all">검색</Button>
            </form>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={polls}
              loading={isLoading}
              // 조회 실패를 '데이터가 없습니다'로 위장하지 않는다(P1-1).
              error={isError ? error : null}
              onRetry={() => void refetch()}
              onRowClick={(poll) => router.push(`/admin/survey/manage/${poll.pollId}`)}
              emptyMessage="등록된 설문 정보가 없습니다."
              isPremium={true}
              className="border-none bg-transparent shadow-none"
              pagination={{
                currentPage: page + 1,
                totalPages: Math.ceil(total / PAGE_SIZE),
                onPageChange: (p) => setPage(p - 1),
                totalCount: total,
                pageSize: PAGE_SIZE,
              }}
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}
