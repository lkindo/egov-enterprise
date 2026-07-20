'use client';

;
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
;
import { LayoutGrid,  BarChart3,  Users,  Zap,  Plus,
 Layers,  Activity } from "lucide-react";
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

export function SurveyHubClient() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const currentTab = resolveTab(searchParams.get('tab'));

 // 1. Data Fetching
 const { data: surveyData, isLoading: isSurveyLoading } = useQuery({
   queryKey: ['admin-surveys-all'],
   queryFn: () => surveyAdminService.getSurveyList({ pageIndex: 1, recordCountPerPage: 1 }),
 });

 const { data: statsData, isLoading: isStatsLoading } = useQuery({
   queryKey: ['admin-stats-summary'],
   queryFn: () => statsAdminService.getSummary(),
 });

 const totalSurveys = surveyData?.total || 0;
 const totalUsers = (statsData as any)?.totalUsers || 0;
 const todayConnects = (statsData as any)?.todayConnects || 0;

 const onTabChange = (value: string) => {
 const params = new URLSearchParams(searchParams);
 params.set('tab', value);
 router.push(`/admin/survey/hub?${params.toString()}`, { scroll: false });
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
 <span className="text-xs font-bold tracking-tight text-rose-500 leading-none px-3 py-1 bg-rose-500/5 rounded-lg border border-rose-500/10">Survey Matrix</span>
 </div>
 <h1 className="text-4xl md:text-5xl font-bold text-foreground tracking-tighter leading-none">
 Insight <span className="text-rose-500">Analytics</span>
 </h1>
 <p className="text-sm font-bold text-muted-foreground max-w-lg leading-relaxed tracking-tight">
 Enterprise feedback acquisition and sentiment analysis engine.
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="hidden sm:flex flex-col items-end mr-4">
 <span className="text-xs font-bold text-muted-foreground tracking-tight leading-none">활성 설문 노드</span>
 {isSurveyLoading ? (
   <Skeleton className="h-8 w-20 mt-1" />
 ) : (
   <span className="text-xl font-bold text-foreground tabular-nums mt-1">{totalSurveys} / 50</span>
 )}
 </div>
 <Button 
 onClick={() => router.push('/admin/survey/manage/create')}
 className="h-11 px-10 rounded-lg bg-surface-inverse text-surface-inverse-foreground font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
 >
 <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" /> Launch New Survey
 </Button>
 </div>
 </motion.div>

 {/* 2. Metric Insight Grid */}
 <motion.div variants={hubItemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6 px-2">
 {isStatsLoading || isSurveyLoading ? (
   <>
     <MetricCardSkeleton />
     <MetricCardSkeleton />
     <MetricCardSkeleton />
     <MetricCardSkeleton />
   </>
 ) : (
   <>
     <MetricCard label="Global Response" value={totalUsers.toLocaleString()} trend="+12.4%" icon={Users} color="rose" />
     <MetricCard label="Daily Active" value={todayConnects.toLocaleString()} trend="+2.1%" icon={Activity} color="emerald" />
     <MetricCard label="Insight Score" value="88/100" trend="Optimal" icon={Zap} color="amber" />
     <MetricCard label="Active Nodes" value={`${totalSurveys} Units`} trend="Running" icon={Layers} color="primary" />
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

function TabTrigger({ value, icon: Icon, label }: { value: string, icon: any, label: string }) {
 return (
 <TabsTrigger 
 value={value} 
 className="data-[state=active]:bg-surface-inverse data-[state=active]:text-surface-inverse-foreground data-[state=active]:shadow-2xl rounded-lg h-11 px-8 font-bold text-xs tracking-tight gap-3 transition-all border border-transparent data-[state=active]:border-surface-inverse-border hover:bg-muted"
 >
 <Icon size={16} /> {label}
 </TabsTrigger>
 );
}

function MetricCard({ label, value, trend, icon: Icon, color }: any) {
 const colorMap: any = {
 rose: "text-rose-500 bg-rose-500/5 border-rose-500/10",
 emerald: "text-emerald-500 bg-emerald-500/5 border-emerald-500/10",
 amber: "text-amber-500 bg-amber-500/5 border-amber-500/10",
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
 <h4 className="text-3xl font-bold tracking-tighter text-foreground tabular-nums">{value}</h4>
 <div className="flex items-center gap-2">
 <span className={cn("text-xs font-bold ", color === 'emerald' ? 'text-emerald-500' : color === 'rose' ? 'text-rose-500' : 'text-muted-foreground')}>
 {trend}
 </span>
 <div className="h-[1px] flex-1 bg-muted" />
 </div>
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
        <div className="flex items-center gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-[1px] flex-1" />
        </div>
      </div>
    </div>
  );
}

