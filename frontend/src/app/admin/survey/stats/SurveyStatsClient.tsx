'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Search, TrendingUp, FileBarChart, MessageSquare } from "lucide-react";
import { onlinePollAdminService, type OnlinePollDto } from '@/services/foundation/system/OnlinePollAdminService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Card } from "@/components/ui/card";
import { toDisplayYmd, todayStorageYmd } from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL } from '@/lib/poll-status';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

const PAGE_SIZE = 10;

/** 설문 1건의 총 응답 수 = 항목별 득표수 합계. 관리자 목록 API 가 pollArticles.pollIemCo 를 채워 내려준다. */
function totalResponses(poll: OnlinePollDto): number {
  return poll.pollArticles?.reduce((sum, item) => sum + (item.pollIemCo || 0), 0) ?? 0;
}

export default function SurveyStatsClient({ embedded = false }: { embedded?: boolean }) {
  const [page, setPage] = useState(0); // 0-base (서버 Pageable 과 동일)
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebouncedValue(keyword, 300);

  // 상태 판정 기준일은 저장 포맷과 같은 'yyyyMMdd' 8자. SSR 시각을 쓰면 하이드레이션이 어긋나므로 마운트 후 세팅.
  const [todayYmd, setTodayYmd] = useState<string>('');
  useEffect(() => {
    setTodayYmd(todayStorageYmd());
  }, []);

  // 응답 수는 관리자 목록 API 만 내려준다(pollArticles.pollIemCo).
  // 종전 화면은 사용자 API 를 호출하고 '응답 수' 칸에 리터럴 0 을 찍고 있었다 — 거짓 지표(P1-5).
  const { data, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['admin-survey-stats', page, debouncedKeyword],
    queryFn: () => onlinePollAdminService.getPollList({ keyword: debouncedKeyword, page, size: PAGE_SIZE }),
  });

  const polls: OnlinePollDto[] = data?.list || [];
  const totalCount = data?.total || 0;
  const pageResponseSum = polls.reduce((sum, poll) => sum + totalResponses(poll), 0);

  /** 검색 시 항상 1페이지로 되돌린다 — 3페이지에서 검색하면 빈 화면이 되던 결함(P1-8). */
  const handleKeywordChange = (value: string) => {
    setKeyword(value);
    setPage(0);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setPage(0);
  };

  const columns: Column<OnlinePollDto>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {(index !== undefined ? index + 1 + page * PAGE_SIZE : 0)}
        </span>
      ),
      className: 'w-20 text-center',
    },
    {
      header: '설문 주제',
      accessor: (poll) => (
        <span className="text-sm font-bold text-foreground group-hover:text-amber-600 transition-colors tracking-tight">
          {poll.pollNm}
        </span>
      ),
    },
    {
      header: '응답 수',
      accessor: (poll) => (
        <span className="font-mono font-bold text-foreground tabular-nums">
          {totalResponses(poll).toLocaleString()}
        </span>
      ),
      className: 'w-32 text-center',
    },
    {
      header: '조사 기간',
      accessor: (poll) => (
        <span className="text-xs font-bold text-muted-foreground tabular-nums tracking-tighter">
          {toDisplayYmd(poll.pollBgngYmd)} ~ {toDisplayYmd(poll.pollEndYmd)}
        </span>
      ),
      className: 'w-56 text-center',
    },
    {
      header: '진행 상태',
      accessor: (poll) => {
        // 종전에는 전 행에 '집계중' 배지를 고정 렌더했다 — 종료된 설문도 집계중으로 보였다(P1-5).
        const status = getPollStatus(poll, todayYmd);
        const tone =
          status === 'active'
            ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
            : status === 'scheduled'
              ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              : 'bg-muted text-muted-foreground border-border';
        return (
          <span className={`inline-flex items-center rounded-md border px-3 py-1 text-[10px] font-bold tracking-widest ${tone}`}>
            {POLL_STATUS_LABEL[status]}
          </span>
        );
      },
      className: 'w-32 text-center',
    },
  ];

  return (
    // 루트 admin 레이아웃이 이미 max-w-7xl + p-6/md:p-12/lg:p-16 을 준다 — 화면별 p-8 은 이중 여백이라 제거(P2).
    <div className="space-y-10 animate-in fade-in duration-700">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/10 rounded-lg text-amber-600">
              <TrendingUp size={18} />
            </div>
            <span className="text-sm font-bold text-amber-600 tracking-tight">데이터 분석</span>
          </div>
          {embedded ? (
            <h2 className="text-4xl font-bold tracking-tighter text-foreground">설문 통계 <span className="text-amber-500">분석</span></h2>
          ) : (
            <h1 className="text-4xl font-bold tracking-tighter text-foreground">설문 통계 <span className="text-amber-500">분석</span></h1>
          )}
          <p className="text-muted-foreground font-bold text-sm max-w-lg">등록된 설문별 응답 수와 진행 상태를 확인합니다.</p>
        </div>
      </div>

      {/* 근거 없는 카드 2개('Response Rate 78.4%', 'Active Analytics: Live')는 삭제했다(P1-5).
          남은 두 값은 서버 응답에서 직접 계산된다. */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="rounded-lg border-none shadow-sm bg-surface-inverse text-surface-inverse-foreground p-8 space-y-4 text-left">
          <div className="w-12 h-12 rounded-lg bg-white/10 flex items-center justify-center">
            <FileBarChart size={24} className="text-amber-400" />
          </div>
          <div>
            <p className="text-xs font-bold tracking-widest opacity-60">전체 설문</p>
            <h3 className="text-4xl font-bold tabular-nums">{totalCount.toLocaleString()}<span className="text-lg font-bold ml-1 opacity-60">건</span></h3>
          </div>
        </Card>
        <Card className="rounded-lg border-none shadow-sm bg-card p-8 space-y-4 ring-1 ring-border text-left">
          <div className="w-12 h-12 rounded-lg bg-amber-500/10 flex items-center justify-center">
            <MessageSquare size={24} className="text-amber-600" />
          </div>
          <div>
            <p className="text-muted-foreground text-xs font-bold tracking-widest">현재 페이지 응답 합계</p>
            <h3 className="text-4xl font-bold tabular-nums">{pageResponseSum.toLocaleString()}<span className="text-lg text-muted-foreground font-bold ml-1">건</span></h3>
          </div>
        </Card>
      </div>

      <Card className="border-none shadow-[0_32px_64px_-12px_rgba(0,0,0,0.08)] overflow-hidden rounded-lg bg-card ring-1 ring-border">
        <div className="bg-muted/50 border-b p-8">
          <form onSubmit={handleSearch} className="flex flex-col md:flex-row items-center gap-4">
            <div className="relative flex-1 w-full group">
              <label htmlFor="survey-stats-search" className="sr-only">분석할 설문명 검색</label>
              <Search className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground group-focus-within:text-amber-500 transition-colors" />
              <Input
                id="survey-stats-search"
                placeholder="분석할 설문명을 입력하세요"
                className="h-11 pl-14 rounded-lg border-2 border-transparent bg-card shadow-sm focus:border-amber-500 focus:ring-0 transition-all font-bold"
                value={keyword}
                onChange={(e) => handleKeywordChange(e.target.value)}
              />
            </div>
            <Button type="submit" className="h-11 px-10 rounded-lg bg-surface-inverse border-none text-surface-inverse-foreground font-bold text-sm shadow-sm transition-all active:scale-95">분석 조회</Button>
          </form>
        </div>

        <StandardDataTable
          columns={columns}
          data={polls}
          loading={isLoading}
          // 조회 실패를 '통계 데이터가 존재하지 않습니다'로 위장하지 않는다(P1-1).
          error={isError ? error : null}
          onRetry={() => void refetch()}
          keyField="pollSn"
          emptyMessage="집계할 설문이 없습니다."
          className="border-none bg-transparent shadow-none"
          pagination={{
            currentPage: page + 1,
            totalPages: Math.ceil(totalCount / PAGE_SIZE),
            onPageChange: (p) => setPage(p - 1),
            totalCount,
            pageSize: PAGE_SIZE,
          }}
        />
      </Card>
    </div>
  );
}
