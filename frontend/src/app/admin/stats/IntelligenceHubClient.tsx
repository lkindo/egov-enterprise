'use client';

import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { BarChart3,
  Activity,
  Users,
  Monitor,
  Database,
  FileText,
  RefreshCcw,
  Zap,
  Box,
  LayoutDashboard,
  AlertTriangle,
  Inbox,
  HardDrive,
  Vote } from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { statsAdminService, type StatsDto } from '@/services/foundation/system/StatsAdminService';
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  AreaChart,
  Area } from 'recharts';
import { HubMetricSkeleton, HubListSkeleton } from '@/components/ui/hub/HubSkeleton';
import { SafeResponsiveContainer } from '@/app/components/ui/observability-charts';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { useChartColors } from '@/lib/hooks/useChartColors';
import { getPollStatus, POLL_STATUS_LABEL } from '@/lib/poll-status';
import { todayStorageYmd, toDisplayYmd } from '@/lib/format-date';

// --- Types ---
const STATS_TABS = [
  'DASHBOARD',
  'USER_STATS',
  'CONTENT_STATS',
  'SYSTEM_STATS',
  'DATA_USAGE',
  'SURVEYS',
  'REPORTS',
] as const;

type StatsTab = (typeof STATS_TABS)[number];

/**
 * 탭 ↔ 라우트 매핑 (감사 P1-7).
 *
 * 통계는 탭이 곧 라우트다(`/admin/stats/*` 6개 메뉴). 따라서 탭 전환은 로컬 state 가 아니라
 * `router.push(TAB_ROUTE_MAP[tab])` 로 처리해야 공유·새로고침·뒤로가기가 복원되고
 * 사이드바 메뉴 활성 표시도 유지된다.
 *
 * SURVEYS 만 전용 라우트가 없으므로 현재 경로의 `?tab=SURVEYS` 쿼리로 표현한다.
 * (없는 라우트를 만들어 메뉴 SSOT 를 흔들지 않기 위함 — 감사 §6 D-6)
 */
const TAB_ROUTE_MAP: Partial<Record<StatsTab, string>> = {
  DASHBOARD: '/admin/stats',
  USER_STATS: '/admin/stats/user',
  CONTENT_STATS: '/admin/stats/board',
  SYSTEM_STATS: '/admin/stats/screen',
  DATA_USAGE: '/admin/stats/data-usage',
  REPORTS: '/admin/stats/report',
};

const TAB_TITLE: Record<StatsTab, string> = {
  DASHBOARD: '글로벌 개요',
  USER_STATS: '사용자 통계 분석',
  CONTENT_STATS: '콘텐츠 지표 분석',
  SYSTEM_STATS: '시스템 활성 지표',
  DATA_USAGE: '자료이용현황 분석',
  SURVEYS: '설문조사 결과 분석',
  REPORTS: '운영 보고서 아카이브',
};

function isStatsTab(value: string | null): value is StatsTab {
  return !!value && (STATS_TABS as readonly string[]).includes(value);
}

/** X축 눈금 라벨: 'yyyyMMdd' → 'MM.DD' (표기 변환은 lib/format-date SSOT 경유) */
function formatAxisDate(value: unknown): string {
  const raw = String(value ?? '');
  const display = toDisplayYmd(raw, '', '.');
  return display ? display.slice(5) : raw;
}

