'use client';

import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, BarChart3, Users, Plus, Layers, Activity, AlertTriangle, RefreshCcw } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Services
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { statsAdminService } from '@/services/foundation/system/StatsAdminService';

// Components
import PollManagePage from '../manage/page';
import SurveyStatsPage from '../stats/page';

// 허브 탭 정의 — 아래 TabsList/TabsContent 와 1:1 로 유지한다.
//
// [감춘 탭 — 되살리는 방법]
// questions('질문 라이브러리') / respondents('응답 그룹') / templates('템플릿') /
// settings('시스템 연동') 네 탭은 내용이 없는 껍데기(PlaceholderCard "준비 중")였다.
// 클릭하면 "아직 제공되지 않는 기능입니다" 만 나오는 탭을 상시 노출하는 것은 정직하지 않아
// 구현 범위가 정해질 때까지 탭 목록에서 내린다.
// 되살릴 때: 아래 SURVEY_TABS 에 키를 추가하고 TabsList 에 TabTrigger, 본문에 실제 화면을
// 렌더하는 TabsContent 를 함께 넣는다(껍데기 카드는 다시 만들지 않는다).
// 같은 릴리스의 V2_30 마이그레이션이 이 탭들을 가리키던 메뉴 행도 use_yn='N' 으로 감췄으므로,
// 구현 시 그 메뉴도 use_yn='Y' 로 되돌려야 사이드바에 다시 나타난다.
const SURVEY_TABS = ['manage', 'stats'] as const;
type SurveyTab = (typeof SURVEY_TABS)[number];

const DEFAULT_TAB: SurveyTab = 'manage';

/**
 * 알 수 없는 tab 값(오타·구메뉴·감춘 탭)이 와도 빈 화면 대신 기본 탭을 렌더한다.
 * 감춘 탭 URL(?tab=questions 등)과 허브에 존재한 적 없는 ?tab=items(구 메뉴 2010600)로
 * 들어오는 북마크·딥링크가 여기서 모두 흡수된다.
 */
function resolveTab(raw: string | null): SurveyTab {
 if (!raw) return DEFAULT_TAB;
 if ((SURVEY_TABS as readonly string[]).includes(raw)) return raw as SurveyTab;
 return DEFAULT_TAB;
}

/**
 * `/statistics/summary` 응답은 서비스 계층에서 `Record<string, unknown>` 으로 온다.
 * 캐스팅(`as any`)으로 덮지 않고 런타임에서 숫자만 통과시킨다.
 * 값이 없으면 0 이 아니라 `null` 을 돌려, "조회 실패/미제공"과 "실제 0건"을 화면에서 구분한다.
 */
