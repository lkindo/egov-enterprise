'use client';

import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { ReportPage } from '@/app/components/patterns/report-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { onlinePollAdminService, type OnlinePollDto } from '@/services/foundation/system/OnlinePollAdminService';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { toDisplayYmd, todayStorageYmd } from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL } from '@/lib/poll-status';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

const PAGE_SIZE = 10;

/** 여론조사 1건의 총 응답 수 = 항목별 득표수 합계. 관리자 목록 API 가 pollArticles.pollIemCo 를 채워 내려준다. */
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
      header: '여론조사 주제',
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
        // 종전에는 전 행에 '집계중' 배지를 고정 렌더했다 — 종료된 여론조사도 집계중으로 보였다(P1-5).
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
    <ReportPage
      title="여론조사 통계"
      headingLevel={embedded ? 2 : 1}
      showBreadcrumb={!embedded}
      description="등록된 여론조사별 응답 수와 진행 상태를 확인합니다."
      breadcrumbItems={[{ label: '설문관리' }, { label: '여론조사 통계' }]}
      // A7 필수 — 값의 범위를 화면에서 밝힌다. 응답 합계는 서버 전체가 아니라 현재 페이지 기준이다.
      basis={`집계 기준: 등록된 여론조사 ${totalCount.toLocaleString()}건 · 응답 합계는 현재 페이지 ${polls.length}건 기준 · 출처: 여론조사 응답 집계 API`}
      filter={
        <KeywordFilter
          label="여론조사명"
          placeholder="분석할 여론조사명을 입력하세요"
          value={keyword}
          onSearch={(next) => handleKeywordChange(next)}
        />
      }
      summary={
        /* 근거 없는 카드 2개('Response Rate 78.4%', 'Active Analytics: Live')는 삭제됐다(P1-5).
           남은 두 값은 서버 응답에서 직접 계산된다. */
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">전체 여론조사</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{totalCount.toLocaleString()}건</p>
          </div>
          <div className="rounded-md border border-border bg-card px-4 py-3">
            <p className="text-[length:var(--font-size-body)] text-muted-foreground">현재 페이지 응답 합계</p>
            <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{pageResponseSum.toLocaleString()}건</p>
          </div>
        </div>
      }
      tableTitle="여론조사별 응답 집계"
    >
      <StandardDataTable
        accessibleLabel="여론조사별 응답 집계"
        columns={columns}
        data={polls}
        loading={isLoading}
        // 조회 실패를 '통계 데이터가 존재하지 않습니다'로 위장하지 않는다(P1-1).
        error={isError ? error : null}
        onRetry={() => void refetch()}
        keyField="pollSn"
        emptyMessage={emptyResultMessage(keyword, '집계할 여론조사가 없습니다.')}
        pagination={{
          currentPage: page + 1,
          totalPages: Math.ceil(totalCount / PAGE_SIZE),
          onPageChange: (p) => setPage(p - 1),
          pageSize: PAGE_SIZE,
        }}
      />
    </ReportPage>
  );
}