export default function IntelligenceHubClient({ defaultTab = 'DASHBOARD' }: { defaultTab?: StatsTab }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const chartColors = useChartColors();

  // 활성 탭은 URL 파생값이다(로컬 state 금지 — 뒤로가기/공유 복원 불가).
  const tabParam = searchParams.get('tab');
  const activeTab: StatsTab = isStatsTab(tabParam) ? tabParam : defaultTab;

  // 날짜 판정 기준일(yyyyMMdd). SSR 과 클라이언트의 타임존이 다를 수 있어 마운트 후 고정한다.
  const [today, setToday] = useState<string>('');
  useEffect(() => {
    setToday(todayStorageYmd());
  }, []);

  const handleSelectTab = (tab: StatsTab) => {
    if (tab === activeTab) return;
    const route = TAB_ROUTE_MAP[tab];
    if (route) {
      router.push(route, { scroll: false });
      return;
    }
    const params = new URLSearchParams(searchParams.toString());
    params.set('tab', tab);
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  };

  // --- Data Fetching ---
  // ⚠ 여기서 호출하는 경로는 StatisticsApiController 에 실제로 매핑된 것만 사용한다.
  //    (/report, /data-usage, /bbs, /user, /connect, /summary — 2026-07-22 감사 P0-22)
  // 사용자/접속/자료이용 3종은 모든 탭에서 노출되는 상단 요약 카드의 소스이므로 탭과 무관하게 조회한다.
  // (탭 조건부로 두면 비활성 탭에서 값이 undefined 가 되어 "0" 이라는 거짓 지표가 표시된다.)
  const userQuery = useQuery({
    queryKey: ['admin-stats-user'],
    queryFn: () => statsAdminService.getUserStats()
  });

  const bbsQuery = useQuery({
    queryKey: ['admin-stats-bbs'],
    queryFn: () => statsAdminService.getBbsStats(),
    enabled: activeTab === 'CONTENT_STATS' || activeTab === 'DASHBOARD'
  });

  // 구 `getScreenStats()` 는 존재하지 않는 `/screen` 을 호출해 첫 진입마다 404 를 냈다.
  // 화면 요청 지표의 유일한 실존 소스인 `/connect` 로 재배선한다.
  const connectQuery = useQuery({
    queryKey: ['admin-stats-connect'],
    queryFn: () => statsAdminService.getConnectStats()
  });

  const dataUsageQuery = useQuery({
    queryKey: ['admin-stats-data-usage'],
    queryFn: () => statsAdminService.getDataUsageStats()
  });

  // REPORTS 탭 전용 쿼리 (없어서 다른 탭의 잔여 차트가 그려지던 문제 — 감사 P0-23)
  const reportQuery = useQuery({
    queryKey: ['admin-stats-report'],
    queryFn: () => statsAdminService.getReportStats(),
    enabled: activeTab === 'REPORTS'
  });

  const surveyQuery = useQuery({
    queryKey: ['admin-surveys'],
    queryFn: () => surveyAdminService.getSurveyList({}),
    enabled: activeTab === 'SURVEYS'
  });

  const userStats = userQuery.data;
  const connectStats = connectQuery.data;
  const dataUsage = dataUsageQuery.data;
  const surveys = surveyQuery.data;

  // 현재 탭이 실제로 그리는 시계열과 그 쿼리 상태 (로딩/에러 게이트의 단일 근거)
  const chartQuery =
    activeTab === 'USER_STATS' ? userQuery :
      activeTab === 'CONTENT_STATS' ? bbsQuery :
        activeTab === 'REPORTS' ? reportQuery :
          activeTab === 'DATA_USAGE' ? dataUsageQuery :
            connectQuery;
  const chartData: StatsDto[] = chartQuery.data ?? [];

  // 요약 카드는 실제 집계 합계만 표시한다(배열 길이는 "일수"일 뿐 지표가 아니다 — 감사 P0-22).
  const sumStatsCo = (rows?: StatsDto[]) => (rows ?? []).reduce((acc, row) => acc + (row.statsCo ?? 0), 0);
  const isSummaryLoading = userQuery.isLoading || connectQuery.isLoading || dataUsageQuery.isLoading;
  const isSummaryError = userQuery.isError || connectQuery.isError || dataUsageQuery.isError;
  const totalConnect = sumStatsCo(connectStats);

  const handleForceRefresh = () => {
    void Promise.all([
      userQuery.refetch(),
      bbsQuery.refetch(),
      connectQuery.refetch(),
      dataUsageQuery.refetch(),
      reportQuery.refetch(),
      surveyQuery.refetch(),
    ]);
  };

  // 내보내기는 "지금 화면에 보이는 데이터"만 반출한다(감사 P1-6 — 죽은 버튼을 기존 자산에 배선).
  const exportRows: Record<string, unknown>[] =
    activeTab === 'SURVEYS'
      ? (surveys?.list ?? []).map((s) => ({
        srvyId: s.srvyId,
        srvyTtl: s.srvyTtl,
        srvyBgngYmd: toDisplayYmd(s.srvyBgngYmd),
        srvyEndYmd: toDisplayYmd(s.srvyEndYmd),
      }))
      : chartData.map((row) => ({
        statsDate: toDisplayYmd(typeof row.statsDate === 'string' ? row.statsDate : ''),
        statsCo: row.statsCo ?? 0,
      }));

  const exportHeaders =
    activeTab === 'SURVEYS'
      ? [
        { label: '설문 ID', key: 'srvyId' },
        { label: '설문 제목', key: 'srvyTtl' },
        { label: '시작일', key: 'srvyBgngYmd' },
        { label: '종료일', key: 'srvyEndYmd' },
      ]
      : [
        { label: '집계 일자', key: 'statsDate' },
        { label: '집계 건수', key: 'statsCo' },
      ];

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-1000">
      {/* --- Header --- */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 px-2 md:px-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-11 bg-surface-inverse rounded-lg flex items-center justify-center shadow-2xl skew-x-2">
            <BarChart3 size={28} className="text-surface-inverse-foreground" />
          </div>
          <div>
            <h2 className="text-2xl font-bold text-foreground tracking-tighter">
              통계 <span className="text-primary">인텔리전스</span>
            </h2>
            <p className="text-xs font-bold text-muted-foreground tracking-tight mt-2">
              거버넌스 인사이트 및 데이터 분석
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-4">
          <DataExportExcel
            data={exportRows}
            headers={exportHeaders}
            filename={`stats_${activeTab.toLowerCase()}`}
            className="h-11 px-6 rounded-lg border-2 border-border bg-card font-bold tracking-tight flex items-center gap-2 text-sm hover:bg-accent transition-colors"
          />
          <Button
            onClick={handleForceRefresh}
            className="h-11 px-8 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight shadow-xl hover:-translate-y-1 transition-all gap-2"
          >
            <RefreshCcw size={20} className={cn(chartQuery.isFetching && 'animate-spin')} /> 강제 새로고침
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-12 gap-8 px-2">

        {/* --- Left Column: Navigation (20%) --- */}
        <div className="col-span-12 lg:col-span-3 space-y-6">
          {/*
            탭이 곧 라우트이므로(각 항목이 서로 다른 URL 로 이동) role="tablist" 가 아니라
            내비게이션 시맨틱 + aria-current 가 정확한 표현이다(감사 P2 탭 시맨틱).
          */}
          <nav aria-label="통계 분석 뷰" className="block">
            <Card className="rounded-lg border-0 bg-card shadow-2xl p-4 ring-1 ring-border">
              <NavButton icon={<LayoutDashboard size={20} />} label="글로벌 개요" active={activeTab === 'DASHBOARD'} onClick={() => handleSelectTab('DASHBOARD')} />
              <NavButton icon={<Users size={20} />} label="사용자 통계" active={activeTab === 'USER_STATS'} onClick={() => handleSelectTab('USER_STATS')} />
              <NavButton icon={<Box size={20} />} label="콘텐츠 지표" active={activeTab === 'CONTENT_STATS'} onClick={() => handleSelectTab('CONTENT_STATS')} />
              <NavButton icon={<Database size={20} />} label="시스템 활성" active={activeTab === 'SYSTEM_STATS'} onClick={() => handleSelectTab('SYSTEM_STATS')} />
              <NavButton icon={<HardDrive size={20} />} label="자료이용현황" active={activeTab === 'DATA_USAGE'} onClick={() => handleSelectTab('DATA_USAGE')} />
              <NavButton icon={<Vote size={20} />} label="설문조사 분석" active={activeTab === 'SURVEYS'} onClick={() => handleSelectTab('SURVEYS')} />
              <NavButton icon={<FileText size={20} />} label="운영 보고서" active={activeTab === 'REPORTS'} onClick={() => handleSelectTab('REPORTS')} />
            </Card>
          </nav>

          <Card className="rounded-lg border-0 bg-surface-inverse text-surface-inverse-foreground shadow-2xl p-6 md:p-10 space-y-8 relative overflow-hidden group">
            <div className="absolute inset-0 bg-primary opacity-0 group-hover:opacity-10 transition-opacity" />
            <div className="relative z-10 space-y-6">
              <h3 className="text-xs font-bold text-surface-inverse-muted tracking-tight leading-tight">_ 최근 1개월 총 접속</h3>
              <div className="flex items-center gap-4">
                <span className="text-5xl md:text-6xl font-bold tracking-tighter tabular-nums">
                  {isSummaryLoading ? '…' : isSummaryError ? '—' : totalConnect.toLocaleString()}
                </span>
                <Zap size={32} className="text-primary fill-primary" />
              </div>
              <p className="text-xs text-surface-inverse-muted font-bold tracking-tight">
                {isSummaryError ? '접속 통계를 불러오지 못했습니다' : '접속 통계(/connect) 집계 합계'}
              </p>
            </div>
          </Card>
        </div>

        {/* --- Center/Right Columns: Interactive Data (80%) --- */}
        <div className="col-span-12 lg:col-span-9 space-y-8">

          {isSummaryLoading ? (
            <HubMetricSkeleton />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <StatSummaryCard
                icon={<Activity size={24} />}
                label="사용자 활동 집계"
                value={userQuery.isError ? '—' : sumStatsCo(userStats).toLocaleString()}
              />
              <StatSummaryCard
                icon={<Monitor size={24} />}
                label="접속 요청 수"
                value={connectQuery.isError ? '—' : totalConnect.toLocaleString()}
                color="primary"
              />
              <StatSummaryCard
                icon={<Database size={24} />}
                label="자료 이용 건수"
                value={dataUsageQuery.isError ? '—' : sumStatsCo(dataUsage).toLocaleString()}
              />
            </div>
          )}
          {isSummaryError && (
            <p role="alert" className="px-2 text-xs font-bold tracking-tight text-rose-600">
              일부 통계를 불러오지 못했습니다. &lsquo;강제 새로고침&rsquo;으로 다시 시도해 주세요.
            </p>
          )}

          <Card className="rounded-lg border-0 bg-card shadow-2xl overflow-hidden ring-1 ring-border min-h-[500px] flex flex-col">
            <CardHeader className="bg-muted/50 border-b p-6 md:p-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h3 className="text-xs font-bold text-muted-foreground tracking-tight">_ 심층 분석 뷰포트</h3>
                <CardTitle className="text-2xl font-bold text-foreground tracking-tighter">
                  {TAB_TITLE[activeTab]}
                </CardTitle>
              </div>
              {/*
                과거 여기에는 핸들러 없는 '최근 30일'·'필터' 버튼이 있었다(감사 P1-6).
                기간 선택 UI 가 실재하지 않으므로, 실제 집계 구간을 알리는 비인터랙티브 배지로 대체한다.
              */}
              <span className="self-start sm:self-auto rounded-lg border-2 border-border bg-card px-4 py-2 text-xs font-bold tracking-tight text-muted-foreground">
                집계 구간: 최근 1개월(백엔드 기본값)
              </span>
            </CardHeader>
            <CardContent className="flex-1 overflow-y-auto p-4 md:p-8 lg:p-12">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -20 }}
                  className="h-full"
                >
                  {activeTab === 'SURVEYS' ? (
                    surveyQuery.isLoading ? (
                      <HubListSkeleton />
                    ) : surveyQuery.isError ? (
                      <HubErrorState message="설문조사 목록을 불러오지 못했습니다." onRetry={() => surveyQuery.refetch()} />
                    ) : !surveys?.list?.length ? (
                      <HubEmptyState message="등록된 설문조사가 없습니다." />
                    ) : (
                      <div className="space-y-4">
                        {/*
                          과거 이 목록은 `qestnrId/qestnrSj/qestnrEndDe` 를 읽었으나 백엔드 계약은
                          `SurveyInfoDto{srvyId, srvyTtl, srvyBgngYmd, srvyEndYmd}` 다 → 전 행 제목 공백 +
                          상태 배지 전건 오판정이었다. 상태 판정은 공용 SSOT(`lib/poll-status`)로 통일한다.
                        */}
                        {surveys.list.map((s) => {
                          const status = today
                            ? getPollStatus({ pollBgngYmd: s.srvyBgngYmd, pollEndYmd: s.srvyEndYmd }, today)
                            : null;
                          return (
                            <div
                              key={s.srvyId}
                              className="group p-6 md:p-8 rounded-xl bg-card border-2 border-border hover:border-primary/20 hover:shadow-2xl hover:shadow-primary/5 transition-all flex items-center gap-6 relative overflow-hidden"
                            >
                              <div className="w-16 h-12 shrink-0 bg-muted group-hover:bg-primary/10 rounded-xl flex items-center justify-center shadow-inner transition-colors">
                                <Vote className="text-muted-foreground group-hover:text-primary transition-colors" size={24} />
                              </div>
                              <div className="space-y-2 relative z-10">
                                <div className="flex items-center gap-3">
                                  <span className={cn(
                                    "px-2 py-0.5 rounded-md text-[10px] font-black tracking-tighter",
                                    status === 'active'
                                      ? "bg-emerald-500/10 text-emerald-600"
                                      : "bg-muted text-muted-foreground"
                                  )}>
                                    {status ? POLL_STATUS_LABEL[status] : '…'}
                                  </span>
                                  <span className="text-[10px] font-bold text-muted-foreground font-mono">
                                    종료일: {toDisplayYmd(s.srvyEndYmd)}
                                  </span>
                                </div>
                                <h4 className="text-lg font-bold text-foreground tracking-tighter group-hover:text-primary transition-colors">
                                  {s.srvyTtl || '(제목 없음)'}
                                </h4>
                              </div>
                              <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                          );
                        })}
                      </div>
                    )
                  ) : chartQuery.isLoading ? (
                    <HubListSkeleton />
                  ) : chartQuery.isError ? (
                    <HubErrorState message="통계 데이터를 불러오지 못했습니다." onRetry={() => chartQuery.refetch()} />
                  ) : chartData.length === 0 ? (
                    <HubEmptyState message="선택한 기간에 집계된 통계가 없습니다." />
                  ) : (
                    <div className="h-[400px] w-full">
                      <SafeResponsiveContainer width="100%" height="100%" minWidth={100} minHeight={100}>
                        <AreaChart
                          data={chartData}
                          margin={{ top: 10, right: 30, left: 0, bottom: 0 }}
                        >
                          {/*
                            축·그리드·마크 색은 하드코딩 HEX 대신 디자인 토큰 실측값을 쓴다.
                            기존 `#cbd5e1` 눈금은 라이트 모드에서 1.6:1 로 WCAG AA 미달이었다(감사 P2).
                          */}
                          <defs>
                            <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                              <stop offset="5%" stopColor={chartColors.accent} stopOpacity={0.3}/>
                              <stop offset="95%" stopColor={chartColors.accent} stopOpacity={0}/>
                            </linearGradient>
                          </defs>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={chartColors.grid} />
                          <XAxis
                            dataKey="statsDate"
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 900, fill: chartColors.tick }}
                            tickFormatter={formatAxisDate}
                            dy={10}
                          />
                          <YAxis
                            axisLine={false}
                            tickLine={false}
                            tick={{ fontSize: 10, fontWeight: 900, fill: chartColors.tick }}
                          />
                          <RechartsTooltip
                            labelFormatter={(label) => toDisplayYmd(String(label), String(label ?? ''))}
                            contentStyle={{
                              borderRadius: '16px',
                              border: 'none',
                              background: chartColors.surface,
                              boxShadow: '0 20px 50px rgba(0,0,0,0.1)',
                              fontWeight: 900,
                              fontSize: '12px'
                            }}
                          />
                          {/*
                            백엔드 convertToStatsDto 가 채우는 유일한 수치 필드는 statsCo 다.
                            과거의 creatCo / inqCnt dataKey 는 항상 0/undefined 여서 차트가 축만 그려졌다(감사 P0-21).
                          */}
                          <Area
                            type="monotone"
                            dataKey="statsCo"
                            name="집계 건수"
                            stroke={chartColors.accent}
                            strokeWidth={4}
                            fillOpacity={1}
                            fill="url(#colorValue)"
                          />
                        </AreaChart>
                      </SafeResponsiveContainer>
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>
            </CardContent>
          </Card>
        </div>

      </div>
    </div>
  );
}

