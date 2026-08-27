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
import { isAdministrativeRole } from '@/lib/auth/administrative-role';
import { StandardModal } from '@/app/components/ui/standard-modal';

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
  // [2026-08-28] 판정을 SSOT 로 옮긴다. 종전 리터럴 비교는 SYSTEM·ROLE_SYSTEM 을 빠뜨려
  //   **권한 있는 SYSTEM 관리자에게 '전체' 탭이 사라졌다** — 라우트는 열어 주는데 화면만
  //   막히는 비대칭이고, 조용히 죽는 결함이다(DEC-OPS-023).
  const isAdmin = isAdministrativeRole(user?.role);

  /*
   * [2026-08-28] 상세 열람 배선.
   * 종전에는 행을 여는 어포던스가 **물리적으로 없었다**(onRowClick 미전달 → StandardDataTable 이
   * 액션 셀 자체를 렌더하지 않는다). 그래서 보고 본문(rptCn)을 읽을 방법이 없었고, 화면 설명이
   * 약속한 '지시사항'(drctnMttr)도 어디에도 표시되지 않았다. 목록이 보여 주는 '미열람' 상태를
   * 해소할 방법도 없었다 — 열람 기록은 GET /{memoRptSn} 이 남기는데 그 호출부가 0건이었다.
   * getMemoReport 는 프런트 서비스에 이미 있었다.
   */
  const [detailTarget, setDetailTarget] = useState<MemoReportInfo | null>(null);
  const {
    data: detail,
    isFetching: isDetailLoading,
    error: detailError,
    refetch: refetchDetail,
  } = useQuery({
    queryKey: ['memo-report-detail', detailTarget?.memoRptSn],
    enabled: detailTarget?.memoRptSn != null,
    queryFn: () => memoReportService.getMemoReport(detailTarget!.memoRptSn),
  });

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
          {/*
            [2026-08-28] '수신확인' → '열람됨'. 서버는 **열람 주체를 구분하지 않는다** —
            GET /{memoRptSn} 이 readMemoReport 를 호출하고, 그것은 작성자·수신자·관리자 중
            누구가 열어도 rptrInqDt 를 갱신한다(MemoReportService.readMemoReport). 즉 작성자가
            자기 보고를 다시 열기만 해도 '수신확인'으로 보였다.
          */}
          {report.rptrInqDt ? '열람됨' : '미열람'}
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
          <span className="ml-2 text-xs">(열람 기록은 수신자·작성자·관리자 누구의 열람이든 남습니다)</span>
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
          onRowClick={(report) => setDetailTarget(report)}
          rowActionLabel={(report) => `${report.rptTtl || `${report.memoRptSn}번`} 보고 열기`}
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

      {detailTarget !== null && (
        <StandardModal
          isOpen
          onClose={() => setDetailTarget(null)}
          title={detailTarget.rptTtl || `${detailTarget.memoRptSn}번 보고`}
          maxWidth="2xl"
          footer={
            <Button type="button" variant="outline" onClick={() => setDetailTarget(null)} className="w-full">
              닫기
            </Button>
          }
        >
          {detailError ? (
            <div className="space-y-3 py-4">
              <p className="text-sm font-medium text-destructive-emphasis">보고를 불러오지 못했습니다.</p>
              <Button type="button" variant="outline" size="sm" onClick={() => void refetchDetail()}>
                다시 시도
              </Button>
            </div>
          ) : isDetailLoading ? (
            <p className="py-6 text-sm text-muted-foreground">불러오는 중…</p>
          ) : (
            <div className="space-y-6 py-2">
              <dl className="grid gap-3 rounded-md bg-muted p-4 sm:grid-cols-2">
                <div>
                  <dt className="text-xs text-muted-foreground">작성자</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{detail?.wrterNm || detail?.userId || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">수신자</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground">{detail?.rptrNm || detail?.rptrId || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">보고 일자</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">{detail?.memoRptYmd || '-'}</dd>
                </div>
                <div>
                  <dt className="text-xs text-muted-foreground">열람 기록</dt>
                  <dd className="mt-1 text-sm font-semibold text-foreground tabular-nums">
                    {detail?.rptrInqDt ? String(detail.rptrInqDt).replace('T', ' ').slice(0, 16) : '없음'}
                  </dd>
                </div>
              </dl>

              <section aria-labelledby="memo-report-body-heading" className="space-y-2">
                <h3 id="memo-report-body-heading" className="text-sm font-bold text-foreground">보고 내용</h3>
                <p className="whitespace-pre-wrap rounded-md border border-border p-4 text-sm text-foreground">
                  {detail?.rptCn || '내용이 없습니다.'}
                </p>
              </section>

              <section aria-labelledby="memo-report-instruction-heading" className="space-y-2">
                <h3 id="memo-report-instruction-heading" className="text-sm font-bold text-foreground">지시사항</h3>
                {detail?.drctnMttr ? (
                  <p className="whitespace-pre-wrap rounded-md border border-border p-4 text-sm text-foreground">
                    {detail.drctnMttr}
                  </p>
                ) : (
                  // 지시사항을 남기는 경로(PATCH /instr-cn)는 아직 화면에 없다. 빈칸으로 두면
                  // 사용자는 '아직 안 왔다'와 '남길 방법이 없다'를 구분할 수 없다.
                  <p className="rounded-md border border-dashed border-border p-4 text-sm text-muted-foreground">
                    등록된 지시사항이 없습니다. 지시사항을 남기는 기능은 아직 화면에 제공되지 않습니다.
                  </p>
                )}
              </section>
            </div>
          )}
        </StandardModal>
      )}
    </WorkListPage>
  );
}
