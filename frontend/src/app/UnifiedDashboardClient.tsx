'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Bell, 
  ShieldCheck, 
  BarChart3
} from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { useQuery } from '@tanstack/react-query';
import { statsAdminService, StatsDto } from '@/services/foundation/system/StatsAdminService';
import { motion } from 'framer-motion';
import { useMessage } from '@/hooks/useMessage';

// Hub Common Components & Animations
import { HubSummaryCard } from '@/components/ui/hub/HubSummaryCard';
import { HubInsightBadge } from '@/components/ui/hub/HubInsightBadge';
import { HubListCard } from '@/components/ui/hub/HubListCard';
import { HubChartCard } from '@/components/ui/hub/HubChartCard';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { DashboardTask } from '@/types/foundation/dashboard';

// Optimization: Priority 2 - Dynamic Imports for heavy components
const BannerSlider = dynamic(() => import('@/app/components/dashboard/BannerSlider').then(mod => mod.BannerSlider), { 
  loading: () => <Skeleton className="h-[400px] w-full rounded-[0.1rem]" />,
  ssr: false 
});
const PopupManager = dynamic(() => import('@/app/components/dashboard/PopupManager').then(mod => mod.PopupManager), { ssr: false });
const ActivityFeed = dynamic(() => import('@/app/components/dashboard/ActivityFeed').then(mod => mod.ActivityFeed), { 
  loading: () => <div className="space-y-4 pt-10"><Skeleton className="h-20 w-full" /><Skeleton className="h-20 w-full" /></div>,
  ssr: false 
});
const RealTimeDashboard = dynamic(() => import('@/components/features/dashboard/RealTimeDashboard').then(mod => mod.RealTimeDashboard), {
  loading: () => <Skeleton className="h-[150px] w-full rounded-[0.1rem]" />,
  ssr: false
});
const DashboardVisitorChart = dynamic(
  () => import('@/app/components/dashboard/DashboardCharts').then((mod) => mod.DashboardVisitorChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-[0.1rem]" />,
    ssr: false,
  }
);

interface UnifiedDashboardClientProps {
  initialNotiList: DashboardTask[];
  initialTaskList: DashboardTask[];
  pendingApprovalCount: number;
}