// --- Sub-components ---

function NavButton({ icon, label, active, onClick }: { icon: React.ReactNode, label: string, active: boolean, onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={cn(
        "w-full group p-6 rounded-lg border-2 transition-all flex items-center gap-5 mb-2",
        active
          ? "bg-surface-inverse border-surface-inverse-border text-surface-inverse-foreground shadow-xl"
          : "bg-card border-transparent hover:border-border text-muted-foreground hover:text-foreground"
      )}
    >
      <div className={cn(
        "w-12 h-12 rounded-lg flex items-center justify-center transition-all",
        active ? "bg-white/10 text-surface-inverse-foreground" : "bg-muted text-muted-foreground group-hover:bg-muted"
      )}>
        {icon}
      </div>
      <span className="text-xs font-bold tracking-tight">_ {label}</span>
    </button>
  );
}

/** 조회 실패를 "데이터 없음"으로 위장하지 않기 위한 명시적 에러 상태 (감사 P1-1) */
function HubErrorState({ message, onRetry }: { message: string, onRetry: () => void }) {
  return (
    <div role="alert" className="h-[400px] flex flex-col items-center justify-center gap-5 text-center">
      <div className="w-14 h-14 rounded-lg bg-rose-500/10 flex items-center justify-center">
        <AlertTriangle size={26} className="text-rose-600" />
      </div>
      <div className="space-y-2">
        <p className="text-sm font-bold tracking-tight text-foreground">{message}</p>
        <p className="text-xs font-bold tracking-tight text-muted-foreground">잠시 후 다시 시도하거나 관리자에게 문의해 주세요.</p>
      </div>
      <Button variant="outline" onClick={onRetry} className="h-10 px-6 rounded-lg border-2 text-xs font-bold tracking-tight gap-2">
        <RefreshCcw size={16} /> 다시 시도
      </Button>
    </div>
  );
}

