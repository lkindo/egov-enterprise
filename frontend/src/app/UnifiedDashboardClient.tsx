'use client';

import React, { useState, useEffect, use } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Clock,
  CheckCircle2,
  Zap,
  Bell,
  ShieldCheck
} from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { DashboardSkeleton } from '@/app/components/dashboard/DashboardSkeleton';
import { motion } from 'framer-motion';
import { useMessage } from '@/hooks/useMessage';

// Hub Common Components & Animations
import { HubSummaryCard } from '@/components/ui/hub/HubSummaryCard';
import { HubInsightBadge } from '@/components/ui/hub/HubInsightBadge';
import { HubListCard } from '@/components/ui/hub/HubListCard';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { DashboardTask } from '@/types/foundation/dashboard';

// [재사용 base] 배너/팝업/통계 데모 위젯은 제거됨(해당 도메인 삭제). 실시간 피드(websocket)·활동 피드·
// 공지/업무 리스트 등 커널·게시판 기반 위젯만 유지한다.
const ActivityFeed = dynamic(() => import('@/app/components/dashboard/ActivityFeed').then(mod => mod.ActivityFeed), {
  loading: () => <div className="space-y-4 pt-10"><Skeleton className="h-11 w-full" /><Skeleton className="h-11 w-full" /></div>,
  ssr: false
});
const RealTimeDashboard = dynamic(() => import('@/components/features/dashboard/RealTimeDashboard').then(mod => mod.RealTimeDashboard), {
  loading: () => <Skeleton className="h-[150px] w-full rounded-lg" />,
  ssr: false
});

interface UnifiedDashboardClientProps {
  dataPromise: Promise<{
    initialNotiList: DashboardTask[];
    initialTaskList: DashboardTask[];
    pendingApprovalCount: number;
  }>;
}

export default function UnifiedDashboardClient({
  dataPromise
}: UnifiedDashboardClientProps) {
  const data = use(dataPromise);
  const notiList = data.initialNotiList || [];
  const taskList = data.initialTaskList || [];
  const pendingCount = data.pendingApprovalCount || 0;
  const { t } = useMessage();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user && isMounted) {
      router.push('/login');
    }
  }, [user, loading, router, isMounted]);

  if (!isMounted || loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={hubContainerVariants}
      className="space-y-10 pb-20 px-2 lg:px-0"
    >
      {/* Header Section */}
      <motion.div variants={hubItemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-2">
          <HubInsightBadge label={t('dashboard.badge')} />
          <h1 className="text-2xl md:text-3xl font-bold tracking-tighter text-foreground leading-tight">
            안녕하세요, <span className="text-primary ">{user.name}</span>님
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-xl">
            오늘은 <span className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">주요 인사이트</span> 및 실시간 지표를 분석했습니다.
          </p>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <motion.button
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={() => router.push('/admin/community/boards')}
            aria-label={t('dashboard.createNewPost') || '새 게시글 작성'}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 border border-border/60 bg-background text-foreground dark:bg-card dark:text-foreground dark:border-white/10 rounded-lg font-bold hover:bg-muted transition-all shadow-sm"
          >
            <Plus size={20} /> 새 게시글 작성
          </motion.button>
        </div>
      </motion.div>

      {/* Real-time Insights (WebSocket 기반) */}
      <motion.div variants={hubItemVariants} className="p-4 md:p-8 border border-border/80 rounded-lg bg-card/40 dark:bg-card/20 shadow-sm">
        <RealTimeDashboard />
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={hubContainerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
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
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
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
            className="hub-card-dark min-h-[500px] group"
          >
            <h3 className="text-2xl font-bold mb-12 flex items-center gap-4 relative z-10 tracking-tight">
              <div className="w-10 h-10 rounded-lg bg-white/10 flex items-center justify-center">
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
                <div className="w-2 h-2 bg-primary rounded-full animate-pulse" />
                시스템 활성 지표
              </h3>
            </div>
            <div className="space-y-8">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm font-bold">
                   <span className="opacity-80">CPU 사용률</span>
                   <span className="text-primary">24%</span>
                 </div>
                 <div className="h-1.5 w-full bg-muted dark:bg-white/5 rounded-lg overflow-hidden">
                   <motion.div
                     initial={{ width: 0 }}
                     animate={{ width: '24%' }}
                     className="h-full bg-primary"
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <div className="flex justify-between text-sm font-bold">
                   <span className="opacity-80">메모리</span>
                   <span className="text-emerald-500">42%</span>
                 </div>
                 <div className="h-1.5 w-full bg-muted dark:bg-white/5 rounded-lg overflow-hidden">
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