function toCount(value: unknown): number | null {
 return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

export function SurveyHubClient() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const currentTab = resolveTab(searchParams.get('tab'));

 // 1. Data Fetching — 실패를 '0건'으로 위장하지 않도록 isError/refetch 까지 구조분해한다(P1-1).
 const {
   data: surveyData,
   isLoading: isSurveyLoading,
   isError: isSurveyError,
   refetch: refetchSurveys,
 } = useQuery({
   queryKey: ['admin-surveys-all'],
   queryFn: () => surveyAdminService.getSurveyList({ pageIndex: 1, recordCountPerPage: 1 }),
 });

 const {
   data: statsData,
   isLoading: isStatsLoading,
   isError: isStatsError,
   refetch: refetchStats,
 } = useQuery({
   queryKey: ['admin-stats-summary'],
   queryFn: () => statsAdminService.getSummary(),
 });

 const totalSurveys = toCount(surveyData?.total);
 const totalUsers = toCount(statsData?.totalUsers);
 const todayConnects = toCount(statsData?.todayConnects);

 const hasError = isSurveyError || isStatsError;
 const isLoading = isSurveyLoading || isStatsLoading;

 const retryFailed = () => {
   if (isSurveyError) void refetchSurveys();
   if (isStatsError) void refetchStats();
 };

 // 탭은 URL 파생값이다(P1-7). replace 를 쓰는 이유: 탭 전환마다 히스토리가 쌓이면
 // 뒤로가기가 탭 왕복에 갇힌다. 공유·새로고침 복원은 replace 로도 그대로 동작한다.
 const onTabChange = (value: string) => {
 const params = new URLSearchParams(searchParams);
 params.set('tab', value);
 router.replace(`/admin/survey/hub?${params.toString()}`, { scroll: false });
 };

 return (
 <motion.div
 initial="hidden"
 animate="visible"
 variants={hubContainerVariants}
 className="space-y-12 pb-24"
 >
 {/* 1. Dynamic Hub Header */}
 <motion.div variants={hubItemVariants} className="flex flex-col md:flex-row md:items-end justify-between gap-10 px-2">
 <div className="space-y-3">
 <div className="flex items-center gap-3">
 <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
 <span className="text-xs font-bold tracking-tight text-rose-500 leading-none px-3 py-1 bg-rose-500/5 rounded-lg border border-rose-500/10">설문 매트릭스</span>
 </div>
 {/* 페이지 h1 은 hub/page.tsx 가 이미 렌더한다 — 여기서는 h2 로 둬야 문서 개요가 어긋나지 않는다. */}
 <h2 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter leading-none">
 설문 <span className="text-rose-500">인사이트</span>
 </h2>
 <p className="text-sm font-bold text-muted-foreground max-w-lg leading-relaxed tracking-tight">
 전사 의견 수렴 결과를 수집·분석하는 통합 설문 관리 화면입니다.
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="hidden sm:flex flex-col items-end mr-4">
 <span className="text-xs font-bold text-muted-foreground tracking-tight leading-none">등록된 설문</span>
 {isSurveyLoading ? (
   <Skeleton className="h-8 w-20 mt-1" />
 ) : (
   // 종전 '{n} / 50' 의 분모 50 은 근거 없는 고정값이라 제거했다(P1-5).
   <span className="text-xl font-bold text-foreground tabular-nums mt-1">
     {totalSurveys === null ? '—' : `${totalSurveys.toLocaleString()}건`}
   </span>
 )}
 </div>
 <Button
 onClick={() => router.push('/admin/survey/manage/create')}
 className="h-11 px-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
 >
 <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> 신규 설문 등록
 </Button>
 </div>
 </motion.div>

 {/* 2. 지표 — 조회 실패 시 0 을 보여주지 않고 실패 사실을 드러낸다(P1-1) */}
 {hasError && (
   <motion.div
     variants={hubItemVariants}
     role="alert"
     className="mx-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-lg border-2 border-rose-500/20 bg-rose-500/5 px-6 py-5"
   >
     <div className="flex items-start gap-3">
       <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
       <div className="space-y-1">
         <p className="text-sm font-bold text-foreground">요약 지표를 불러오지 못했습니다.</p>
         <p className="text-xs font-medium text-muted-foreground">
           {isSurveyError && isStatsError
             ? '설문 건수와 접속 요약을 모두 조회하지 못했습니다.'
             : isSurveyError
               ? '설문 건수를 조회하지 못했습니다.'
               : '접속 요약을 조회하지 못했습니다.'} 아래 목록은 별도로 조회됩니다.
         </p>
       </div>
     </div>
     <Button variant="outline" onClick={retryFailed} className="h-10 px-6 rounded-lg font-bold text-xs gap-2 shrink-0">
       <RefreshCcw size={14} /> 다시 시도
     </Button>
   </motion.div>
 )}

 <motion.div variants={hubItemVariants} className="grid grid-cols-1 md:grid-cols-3 gap-6 px-2">
 {isLoading ? (
   <>
     <MetricCardSkeleton />
     <MetricCardSkeleton />
     <MetricCardSkeleton />
   </>
 ) : (
   <>
     {/* 값의 출처를 라벨과 일치시킨다 — 종전 'Global Response'/'Daily Active' 는 각각
         총 사용자 수·오늘 접속 수를 다른 의미로 표기한 거짓 지표였다(P1-5).
         근거가 없던 'Insight Score 88/100' 카드와 +12.4%/+2.1% 증감 배지는 삭제했다. */}
     <MetricCard label="등록된 설문" value={totalSurveys} unit="건" icon={Layers} color="rose" />
     <MetricCard label="총 사용자" value={totalUsers} unit="명" icon={Users} color="primary" />
     <MetricCard label="오늘 접속" value={todayConnects} unit="회" icon={Activity} color="emerald" />
   </>
 )}
 </motion.div>

 {/* 3. Navigation Matrix */}
 <motion.div variants={hubItemVariants} className="px-2">
 <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-10">
 <div className="hub-glass-premium p-2 rounded-lg border-2 border-border/50 shadow-xl inline-flex w-full md:w-auto overflow-x-auto scrollbar-hide">
 <TabsList className="bg-transparent gap-2 h-auto p-0 border-none">
 <TabTrigger value="manage" icon={LayoutGrid} label="설문 관리" />
 <TabTrigger value="stats" icon={BarChart3} label="결과 통계" />
 </TabsList>
 </div>

 <div className="mt-10">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentTab}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: "circOut" }}
 >
 <TabsContent value="manage" className="m-0 focus-visible:outline-none">
 <PollManagePage />
 </TabsContent>

 <TabsContent value="stats" className="m-0 focus-visible:outline-none">
 <SurveyStatsPage />
 </TabsContent>
 </motion.div>
 </AnimatePresence>
 </div>
 </Tabs>
 </motion.div>
 </motion.div>
 );
}

