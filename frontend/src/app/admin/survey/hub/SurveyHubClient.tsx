'use client';

import { useState, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { 
 LayoutGrid, BarChart3, HelpCircle, Users, FileStack, Settings2,
 PieChart, Target, Zap, ArrowUpRight, Search, Plus, Loader2, Sparkles,
 Layers, Clock, ShieldCheck, Activity
} from "lucide-react";
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

export function SurveyHubClient() {
 const router = useRouter();
 const searchParams = useSearchParams();
 const currentTab = searchParams.get('tab') || 'manage';

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
 <div className="w-2 h-2 rounded-lg bg-rose-500 animate-pulse" />
 <span className="text-xs font-bold tracking-tight text-rose-500 leading-none px-3 py-1 bg-rose-500/5 rounded-lg border border-rose-500/10">Survey Matrix</span>
 </div>
 <h1 className="text-4xl md:text-5xl font-bold text-slate-900 dark:text-white tracking-tighter leading-none">
 Insight <span className="text-rose-500">Analytics</span>
 </h1>
 <p className="text-sm font-bold text-slate-400 max-w-lg leading-relaxed tracking-tight">
 Enterprise feedback acquisition and sentiment analysis engine.
 </p>
 </div>
 <div className="flex items-center gap-4">
 <div className="hidden sm:flex flex-col items-end mr-4">
 <span className="text-xs font-bold text-muted-foreground tracking-tight leading-none">활성 설문 노드</span>
 {isSurveyLoading ? (
   <Skeleton className="h-8 w-20 mt-1" />
 ) : (
   <span className="text-xl font-bold text-slate-900 dark:text-white tabular-nums mt-1">{totalSurveys} / 50</span>
 )}
 </div>
 <Button 
 onClick={() => router.push('/admin/survey/manage/create')}
 className="h-11 px-10 rounded-lg bg-slate-900 text-white font-bold tracking-tight text-xs hover:scale-105 active:scale-95 transition-all shadow-2xl gap-3 group"
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
 <div className="hub-glass-premium p-2 rounded-lg border-2 border-slate-100/50 shadow-xl inline-flex w-full md:w-auto overflow-x-auto scrollbar-hide">
 <TabsList className="bg-transparent gap-2 h-auto p-0 border-none">
 <TabTrigger value="manage" icon={LayoutGrid} label="설문 관리" />
 <TabTrigger value="stats" icon={BarChart3} label="결과 통계" />
 <TabTrigger value="questions" icon={HelpCircle} label="질문 라이브러리" />
 <TabTrigger value="respondents" icon={Users} label="응답 그룹" />
 <TabTrigger value="templates" icon={FileStack} label="템플릿" />
 <TabTrigger value="settings" icon={Settings2} label="시스템 연동" />
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

 <TabsContent value="questions" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="질문 및 문항 라이브러리" description="설문 구성을 위한 핵심 질문 및 선택지 구조를 관리합니다." icon={HelpCircle} />
 </TabsContent>

 <TabsContent value="respondents" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="응답 그룹 관리" description="설문 조사 대상인 사용자 집단 및 세그먼트를 정의합니다." icon={Users} />
 </TabsContent>

 <TabsContent value="templates" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="설문 템플릿 관리" description="표준화된 설문 양식을 생성하고 재사용 가능한 설문 세트를 관리합니다." icon={FileStack} />
 </TabsContent>

 <TabsContent value="settings" className="m-0 focus-visible:outline-none">
 <PlaceholderCard title="대외 기관 연동 설정" description="시스템 간의 설문 데이터 연동 프로토콜을 관리합니다." icon={Settings2} />
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
 className="data-[state=active]:bg-slate-900 data-[state=active]:text-white data-[state=active]:shadow-2xl rounded-lg h-11 px-8 font-bold text-xs tracking-tight gap-3 transition-all border border-transparent data-[state=active]:border-slate-800 hover:bg-slate-50"
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
 <div className="hub-glass-premium p-8 rounded-lg border-2 border-slate-100/50 flex flex-col gap-4 group hover:ring-[20px] hover:ring-slate-100/30 transition-all shadow-sm">
 <div className="flex items-center justify-between">
 <span className="text-xs font-bold text-slate-400 tracking-tight">{label}</span>
 <div className={cn("p-2 rounded-lg border", colorMap[color])}>
 <Icon size={14} />
 </div>
 </div>
 <div className="space-y-1">
 <h4 className="text-3xl font-bold tracking-tighter text-slate-900 tabular-nums">{value}</h4>
 <div className="flex items-center gap-2">
 <span className={cn("text-xs font-bold ", color === 'emerald' ? 'text-emerald-500' : color === 'rose' ? 'text-rose-500' : 'text-slate-400')}>
 {trend}
 </span>
 <div className="h-[1px] flex-1 bg-slate-100" />
 </div>
 </div>
 </div>
 );
}

function MetricCardSkeleton() {
  return (
    <div className="hub-glass-premium p-8 rounded-lg border-2 border-slate-100/50 flex flex-col gap-4">
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

function PlaceholderCard({ title, description, icon: Icon }: any) {
 return (
 <div className="hub-glass-premium p-32 rounded-lg border-4 border-dashed border-slate-100 flex flex-col items-center justify-center text-center space-y-8 group relative overflow-hidden">
 <div className="absolute top-0 right-0 p-12 opacity-[0.03] grayscale pointer-events-none group-hover:opacity-10 transition-opacity">
 <Icon size={180} />
 </div>
 <div className="w-24 h-24 rounded-lg bg-slate-50 shadow-2xl flex items-center justify-center text-rose-500 border-2 border-slate-100 group-hover:scale-110 group-hover:rotate-12 transition-all relative z-10">
 <Icon size={40} />
 </div>
 <div className="space-y-4 relative z-10">
 <h3 className="text-3xl font-bold tracking-tighter text-slate-900 leading-none">{title}</h3>
 <p className="text-sm font-bold text-slate-400 max-w-sm mx-auto tracking-tight">{description}</p>
 </div>
 <div className="flex gap-4 relative z-10 pt-4">
 <div className="h-1.5 w-8 rounded-lg bg-rose-500/20" />
 <div className="h-1.5 w-8 rounded-lg bg-rose-500/40" />
 <div className="h-1.5 w-8 rounded-lg bg-rose-500/20" />
 </div>
 </div>
 );
}

