'use client';

import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { LayoutGrid, BarChart3, Users, Plus, Layers, Activity, AlertTriangle, RefreshCcw, ListChecks, LayoutTemplate, Vote } from "lucide-react";
import { motion, AnimatePresence } from 'framer-motion';
import { cn } from '@/lib/utils';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

// Services
import { surveyAdminService } from '@/services/foundation/system/SurveyAdminService';
import { statsAdminService } from '@/services/foundation/system/StatsAdminService';

// Components
import SurveyManageClient from '../manage/SurveyManageClient';
import SurveyStatsClient from '../stats/SurveyStatsClient';
import SurveyQuestionsPanel from '../components/SurveyQuestionsPanel';
import SurveyTemplatesPanel from '../components/SurveyTemplatesPanel';

// 허브 탭 정의 — 아래 TabsList/TabsContent 와 1:1 로 유지한다.
//
// [2026-08-06] questions / templates / respondents 세 탭을 실제 화면으로 되살렸다.
// 위 안내가 지시한 절차를 그대로 따랐다 — SURVEY_TABS 에 키 추가, TabTrigger·TabsContent 추가,
// V2_42 로 해당 메뉴 행(2010300·2010400·2010500)의 use_yn 을 'Y' 로 복원.
// 껍데기 카드는 만들지 않았다. 세 탭 모두 백엔드 CRUD 가 이미 존재했고 화면만 없었다.
//
// settings('시스템 연동') 탭은 여전히 없다 — 대응 백엔드가 없어 만들 것이 없다.
// items('항목관리', 구 메뉴 2010600)도 탭으로 두지 않는다: 항목은 문항 하위 자원이라
// 소속 문항 없이 의미가 없고, 문항 관리 탭 안에서 함께 다루는 것이 도메인에 맞다.
/*
  [2026-09-08 PD-SRVY-001 결정] 응답자 탭을 걷었다 — tb_srvy_rspdnt 는 개인정보를 담는데
  응답 결과와 ID 로 연결되지 않고 행을 만드는 경로가 없어 **항상 빈 목록**이었다.
*/
const SURVEY_TABS = ['manage', 'questions', 'templates', 'stats'] as const;
type SurveyTab = (typeof SURVEY_TABS)[number];

