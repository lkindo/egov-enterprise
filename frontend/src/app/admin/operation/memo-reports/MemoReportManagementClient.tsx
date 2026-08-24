'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { memoReportService, MemoReportInfo } from '@/services/business/memoreport/memoReportService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { useAuth } from '@/contexts/AuthContext';

const TABS = ['RECEIVED', 'MY', 'ALL'] as const;
type ReportTab = (typeof TABS)[number];

const TAB_LABELS: Record<ReportTab, string> = {
  RECEIVED: '수신함',
  MY: '발신함',
  ALL: '전체',
};

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50];

export default function MemoReportManagementClient() {
  const { user } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // '전체' 탭은 조직 전체의 비정형 보고를 조회하므로 관리자 전용이다.
  // (백엔드 GET /memo-reports 에 관리자 인가가 걸려 있어, 비관리자에게 노출하면 403 으로 무언 실패한다)
  const isAdmin = user?.role === 'ROLE_ADMIN' || user?.role === 'ADMIN';

  // 탭·페이지는 URL 파생값이다(공유·새로고침·뒤로가기 복원 + 사이드바 활성 유지).
  // 검색어는 개인정보 노출 우려로 URL 에 싣지 않는다(감사 D-13).
  const tabParam = searchParams.get('tab');
  const requestedTab = TABS.find((t) => t === tabParam) ?? 'RECEIVED';
  const activeTab: ReportTab = requestedTab === 'ALL' && !isAdmin ? 'RECEIVED' : requestedTab;
  const page = Math.max(1, Number(searchParams.get('page')) || 1);

  const updateUrl = useCallback((next: { tab?: ReportTab; page?: number }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.tab !== undefined) {
      if (next.tab === 'RECEIVED') params.delete('tab');
      else params.set('tab', next.tab);
    }
    if (next.page !== undefined) {
      if (next.page <= 1) params.delete('page');
      else params.set('page', String(next.page));
    }
    const qs = params.toString();
    router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
  }, [router, pathname, searchParams]);

  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchKeyword, setSearchKeyword] = useState('');
  // 타이핑 한 글자마다 서버 요청이 나가지 않도록 디바운스 값만 queryKey 에 넣는다.
  const debouncedKeyword = useDebouncedValue(searchKeyword, 300);

  const handleTabChange = (tab: ReportTab) => updateUrl({ tab, page: 1 });

  const handleSearchChange = (value: string) => {
    setSearchKeyword(value);
    // 3페이지에서 검색해 빈 화면이 되는 것을 막는다.
    if (page !== 1) updateUrl({ page: 1 });
  };

  // --- Data Fetching ---
  const { data: reportsData, isLoading, isError, error, refetch } = useQuery({
    queryKey: ['memo-reports', activeTab, debouncedKeyword, page, pageSize],
    queryFn: () => {
      const params = { searchKeyword: debouncedKeyword, page: page - 1, size: pageSize };
      if (activeTab === 'MY') return memoReportService.getMyReports(params);
      if (activeTab === 'RECEIVED') return memoReportService.getReceivedReports(params);
      return memoReportService.getMemoReports(params);
    },
    // 비관리자가 '전체'로 진입해 403 을 맞는 상황 자체를 만들지 않는다.
    enabled: activeTab !== 'ALL' || isAdmin,
  });

  const displayItems: MemoReportInfo[] = reportsData?.list ?? [];
  const totalItems = reportsData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / pageSize);
  const unreadOnPage = displayItems.filter((r) => !r.rptrInqDt).length;

  const columns: Column<MemoReportInfo>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {index !== undefined ? (index + 1 + (page - 1) * pageSize).toString().padStart(2, '0') : '-'}
        </span>
      ),
      className: 'w-20 text-center'
    },
    {
      header: '보고 제목',
      accessor: (report) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            {!report.rptrInqDt && <span className="w-1.5 h-1.5 rounded-full bg-primary" aria-hidden="true" />}
            <span className="text-sm font-bold text-foreground group-hover:text-primary transition-colors tracking-tight">
              {report.rptTtl}
            </span>
          </div>
          <span className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-60">
            {report.memoRptYmd}
          </span>
        </div>
      )
    },
    {
      header: '작성자',
      accessor: (report) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">{report.wrterNm}</span>
      ),
      className: 'w-32'
    },
    {
      header: '수신자',
      accessor: (report) => (
        <span className="text-xs font-bold text-muted-foreground tracking-tight">{report.rptrNm}</span>
      ),
      className: 'w-32'
    },
    {
      header: '상태',
      accessor: (report) => (
        <div className={cn(
          "inline-flex items-center px-3 py-1 rounded-lg text-[10px] font-black tracking-widest transition-all",
          report.rptrInqDt ? "bg-emerald-500/10 text-emerald-600 border border-emerald-500/20" : "bg-muted text-muted-foreground border border-border"
        )}>
          {report.rptrInqDt ? '수신확인' : '미열람'}
        </div>
      ),
      className: 'w-36 text-center'
    }
  ];

  return (
    <WorkListPage
      title="메모 보고 관리"
      description="수신·발신한 보고와 지시사항을 조회합니다."
      breadcrumbItems={[{ label: '운영지원' }, { label: '메모보고' }]}
      filterStateKey="operation-memo-reports"
      // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
      totalCount={isError ? undefined : totalItems}
      actions={
        // 탭은 조회 조건이 아니라 조회 범위 전환이라 헤더에 둔다(수신함·발신함·전체).
        <div className="flex rounded-md border border-border p-0.5" role="tablist" aria-label="메모 보고 구분">
          {TABS.filter((tab) => tab !== 'ALL' || isAdmin).map((tab) => (
            <Button
              key={tab}
              role="tab"
              id={`memo-report-tab-${tab}`}
              aria-selected={activeTab === tab}
              aria-controls="memo-report-tabpanel"
              variant="ghost"
              size="sm"
              className={cn('px-4 font-bold text-xs', activeTab === tab && 'bg-muted text-primary')}
              onClick={() => handleTabChange(tab)}
            >
              {TAB_LABELS[tab]}
            </Button>
          ))}
        </div>
      }
      filter={
        <div className="min-w-60 max-w-xl space-y-1">
          <label htmlFor="memo-report-search" className="text-[length:var(--font-size-body)] font-medium">
            보고 제목 · 작성자
          </label>
          <Input
            id="memo-report-search"
            value={searchKeyword}
            onChange={(e) => handleSearchChange(e.target.value)}
            aria-label="보고 제목 또는 작성자 검색"
            placeholder="입력하면 바로 조회됩니다"
          />
        </div>
      }
      toolbarActions={
        <span className="text-[length:var(--font-size-body)] text-muted-foreground">
          현재 페이지 미열람 <span className="font-bold text-foreground">{unreadOnPage}</span>건
        </span>
      }
    >
      <div role="tabpanel" id="memo-report-tabpanel" aria-labelledby={`memo-report-tab-${activeTab}`}>
        <StandardDataTable
          accessibleLabel="메모 보고 목록"
          columns={columns}
          data={displayItems}
          loading={isLoading}
          error={isError ? (error as Error) : null}
          onRetry={() => refetch()}
          emptyMessage={emptyResultMessage(debouncedKeyword, '등록된 메모 보고가 없습니다.')}
          keyField="memoRptSn"
          pagination={{
            currentPage: page,
            totalPages: totalPages,
            // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
            pageSize,
            onPageChange: (p) => updateUrl({ page: p }),
            // 페이지당 건수는 URL 계약 밖의 화면 상태다 — 바꾸면 1페이지로 되돌린다.
            onPageSizeChange: (size) => { setPageSize(size); updateUrl({ page: 1 }); },
            pageSizeOptions: PAGE_SIZE_OPTIONS,
          }}
        />
      </div>
    </WorkListPage>
  );
}