function TabTrigger({ value, icon: Icon, label }: { value: string, icon: React.ElementType, label: string }) {
 return (
 <TabsTrigger
 value={value}
 className="data-[state=active]:bg-surface-inverse data-[state=active]:text-surface-inverse-foreground data-[state=active]:shadow-2xl rounded-lg h-11 px-8 font-bold text-xs tracking-tight gap-3 transition-all border border-transparent data-[state=active]:border-surface-inverse-border hover:bg-muted"
 >
 <Icon size={16} /> {label}
 </TabsTrigger>
 );
}

/**
 * 지표 카드. `value === null` 은 "조회하지 못했거나 서버가 주지 않은 값"이며 0 과 구분해 '—' 로 표기한다.
 * 증감 배지(trend)는 산출 근거가 없어 제거했다(P1-5).
 */
function MetricCard({
 label,
 value,
 unit,
 icon: Icon,
 color,
}: {
 label: string;
 value: number | null;
 unit?: string;
 icon: React.ElementType;
 color: 'rose' | 'emerald' | 'primary';
}) {
 const colorMap: Record<string, string> = {
 rose: "text-rose-500 bg-rose-500/5 border-rose-500/10",
 emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10",
 primary: "text-primary bg-primary/5 border-primary/10"
 };

 return (
 <div className="hub-glass-premium p-8 rounded-lg border-2 border-border/50 flex flex-col gap-4 group hover:ring-[20px] hover:ring-border/30 transition-all shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-muted-foreground tracking-tight">{label}</span>
 <div className={cn("p-2 rounded-lg border", colorMap[color])}>
 <Icon size={14} />
 </div>
 </div>
 <div className="space-y-1">
 <h3 className="text-3xl font-bold tracking-tighter text-foreground tabular-nums flex items-baseline gap-1.5">
 {value === null ? '—' : value.toLocaleString()}
 {value !== null && unit && <span className="text-xs font-bold text-muted-foreground">{unit}</span>}
 </h3>
 <div className="h-[1px] w-full bg-muted" />
 </div>
 </div>
 );
}

function MetricCardSkeleton() {
  return (
    <div className="hub-glass-premium p-8 rounded-lg border-2 border-border/50 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-8 w-8 rounded-lg" />
      </div>
      <div className="space-y-2 pt-2">
        <Skeleton className="h-9 w-24" />
        <Skeleton className="h-[1px] w-full" />
      </div>
    </div>
  );
}