export default function UnifiedDashboardClient({ 
  initialNotiList = [], 
  initialTaskList = [], 
  pendingApprovalCount = 0 
}: UnifiedDashboardClientProps) {
  const { t } = useMessage();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [notiList] = useState<DashboardTask[]>(initialNotiList);
  const [taskList] = useState<DashboardTask[]>(initialTaskList);
  const [pendingCount] = useState<number>(pendingApprovalCount);

  // 접속 통계 데이터 조회 (최근 7일)
  const { data: connectStats = [] } = useQuery<StatsDto[]>({
    queryKey: ['dashboard', 'stats', 'connect'],
    queryFn: () => statsAdminService.getConnectStats({ statsKind: 'SERVICE' }),
    enabled: !!user
  });

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={hubContainerVariants}
      className="space-y-10 pb-20 px-2 lg:px-0"
    >
      <PopupManager />

      {/* Header Section */}
      <motion.div variants={hubItemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-2">
          <HubInsightBadge label={t('dashboard.badge')} />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-tight">
            안녕하세요, <span className="text-primary ">{user.name}</span>님
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-xl">
            오늘은 <span className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">주요 인사이트</span> 및 실시간 지표를 분석했습니다.
          </p>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin/community/boards')}
            aria-label={t('dashboard.createNewPost') || '새 포스팅 작성'}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 border-2 border-slate-900/10 bg-white text-slate-900 dark:bg-slate-900 dark:text-white dark:border-white/10 rounded-[0.1rem] font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Plus size={20} /> 새 포스팅
          </motion.button>
        </div>
      </motion.div>

      {/* Banner */}
      <motion.div variants={hubItemVariants} className="relative rounded-[0.1rem] overflow-hidden shadow-2xl">
        <BannerSlider />
      </motion.div>

      {/* Real-time Insights */}
      <motion.div variants={hubItemVariants} className="p-4 md:p-8 border-2 border-primary/5 rounded-[0.1rem] bg-slate-50 dark:bg-slate-900/50 shadow-inner">
        <RealTimeDashboard />
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={hubContainerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <HubSummaryCard
          key="summary-tasks"
          title="업무 현황"
          value={taskList.length.toString().padStart(2, '0')}
          description={`신규 배정된 업무 ${taskList.filter((t: DashboardTask) => t.isNew).length}건이 있습니다.`}
          icon={<Zap size={24} />}
          trend={-5}
          color="orange"
        />
        <HubSummaryCard
          key="summary-notifications"
          title="결재 대기"
          value={pendingCount.toString().padStart(2, '0')}
          description="현재 대기 중인 결재 요청입니다."
          icon={<Bell size={24} />}
          trend={pendingCount > 0 ? 10 : 0}
          color="purple"
        />
        <HubSummaryCard
          key="summary-security"
          title="보안 지수"
          value="안전"
          description="시스템 보안 및 인증 상태가 양호합니다."
          icon={<ShieldCheck size={24} />}
          trend={0}
          color="emerald"
        />
        <HubSummaryCard
          key="summary-visitors"
          title="오늘의 방문자"
          value={connectStats.length > 0 ? connectStats[connectStats.length-1].statsCo.toString() : '0'}
          description="실시간 접속 데이터 기반"
          icon={<BarChart3 size={24} />}
          trend={5}
          color="blue"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
          <HubChartCard
            key="main-visitor-chart"
            title="트래픽 데이터 분석"
            subtitle="시스템 실시간 방문자 분포 지표"
            icon={<BarChart3 size={24} />}
            color="blue"
          >
            <DashboardVisitorChart data={connectStats} />
          </HubChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <HubListCard
              key="list-notices"
              title="최근 공지사항"
              items={notiList}
              icon={<Bell size={20} />}
              moreHref="/admin/community/boards"
              color="blue"
            />
            <HubListCard
              key="list-tasks"
              title="배정된 업무"
              items={taskList}
              icon={<CheckCircle2 size={20} />}
              moreHref="/admin/community/boards"
              color="emerald"
            />
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-12">
          <motion.div
            variants={hubItemVariants}
            className="hub-card-premium p-10 bg-slate-900 text-white min-h-[500px] group"
          >
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
            <h3 className="text-2xl font-black mb-12 flex items-center gap-4 relative z-10 tracking-tight">
              <div className="w-10 h-10 rounded-[0.1rem] bg-white/10 flex items-center justify-center">
                <Clock size={22} className="text-primary" />
              </div>
              실시간 피드
            </h3>
            <div className="relative z-10">
              <ActivityFeed />
            </div>
          </motion.div>

          <motion.div
            variants={hubItemVariants}
            className="hub-card-premium p-10 group"
          >
            <div className="flex items-center justify-between mb-8">
              <h3 className="hub-label-accent flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-ping" />
                시스템 활성 지표
              </h3>
            </div>
            <div className="space-y-8">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm font-black">
                   <span className="opacity-80">CPU 사용률</span>
                   <span className="text-primary">24%</span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: '24%' }}
                     className="h-full bg-primary"
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm font-black">
                   <span className="opacity-80">메모리</span>
                   <span className="text-emerald-500">42%</span>
                 </div>
                 <div className="h-1.5 w-full bg-slate-100 dark:bg-white/5 rounded-full overflow-hidden">
                   <motion.div 
                     initial={{ width: 0 }}
                     animate={{ width: '42%' }}
                     className="h-full bg-emerald-500"
                   />
                 </div>
               </div>
            </div>
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-12 pb-20 animate-pulse">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 rounded-full opacity-40" />
          <Skeleton className="h-20 w-96 rounded-[0.1rem] opacity-50" />
          <Skeleton className="h-6 w-[500px] rounded-lg opacity-30" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-16 w-48 rounded-[0.1rem] opacity-30" />
          <Skeleton className="h-16 w-48 rounded-[0.1rem] opacity-40" />
        </div>
      </div>
      <Skeleton className="h-[250px] w-full rounded-[0.1rem] opacity-20" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={`dash-skeleton-item-${i}`} className="h-[320px] rounded-[0.1rem] opacity-20" />
        ))}
      </div>
    </div>
  );
}
