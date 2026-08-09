'use client';

import { useCallback, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, Mail, Inbox, Zap, Layers } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useDebouncedValue } from '@/lib/hooks/use-debounced-value';
import { memoReportService, MemoReportInfo } from '@/services/business/memoreport/memoReportService';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { PageHeader } from '@/app/components/layout/page-header';
import { useAuth } from '@/contexts/AuthContext';

const TABS = ['RECEIVED', 'MY', 'ALL'] as const;
type ReportTab = (typeof TABS)[number];

const TAB_LABELS: Record<ReportTab, string> = {
  RECEIVED: '수신함',
  MY: '발신함',
  ALL: '전체',
};

const PAGE_SIZE = 10;

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
    queryKey: ['memo-reports', activeTab, debouncedKeyword, page],
    queryFn: () => {
      const params = { searchKeyword: debouncedKeyword, page: page - 1, size: PAGE_SIZE };
      if (activeTab === 'MY') return memoReportService.getMyReports(params);
      if (activeTab === 'RECEIVED') return memoReportService.getReceivedReports(params);
      return memoReportService.getMemoReports(params);
    },
    // 비관리자가 '전체'로 진입해 403 을 맞는 상황 자체를 만들지 않는다.
    enabled: activeTab !== 'ALL' || isAdmin,
  });

  const displayItems: MemoReportInfo[] = reportsData?.list ?? [];
  const totalItems = reportsData?.total ?? 0;
  const totalPages = Math.ceil(totalItems / PAGE_SIZE);
  const unreadOnPage = displayItems.filter((r) => !r.rptrInqDt).length;

  const columns: Column<MemoReportInfo>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs font-bold text-muted-foreground">
          {index !== undefined ? (index + 1 + (page - 1) * PAGE_SIZE).toString().padStart(2, '0') : '-'}
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
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="메모 보고 관리"
        breadcrumbs={[{ label: '운영지원' }, { label: '메모보고' }]}
      />

      <HubHeader
        title="메모 보고"
        highlight="Matrix"
        subtitle="사내 엔터프라이즈 통합 커뮤니케이션 및 보고 내역을 관리합니다."
        icon={Mail}
        actions={
          <div className="flex bg-muted p-1 rounded-xl border-2 border-border" role="tablist" aria-label="메모 보고 구분">
            {TABS.filter((tab) => tab !== 'ALL' || isAdmin).map((tab) => (
              <Button
                key={tab}
                role="tab"
                id={`memo-report-tab-${tab}`}
                aria-selected={activeTab === tab}
                aria-controls="memo-report-tabpanel"
                variant="ghost"
                size="sm"
                className={cn("h-9 rounded-lg px-6 font-bold text-xs", activeTab === tab && "bg-card shadow-sm text-primary")}
                onClick={() => handleTabChange(tab)}
              >
                {TAB_LABELS[tab]}
              </Button>
            ))}
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="전체 보고" value={totalItems} icon={Layers} color="primary" />
        <HubMetricCard title="미열람 (현재 페이지)" value={unreadOnPage} icon={Zap} color="amber" />
      </HubMetricGrid>

      <HubSectionCard
        title="리포트 스트림"
        description="수신된 보고 및 지시사항에 대한 실시간 데이터 유닛입니다."
        icon={Inbox}
        className="bg-card/60 backdrop-blur-md border border-border/60 shadow-xl ring-1 ring-black/5"
      >
        <div className="space-y-8" role="tabpanel" id="memo-report-tabpanel" aria-labelledby={`memo-report-tab-${activeTab}`}>
          <div className="flex items-center justify-between px-2 pt-2 border-b border-border/50 pb-10 mb-8">
            <div className="relative group max-w-xl w-full">
              <Search className="absolute left-6 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors" size={18} aria-hidden="true" />
              <Input
                value={searchKeyword}
                onChange={(e) => handleSearchChange(e.target.value)}
                aria-label="보고 제목 또는 작성자 검색"
                className="h-11 bg-muted/50 border-none rounded-xl pl-16 font-bold tracking-tight text-sm shadow-inner focus:ring-4 focus:ring-primary/10 transition-all"
                placeholder="보고 제목 또는 작성자 검색.."
              />
            </div>
          </div>

          <div className="min-h-[500px]">
            <StandardDataTable
              columns={columns}
              data={displayItems}
              loading={isLoading}
              error={isError ? (error as Error) : null}
              onRetry={() => refetch()}
              emptyMessage="등록된 메모 보고가 없습니다."
              keyField="rptId"
              isPremium={true}
              className="bg-transparent border-none shadow-none"
              pagination={{
                currentPage: page,
                totalPages: totalPages,
                totalCount: totalItems,
                pageSize: PAGE_SIZE,
                onPageChange: (p) => updateUrl({ page: p })
              }}
            />
          </div>
        </div>
      </HubSectionCard>
    </div>
  );
}