const DEFAULT_TAB: SurveyTab = 'manage';
const TAB_TITLE: Record<SurveyTab, string> = { manage: '여론조사 관리', questions: '설문지·문항 관리', templates: '설문 템플릿 관리', stats: '여론조사 통계' };
const TAB_DESCRIPTION: Record<SurveyTab, string> = {
 manage: '여론조사를 조회하고 관리합니다. 만족도 조사 등록은 네 단계 만족도 응답을 사용하며, 문항을 직접 구성하려면 설문지·문항 관리를 이용하세요.',
 questions: '템플릿을 선택해 설문지를 만든 뒤 문항과 선택 항목을 구성합니다.',
 templates: '문항형 설문지에서 사용할 템플릿을 관리합니다.',
 stats: '여론조사 응답 수와 기간별 상태를 확인합니다. 문항형 설문 결과는 아래 진행 순서의 결과 확인에서 조회하세요.',
};

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
 className="space-y-6 pb-8"
 >
 <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
   <div><h1 className="text-2xl font-bold tracking-tight">{TAB_TITLE[currentTab]}</h1><p className="mt-2 text-sm text-muted-foreground">{TAB_DESCRIPTION[currentTab]}</p></div>
   {currentTab === 'manage' && <Button onClick={() => router.push('/admin/survey/manage/create')} className="shrink-0 gap-2"><Plus size={16} /> 만족도 조사 등록</Button>}
 </div>
 <nav aria-label="문항형 설문 진행 순서" className="flex flex-wrap items-center gap-2 rounded-lg border p-3 text-sm">
   <span className="font-medium">문항형 설문:</span>
   <Link href="/admin/survey/hub?tab=templates" className="text-primary underline">1. 템플릿 준비</Link><span aria-hidden="true">→</span>
   <Link href="/admin/survey/hub?tab=questions" className="text-primary underline">2. 설문지·문항 구성</Link><span aria-hidden="true">→</span>
   <Link href="/survey" className="text-primary underline">3. 설문 참여</Link><span aria-hidden="true">→</span>
   <Link href="/survey/stats" className="text-primary underline">4. 결과 확인</Link>
 </nav>
 {/* 3. Navigation Matrix */}
 <motion.div variants={hubItemVariants} className="px-2">
 <Tabs value={currentTab} onValueChange={onTabChange} className="space-y-4">
 <div className="hub-glass-premium p-2 rounded-lg border-2 border-border/50 shadow-xl inline-flex w-full md:w-auto overflow-x-auto scrollbar-hide">
 <TabsList className="bg-transparent gap-2 h-auto p-0 border-none">
 <TabTrigger value="manage" icon={LayoutGrid} label="여론조사 관리" />
 <TabTrigger value="questions" icon={ListChecks} label="설문지·문항" />
 <TabTrigger value="templates" icon={LayoutTemplate} label="템플릿" />
 <TabTrigger value="stats" icon={BarChart3} label="결과 통계" />
 </TabsList>
 </div>
 {/* [2026-09-06 DEC-OPS-041] 온라인 투표(항목 하나 고르기)는 문항형 설문조사와 다른 제품이라 허브 탭이 아니라
     별도 화면으로 안내한다(감사 D12-02 — 종전에는 허브 어디에도 투표로 가는 길이 없었다). */}
 <Link
   href="/admin/survey/polls"
   className="inline-flex items-center gap-2 px-2 text-sm font-medium text-primary underline-offset-4 hover:underline"
 >
   <Vote size={16} aria-hidden="true" /> 온라인 투표 관리로 이동
 </Link>

 <div className="mt-4">
 <AnimatePresence mode="wait">
 <motion.div
 key={currentTab}
 initial={{ opacity: 0, y: 20 }}
 animate={{ opacity: 1, y: 0 }}
 exit={{ opacity: 0, y: -20 }}
 transition={{ duration: 0.4, ease: "circOut" }}
 >
 <TabsContent value="manage" className="m-0 focus-visible:outline-none">
 <SurveyManageClient embedded />
 </TabsContent>

 <TabsContent value="questions" className="m-0 focus-visible:outline-none">
 <SurveyQuestionsPanel />
 </TabsContent>

 <TabsContent value="templates" className="m-0 focus-visible:outline-none">
 <SurveyTemplatesPanel />
 </TabsContent>


 <TabsContent value="stats" className="m-0 focus-visible:outline-none">
 <SurveyStatsClient embedded />
 </TabsContent>
 </motion.div>
 </AnimatePresence>
 </div>
 </Tabs>
 </motion.div>
 <details className="rounded-lg border p-4 space-y-4"><summary className="cursor-pointer font-medium">설문지 및 서비스 이용 현황{hasError ? ' — 일부 조회 실패' : ''}</summary>
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
     <MetricCard label="등록된 설문지" value={totalSurveys} unit="건" icon={Layers} color="rose" />
     <MetricCard label="총 사용자" value={totalUsers} unit="명" icon={Users} color="primary" />
     <MetricCard label="오늘 접속" value={todayConnects} unit="회" icon={Activity} color="emerald" />
   </>
 )}
 </motion.div>


 </details>
 </motion.div>
 );
}

function TabTrigger({ value, icon: Icon, label }: { value: string, icon: React.ElementType, label: string }) {
 return (
 <TabsTrigger
 value={value}
 className="data-[state=active]:bg-surface-inverse data-[state=active]:text-surface-inverse-foreground data-[state=active]:shadow-2xl rounded-lg h-11 px-4 font-bold text-xs tracking-tight gap-3 transition-all border border-transparent data-[state=active]:border-surface-inverse-border hover:bg-muted"
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
