'use client';

import React from 'react';
import { useQueries, useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Database, LayoutDashboard, RefreshCcw, Users, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { statsAdminService, type UserActivityStats } from '@/services/foundation/system/StatsAdminService';
import { isStatsHubTab, type StatsHubTab, type StatsPanelQuery, type StatsSeriesPoint } from '@/extensions/slots';
import { useSlotEntries } from '@/extensions/use-slot-entries';
import { statsPanels } from '@/extensions/generated-stats-panels';
import { useOptionalAuth } from '@/contexts/AuthContext';
import { ReportPage } from '@/app/components/patterns/report-page';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { pickAllowedParams } from '@/lib/navigation/allowlist-params';
import { EMPTY_PERIOD, PeriodFilter, periodProblem, type PeriodValue } from '@/app/components/patterns/period-filter';
import { StatsHubFallback } from './StatsHubFallback';
import { StatsHubNavigationProvider } from './StatsHubParts';

/**
 * 통계 셸 — 통계 개요(/admin/stats)와 하위 화면(/admin/stats/user·screen 과 기능이 넘기는 탭)을 같은 내비게이션 아래 A7 현황 화면
 * (ReportPage: 조회 조건 → 요약 → 차트 → 원본 표)으로 그린다.
 *
 * [2026-10-20] 하위 화면을 A7 셸로 옮겼다. 종전에는 셸 없이 직접 조립했고 장식(기울인 아이콘 상자, 올라가는 카드, 굵기 900 의 축 글자,
 * 밑줄 접두 라벨)과 모든 탭에 걸친 요약 카드·옆 카드가 있었다. 이제 요약은 그 탭이 그리는 계열의 것이고(기간 합계·일 평균·가장 많은 날),
 * 차트와 원본 표가 같은 조회 조건을 따른다. '통계 개요' 탭은 종전에 내비게이션 없는 다른 화면으로 떨어져 되돌아갈 길이 끊겼다 — 이제
 * 개요 라우트도 이 셸이 같은 내비게이션과 함께 그린다 — 서버가 그린 요약 화면(AdminStatsClient)을 받아 그 둘레에 내비게이션을 둔다
 * (StatsHubNavigationProvider). 셸은 요약 화면을 import 하지 않는다 — 요약 칸(overview-card)의 귀속이 하위 화면에 번지지 않게.
 */

/**
 * 이 라우트가 URL 에 싣는 쿼리 키 전수. 탭 하나만 읽는다.
 *
 * 종전에는 들어온 쿼리를 통째로 복사해 재발행했다 — 모르는 이름이 한 번 들어오면 이동마다
 * 다시 붙는 캐리어였다(DEC-OPS-029 Q2). 새 파라미터를 도입하면 이 목록에 함께 넣어야 하고,
 * 빠뜨리면 이동 시 조용히 사라진다.
 */
const HUB_PARAM_KEYS = ['tab'] as const;

/** 한 번에 묻는 기간의 상한(시작·종료일 포함). 서버(ReportStatsService.MAX_PERIOD_DAYS)와 같은 값이다 — 넘으면 서버가 400 이다. */
const MAX_PERIOD_DAYS = 366;

/** 원본 표의 페이지당 건수(통계 개요와 같다). */
const TABLE_PAGE_SIZE = 10;

// --- Tabs ---
/**
 * 셸 고유 탭과 라우트 (감사 P1-7).
 *
 * 통계는 탭이 곧 라우트다(`/admin/stats/*` 메뉴). 따라서 탭 전환은 로컬 state 가 아니라 그 라우트로의 `router.push`
 * 로 처리해야 공유·새로고침·뒤로가기가 복원되고 사이드바 메뉴 활성 표시도 유지된다.
 *
 * [허브 분해 H4] 기능 탭은 그 기능의 stats-panels 기여다 — 셸은 기능 탭의 이름도 서비스도 모른다. 기능이 빠진 구성에서는 기여 파일이
 * 함께 지워져 그 탭만 사라진다. order 로 기여와 합쳐 내비게이션 순서를 정한다. 전용 라우트가 없는 기능 탭(body)은 현재 경로의
 * `?tab=<id>` 쿼리로 연다(없는 라우트를 만들어 메뉴 SSOT 를 흔들지 않기 위함 — 감사 §6 D-6). [2026-10-20] `?tab=` 은 그 본문 탭만
 * 고른다 — 라우트가 있는 탭은 그 라우트가 고른다(주소와 화면·메뉴 활성이 갈리지 않게).
 */
type CoreStatsTab = 'DASHBOARD' | 'USER_STATS' | 'SYSTEM_STATS';

const CORE_TABS: readonly {
  readonly id: CoreStatsTab;
  readonly order: number;
  readonly label: string;
  readonly title: string;
  readonly icon: LucideIcon;
  readonly route: string;
}[] = [
  { id: 'DASHBOARD', order: 10, label: '통계 개요', title: '통계 개요', icon: LayoutDashboard, route: '/admin/stats' },
  { id: 'USER_STATS', order: 20, label: '사용자 통계', title: '사용자 통계 분석', icon: Users, route: '/admin/stats/user' },
  { id: 'SYSTEM_STATS', order: 40, label: '시스템 활성', title: '시스템 활성 지표', icon: Database, route: '/admin/stats/screen' },
];

/**
 * 사용자 활동의 계열 — 요청 구분(ProcessTypeCode 의 HTTP 메서드 매핑). 서버가 같은 질의에서 네 계열을 함께 낸다(UserActivityStats).
 * 종전에는 질의가 조회 수까지 가져오고도 등록 수 하나만 실었다(OCI 실측 조회 5,720 · 등록 31) — 이제 화면이 계열을 고른다.
 */
const USER_SERIES = [
  { key: 'inqCnt', label: '조회 요청', method: 'GET·HEAD' },
  { key: 'crtCnt', label: '등록 요청', method: 'POST' },
  { key: 'mdfcnCnt', label: '수정 요청', method: 'PUT·PATCH' },
  { key: 'delCnt', label: '삭제 요청', method: 'DELETE' },
] as const satisfies readonly { key: keyof UserActivityStats; label: string; method: string }[];
type UserSeriesKey = (typeof USER_SERIES)[number]['key'];

/** 셸 탭이 그리는 계열의 이름·설명·집계 기준. 무엇을 어디서 센 값인지 A7 의 basis 가 말한다. */
const CONNECT_SERIES = {
  name: '성공 로그인',
  description: '일자별 성공 로그인 수를 봅니다.',
  basis: '집계 기준: 일자별 성공 로그인 수 · 실패·결과 미상 시도 제외 · 기록이 없는 날은 0 · 출처: 로그인 로그',
} as const;

function userSeriesMeta(key: UserSeriesKey) {
  const series = USER_SERIES.find((item) => item.key === key) ?? USER_SERIES[0];
  return {
    name: series.label,
    description: '인증 사용자의 일자별 API 요청 수를 요청 구분별로 봅니다.',
    basis: `집계 기준: 인증 사용자의 일자별 ${series.label} 수(HTTP ${series.method}) · 실패한 요청 포함 · 기본 1분 주기로 반영`
      + ' · 기록이 없는 날은 0 · 출처: 사용자 활동 로그',
  };
}

/** 셸이 기능 탭만 고르는 술어. 모듈 값이라 렌더마다 같다(useSlotEntries 결과가 안정된다). */
const isHubPanel = isStatsHubTab;

/*
 * 미수집 판정. 셸 탭은 모두 값을 쓰는 쪽이 있다 — 미수집 여부는 기능 탭의 기여가 밝힌다(uninstrumented).
 *
 * 값이 있는 셸 탭은 둘이다.
 *   - SYSTEM_STATS → loginLog. LogService 가 실제로 기록한다.
 *   - USER_STATS   → [2026-09-25] UserActivityLogAggregator 가 인증 사용자의 API 요청을 tb_user_log 에 일자별로 적재한다.
 *     [2026-10-20] 조회·등록·수정·삭제 네 계열을 낸다.
 *   ⚠ "지금 그 표에 행이 있는가" 가 아니라 "쓰는 쪽이 있는가" 가 이 판정의 기준이다. 운영 DB 가 비어 있는 것은 '미수집' 이 아니라
 *     '아직 기록이 없음' 이고, 서버가 그 날을 0 으로 채운다.
 *
 * 미수집 탭에서 '선택한 기간에 집계된 통계가 없습니다' 라고 하면 **기간을 바꾸면 나온다는 뜻**이 되어, 사용자가 기간만 계속 바꾸게
 * 만든다. 수집 자체가 없다는 사실을 그대로 말하고, 요약 값도 0 이 아니라 '미수집' 이다(측정하지 않은 값을 0 으로 말하지 않는다).
 */
const UNINSTRUMENTED_MESSAGE = '이 지표는 아직 수집되지 않습니다. 기간을 바꿔도 결과는 달라지지 않습니다.';
const PERIOD_EMPTY_MESSAGE = '선택한 기간에 집계된 통계가 없습니다.';
const UNMEASURED_SUMMARY = { total: '미수집', average: '미수집', peak: '미수집' } as const;

/** 시작·종료일을 포함한 일수. 형식이 틀리면 NaN 이다. */
function periodDays(period: PeriodValue): number {
  const toUtc = (value: string) => {
    const [year, month, day] = value.split('-').map(Number);
    return Date.UTC(year, month - 1, day);
  };
  return (toUtc(period.to) - toUtc(period.from)) / 86_400_000 + 1;
}

/** 요약 지표 — 기간 합계·일 평균·가장 많은 날. 표와 차트가 그리는 값과 같은 배열에서 센다(A7 합격: 차트 값과 표 합계 일치). */
function seriesSummary(points: readonly StatsSeriesPoint[]) {
  const total = points.reduce((sum, point) => sum + point.value, 0);
  const peak = points.reduce<StatsSeriesPoint | null>((best, point) => (best === null || point.value > best.value ? point : best), null);
  return {
    total: total.toLocaleString(),
    average: points.length === 0 ? '-' : (total / points.length).toLocaleString(undefined, { maximumFractionDigits: 1 }),
    peak: peak === null || peak.value === 0 ? '없음' : `${peak.date} (${peak.value.toLocaleString()}건)`,
  };
}

export default function IntelligenceHubClient({
  defaultTab = 'DASHBOARD',
  overview,
}: {
  defaultTab?: string;
  /** 통계 개요 라우트가 서버에서 그린 요약 화면. 이 값이 있을 때만 '통계 개요' 를 연다(하위 라우트에는 없다). */
  overview?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  // 기능 탭(stats-panels 기여). 노출은 기여의 술어(그 화면·권한)로 판정한다 — 라우트 게이트와 같은 판정이다.
  const panels: StatsHubTab[] = useSlotEntries(statsPanels, isHubPanel);
  const authPending = useOptionalAuth()?.loading === true;
  const tabs = [
    ...CORE_TABS.map((tab) => ({ id: tab.id as string, order: tab.order, label: tab.label, icon: tab.icon })),
    ...panels.map((panel) => ({ id: panel.id, order: panel.order, label: panel.label, icon: panel.icon })),
  ].sort((left, right) => left.order - right.order);

  /*
   * 활성 탭은 URL 파생값이다(로컬 state 금지 — 뒤로가기/공유 복원 불가). `?tab=` 은 본문 탭만 고르고, 나머지는 라우트의 기본 탭이다.
   * 이 구성에 없는 탭이면(기능이 빠졌거나 노출 술어가 거부) 통계 개요로, 개요 자료가 없는 하위 라우트에서는 성공 로그인으로 연다.
   */
  const tabParam = searchParams.get('tab');
  const hasOverview = overview != null;
  const fallbackTab = hasOverview ? 'DASHBOARD' : 'SYSTEM_STATS';
  const isOpenable = (id: string) => tabs.some((tab) => tab.id === id) && (id !== 'DASHBOARD' || hasOverview);
  const isBodyTab = (id: string | null): id is string => !!id && panels.some((panel) => panel.id === id && panel.kind === 'body');
  const activeTab: string = isBodyTab(tabParam) ? tabParam : isOpenable(defaultTab) ? defaultTab : fallbackTab;
  const activeCore = CORE_TABS.find((tab) => tab.id === activeTab);
  const activePanel = panels.find((panel) => panel.id === activeTab);

  const handleSelectTab = (tab: string) => {
    if (tab === activeTab) return;
    const route = CORE_TABS.find((core) => core.id === tab)?.route
      ?? panels.find((panel): panel is Extract<StatsHubTab, { kind: 'series' }> => panel.id === tab && panel.kind === 'series')?.href;
    if (route) {
      router.push(route, { scroll: false });
      return;
    }
    const params = pickAllowedParams(searchParams, HUB_PARAM_KEYS);
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  /*
   * [2026-09-26 DIP B5 F6] 집계 기간. 양쪽을 다 고른 올바른 기간만 보낸다 — 한쪽만 고르거나 역순이거나 366일을 넘으면 기본값을
   * 집계하고 그 이유를 말한다. '전체' 프리셋은 두지 않는다(비우면 전체가 아니라 기본값이다).
   */
  const [period, setPeriod] = React.useState<PeriodValue>(EMPTY_PERIOD);
  const periodTooLong = !!period.from && !!period.to && !periodProblem(period) && periodDays(period) > MAX_PERIOD_DAYS;
  const appliedRange = period.from && period.to && !periodProblem(period) && !periodTooLong
    ? { fromDate: period.from, toDate: period.to }
    : undefined;
  const [userSeries, setUserSeries] = React.useState<UserSeriesKey>('inqCnt');

  // --- Data Fetching ---
  // ⚠ 여기서 호출하는 경로는 StatisticsApiController 에 실제로 매핑된 것만 사용한다(/user, /connect — 기능 탭은 기여의 로더).
  // [2026-10-20] 요약이 탭마다 그 탭의 계열이 되어, 조회도 그 탭이 열렸을 때만 한다(종전의 모든 탭 요약 카드는 걷었다).
  const userQuery = useQuery({
    queryKey: ['admin-stats-user', appliedRange],
    queryFn: () => statsAdminService.getUserStats(appliedRange),
    enabled: activeTab === 'USER_STATS',
  });
  // `/connect` 는 성공 로그인 건수다. 화면 조회 요청이나 실패 시도는 이 집계에 포함되지 않는다.
  const connectQuery = useQuery({
    queryKey: ['admin-stats-connect', appliedRange],
    queryFn: () => statsAdminService.getConnectStats(appliedRange),
    enabled: activeTab === 'SYSTEM_STATS',
  });

  /*
   * 기능 탭의 조회. 셸이 한 번(useQueries)에 소유한다 — 기여는 데이터라 훅을 넘길 수 없고, 셸이 기여 수만큼 훅을 부르면 hook 규칙을
   * 어긴다. 그 탭이 열렸을 때만 조회한다. 결과 배열은 보이는 패널 순서이고, 아래는 패널과 짝을 지어 쓴다.
   */
  const panelResults = useQueries({
    queries: panels.map((panel) => (panel.kind === 'series'
      ? { queryKey: [...panel.queryKey, appliedRange], queryFn: () => panel.load(appliedRange), enabled: activeTab === panel.id }
      : { queryKey: [...panel.queryKey], queryFn: () => panel.load(), enabled: activeTab === panel.id })),
  });
  const panelQuery = (id: string): StatsPanelQuery | undefined => panelResults[panels.findIndex((panel) => panel.id === id)];
  const activePanelQuery = activePanel ? panelQuery(activePanel.id) : undefined;
  const activeBody = activePanel?.kind === 'body' ? activePanel : undefined;

  // 원본 표의 페이지 — 탭·기간·계열이 바뀌면 첫 페이지다(효과 없이 키로 되돌린다).
  const pageKey = JSON.stringify([activeTab, appliedRange ?? null, userSeries]);
  const [pageState, setPageState] = React.useState({ key: pageKey, page: 1 });
  const page = pageState.key === pageKey ? pageState.page : 1;

  // 새로고침은 꺼진 탭의 조회까지 모두 다시 부른다(refetch 는 enabled 와 무관하게 실행한다 — invalidate 는 꺼진 조회를 건너뛴다).
  const handleForceRefresh = () => {
    void Promise.all([
      userQuery.refetch(),
      connectQuery.refetch(),
      ...panelResults.map((result) => result.refetch()),
    ]);
  };

  // 권한 상태를 아직 모르면(서버가 사용자를 넘기지 못해 다시 확인하는 동안) 기능 탭이 아직 보이지 않는다. 요청한 탭(그 라우트의 기본
  // 탭이나 `?tab=`)이 아직 탭이 아니면 다른 탭으로 떨어뜨려 다른 제목·차트를 잠깐 보이지 않고 진입 골격을 그린다.
  const requestedTab = tabParam ?? defaultTab;
  if (authPending && !tabs.some((tab) => tab.id === requestedTab)) return <StatsHubFallback />;

  const navigation = <StatsHubNavigation tabs={tabs} activeTab={activeTab} onSelect={handleSelectTab} />;
  const breadcrumbItems = [{ label: '시스템관리' }, { label: '분석 대시보드' }];
  const refreshButton = (fetching: boolean) => (
    <Button variant="outline" size="sm" onClick={handleForceRefresh} aria-busy={fetching || undefined} className="gap-2">
      <RefreshCcw size={16} className={cn(fetching && 'animate-spin')} aria-hidden="true" /> 통계 새로고침
    </Button>
  );

  // 통계 개요 — 요약 화면이 같은 내비게이션을 받는다(새로고침·반출은 그 화면이 소유한다).
  if (activeTab === 'DASHBOARD' && hasOverview) {
    return <StatsHubNavigationProvider value={navigation}>{overview}</StatsHubNavigationProvider>;
  }

  // 기능 본문 탭 — 본문이 원본이다. 집계 기간은 적용하지 않는다(기여의 basis 가 말한다).
  if (activeBody && activePanelQuery) {
    const ActiveBody = activeBody.Body;
    return (
      <ReportPage
        title={activeBody.title}
        breadcrumbItems={breadcrumbItems}
        navigation={navigation}
        basis={activeBody.basis}
        actions={
          <>
            {refreshButton(activePanelQuery.isFetching)}
            <DataExportExcel
              scope="loaded"
              data={activeBody.exportRows(activePanelQuery.data)}
              headers={activeBody.exportHeaders.map((header) => ({ ...header }))}
              filename={`stats_${activeTab.toLowerCase()}`}
            />
          </>
        }
      >
        <ActiveBody query={activePanelQuery} />
      </ReportPage>
    );
  }

  // 일자별 계열 탭 — 셸 탭(사용자·성공 로그인) 또는 기능의 series 탭.
  const meta = activeTab === 'USER_STATS'
    ? userSeriesMeta(userSeries)
    : activePanel?.kind === 'series'
      ? { name: activePanel.seriesName ?? activePanel.label, description: undefined, basis: activePanel.basis }
      : CONNECT_SERIES;
  const title = activeCore?.title ?? activePanel?.title ?? '';
  const seriesQuery: StatsPanelQuery = activeTab === 'USER_STATS'
    ? userQuery
    : activePanel?.kind === 'series' && activePanelQuery ? activePanelQuery : connectQuery;
  // 서버가 날짜 오름차순으로 내고 측정하는 계열은 빈 날을 0 으로 채운다 — 받은 순서·형식 그대로 그린다(정렬·보정을 두지 않는다).
  const points: readonly StatsSeriesPoint[] = activeTab === 'USER_STATS'
    ? (userQuery.data?.[userSeries] ?? [])
    : ((seriesQuery.data as readonly StatsSeriesPoint[] | undefined) ?? []);

  const isUninstrumentedTab = activePanel?.kind === 'series' && activePanel.uninstrumented;
  const emptyMessage = isUninstrumentedTab ? UNINSTRUMENTED_MESSAGE : PERIOD_EMPTY_MESSAGE;
  const summary = isUninstrumentedTab
    ? UNMEASURED_SUMMARY
    : seriesQuery.isLoading
      ? { total: '…', average: '…', peak: '…' }
      : seriesQuery.isError
        ? { total: '조회 실패', average: '조회 실패', peak: '조회 실패' }
        : seriesSummary(points);
  const periodText = appliedRange
    ? `집계 구간: ${appliedRange.fromDate} ~ ${appliedRange.toDate}`
    : '집계 구간: 최근 1개월(기간을 고르지 않으면 서버 기본값)';

  const totalPages = Math.max(1, Math.ceil(points.length / TABLE_PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedPoints = points.slice((currentPage - 1) * TABLE_PAGE_SIZE, currentPage * TABLE_PAGE_SIZE);
  // 축 눈금은 'MM-DD' 다 — 30일치 축에 연도까지 넣으면 라벨이 겹친다. 연도는 집계 구간이 소유한다.
  const chartData = points.map((point) => ({ name: point.date.slice(5), [meta.name]: point.value }));
  // 내보내기는 "지금 화면에 보이는 데이터"만 반출한다(감사 P1-6).
  const exportRows = points.map((point) => ({ date: point.date, value: point.value }));
  const columns = [
    { header: '집계 일자', accessor: (point: StatsSeriesPoint) => <span className="tabular-nums">{point.date}</span> },
    {
      header: `${meta.name} 건수`,
      accessor: (point: StatsSeriesPoint) => <span className="font-semibold tabular-nums">{point.value.toLocaleString()}</span>,
    },
  ];

  return (
    <ReportPage
      title={title}
      description={meta.description}
      breadcrumbItems={breadcrumbItems}
      navigation={navigation}
      actions={
        <>
          {refreshButton(seriesQuery.isFetching)}
          <DataExportExcel
            scope="loaded"
            data={exportRows}
            headers={[
              { label: '집계 일자', key: 'date' },
              { label: `${meta.name} 건수`, key: 'value' },
            ]}
            filename={`stats_${activeTab.toLowerCase()}`}
          />
        </>
      }
      filter={
        <div className="flex flex-wrap items-end gap-4">
          {activeTab === 'USER_STATS' && <UserSeriesPicker value={userSeries} onChange={setUserSeries} />}
          <div className="space-y-1">
            <PeriodFilter label="집계 기간" value={period} onChange={setPeriod} presets={['1d', '1w', '1m']} />
            {periodTooLong && (
              <p role="status" className="text-xs text-destructive-emphasis">
                조회 기간은 최대 {MAX_PERIOD_DAYS}일입니다. 기간을 줄이기 전까지 최근 1개월을 집계합니다.
              </p>
            )}
          </div>
        </div>
      }
      summary={
        <div className="grid gap-2 sm:grid-cols-3">
          <SummaryStat title="기간 합계" value={summary.total} />
          <SummaryStat title="일 평균" value={summary.average} />
          <SummaryStat title="가장 많은 날" value={summary.peak} />
        </div>
      }
      basis={`${meta.basis} · ${periodText}`}
      chartTitle="일자별 추이"
      chart={!seriesQuery.isError && (seriesQuery.isLoading || points.length > 0) ? (
        <StandardChartWrapper
          title={`일자별 ${meta.name} 건수 추이`}
          type="area"
          data={chartData}
          dataKeys={[meta.name]}
          loading={seriesQuery.isLoading}
          height={320}
        />
      ) : undefined}
      tableTitle={`일자별 ${meta.name} 건수`}
    >
      {/* 조회 실패를 "데이터 없음"으로 위장하지 않는다 — error/onRetry 전달(감사 P1-1) */}
      <StandardDataTable
        accessibleLabel={`일자별 ${meta.name} 건수`}
        columns={columns}
        data={pagedPoints}
        keyField="date"
        loading={seriesQuery.isLoading}
        error={seriesQuery.isError ? new Error('통계 데이터를 불러오지 못했습니다.') : null}
        onRetry={() => void seriesQuery.refetch()}
        pagination={{
          currentPage,
          totalPages,
          onPageChange: (next) => setPageState({ key: pageKey, page: next }),
          // 조회에 실패하면 총 건수는 0 이 아니라 알 수 없다 — 넘기지 않아 "총 0건" 을 그리지 않는다.
          totalCount: seriesQuery.isError ? undefined : points.length,
          pageSize: TABLE_PAGE_SIZE,
        }}
        emptyMessage={emptyMessage}
      />
    </ReportPage>
  );
}

// --- Sub-components ---

/**
 * 통계 내비게이션. 탭이 곧 라우트이므로(각 항목이 서로 다른 URL 로 이동) role="tablist" 가 아니라 내비게이션 시맨틱 + aria-current 가
 * 정확한 표현이다(감사 P2 탭 시맨틱, DEC-OPS-361 의 '라우트 링크는 탭이 아니다').
 */
function StatsHubNavigation({ tabs, activeTab, onSelect }: {
  tabs: readonly { id: string; label: string; icon: LucideIcon }[];
  activeTab: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav aria-label="통계 분석 뷰" className="flex w-fit max-w-full flex-wrap rounded-md border border-border bg-muted/50 p-0.5">
      {tabs.map(({ id, label, icon: Icon }) => (
        <NavButton key={id} icon={<Icon size={14} />} label={label} active={activeTab === id} onClick={() => onSelect(id)} />
      ))}
    </nav>
  );
}

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'flex h-[var(--control-h-sm)] items-center gap-1.5 rounded px-3 text-[length:var(--font-size-body)] transition-colors',
        active ? 'bg-background font-semibold text-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground',
      )}
    >
      <span className={cn('shrink-0', active ? 'text-primary' : 'text-muted-foreground')} aria-hidden="true">{icon}</span>
      <span>{label}</span>
    </button>
  );
}

/** 사용자 활동의 계열 고르기. 차트·표·요약·반출이 함께 따른다(조회 조건 슬롯 하나 — A7). */
function UserSeriesPicker({ value, onChange }: { value: UserSeriesKey; onChange: (next: UserSeriesKey) => void }) {
  return (
    <div className="space-y-1">
      <span className="block text-[length:var(--font-size-body)] font-medium">요청 구분</span>
      <div role="group" aria-label="요청 구분" className="flex rounded-md border border-border p-0.5">
        {USER_SERIES.map((series) => (
          <button
            key={series.key}
            type="button"
            aria-pressed={value === series.key}
            onClick={() => onChange(series.key)}
            className={cn(
              'flex h-[var(--control-h-sm)] items-center rounded px-3 text-xs font-bold transition-colors',
              value === series.key ? 'bg-muted text-foreground' : 'text-muted-foreground hover:text-foreground',
            )}
          >
            {series.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/**
 * 요약 지표 한 칸(통계 개요와 같은 모양). 값의 출처는 ReportPage 의 basis 가 설명한다.
 * ⚠ 증감(trend) 배지는 두지 않는다 — 비교 기준 기간을 백엔드가 제공하지 않아 과거 하드코딩 "+12%" 류가 거짓 지표가 됐다(감사 P1-5).
 */
function SummaryStat({ title, value }: { title: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-card px-4 py-3">
      <p className="text-[length:var(--font-size-body)] text-muted-foreground">{title}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
