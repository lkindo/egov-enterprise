'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Button } from "@/components/ui/button";
import { Plus, RefreshCcw } from "lucide-react";
import { getPollList } from '@/services/business/user/poll/PollUserService';
import { OnlinePollManageVO } from '@/types/business/poll';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { toDisplayYmd, todayStorageYmd } from '@/lib/format-date';
import { getPollStatus, POLL_STATUS_LABEL } from '@/lib/poll-status';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';

const PAGE_SIZE = 10;

export default function SurveyManageClient({ embedded = false }: { embedded?: boolean }) {
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
            SN: {poll.pollSn}
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
    <WorkListPage
      title="설문 관리"
      headingLevel={embedded ? 2 : 1}
      showBreadcrumb={!embedded}
      description="조직 내 의견 수렴·투표 설문을 조회하고 등록합니다."
      breadcrumbItems={[{ label: '설문관리' }, { label: '설문설정' }]}
      filterStateKey="survey-manage"
      totalCount={isError ? undefined : total}
      actions={
        <>
          {/* 종전에는 setParams(prev => ({...prev})) 로 동일 내용 객체만 새로 만들었다.
              React Query 는 queryKey 를 직렬화해 해시하므로 키가 그대로여서 **재요청이 없었다**(死버튼).
              refetch() 로 배선한다(P1-6). */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => void refetch()}
            aria-label="설문 목록 새로고침"
            className="gap-2"
          >
            <RefreshCcw size={16} className={isLoading ? 'animate-spin' : undefined} aria-hidden="true" />
            새로고침
          </Button>
          <Button size="sm" onClick={() => router.push('/admin/survey/manage/create')} className="gap-2">
            <Plus size={16} aria-hidden="true" /> 설문 등록
          </Button>
        </>
      }
      filter={
        <KeywordFilter
          label="설문 제목"
          placeholder="설문 제목으로 검색"
          value={keyword}
          onSearch={(next) => handleKeywordChange(next)}
        />
      }
    >
      <StandardDataTable
        accessibleLabel="설문 목록"
        columns={columns}
        data={polls}
        loading={isLoading}
        // 조회 실패를 '데이터가 없습니다'로 위장하지 않는다(P1-1).
        error={isError ? error : null}
        onRetry={() => void refetch()}
        onRowClick={(poll) => router.push(`/admin/survey/manage/${poll.pollSn}`)}
        rowActionLabel={(poll) => `${poll.pollNm || `${poll.pollSn}번`} 설문 관리 열기`}
        emptyMessage={emptyResultMessage(keyword, '등록된 설문이 없습니다.')}
        pagination={{
          currentPage: page + 1,
          totalPages: Math.ceil(total / PAGE_SIZE),
          onPageChange: (p) => setPage(p - 1),
          pageSize: PAGE_SIZE,
        }}
      />
    </WorkListPage>
  );
}