function HubEmptyState({ message }: { message: string }) {
  return (
    <div className="h-[400px] flex flex-col items-center justify-center gap-4 text-center">
      <div className="w-14 h-14 rounded-lg bg-muted flex items-center justify-center">
        <Inbox size={26} className="text-muted-foreground" />
      </div>
      <p className="text-sm font-bold tracking-tight text-muted-foreground">{message}</p>
    </div>
  );
}

/**
 * 요약 지표 카드.
 * ⚠ 증감(trend) 배지는 두지 않는다 — 비교 기준 기간을 백엔드가 제공하지 않아
 *   과거 하드코딩 "+12%" 류가 거짓 지표가 됐다(감사 P1-5).
 */
function StatSummaryCard({ icon, label, value, color = 'slate' }: {
  icon: React.ReactNode;
  label: string;
  value: string;
  color?: 'slate' | 'primary';
}) {
  return (
    <Card className="rounded-lg border-0 bg-card shadow-2xl p-6 md:p-10 ring-1 ring-border hover:scale-[1.05] transition-all">
      <div className="space-y-6">
        <div className={cn(
          "w-14 h-11 rounded-lg flex items-center justify-center shadow-lg transition-transform hover:rotate-12",
          color === 'primary' ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"
        )}>
          {icon}
        </div>
        <div className="space-y-2">
          <h5 className="text-xs font-bold text-muted-foreground tracking-tight leading-tight">_ {label}</h5>
          <span className="text-3xl font-bold tracking-tighter text-foreground tabular-nums">{value}</span>
        </div>
      </div>
    </Card>
  );
}
