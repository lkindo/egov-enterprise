'use client';

import React, { useState, useEffect } from 'react';
import dynamic from 'next/dynamic';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { 
  Plus, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Zap, 
  Bell, 
  ShieldCheck, 
  BarChart3, 
  TrendingUp, 
  TrendingDown,
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { Skeleton } from '@/app/components/ui/skeleton';
import { cn } from '@/lib/utils';
import { useQuery } from '@tanstack/react-query';
import { statsAdminService, StatsDto } from '@/services/foundation/system/StatsAdminService';
import { BannerSlider } from '@/app/components/dashboard/BannerSlider';
import { PopupManager } from '@/app/components/dashboard/PopupManager';
import { ActivityFeed } from '@/app/components/dashboard/ActivityFeed';
import { RealTimeDashboard } from '@/components/features/dashboard/RealTimeDashboard';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';
import { useMessage } from '@/hooks/useMessage';

// Hub Common Components & Animations
import { HubSummaryCard } from '@/components/ui/hub/HubSummaryCard';
import { HubInsightBadge } from '@/components/ui/hub/HubInsightBadge';
import { HubListCard } from '@/components/ui/hub/HubListCard';
import { HubChartCard } from '@/components/ui/hub/HubChartCard';
import { hubContainerVariants, hubItemVariants } from '@/lib/hub-animations';
import { DashboardTask } from '@/types/foundation/dashboard';

const DashboardVisitorChart = dynamic(
  () => import('@/app/components/dashboard/DashboardCharts').then((mod) => mod.DashboardVisitorChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
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

  // ?‘ì† ?µê³„ ?°ì´??ì¡°íšŒ (ìµœê·¼ 7??
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

      {/* Header Section with Industrial Luxury Feel */}
      <motion.div variants={hubItemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-2">
          <HubInsightBadge label={t('dashboard.badge')} />
          <h1 className="text-2xl md:text-3xl font-black tracking-tighter text-foreground leading-tight">
            {t('dashboard.greeting')} <span className="text-primary ">{user.name}</span>??          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-xl">
            ?¤ëŠ˜??<span className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">ì£¼ìš” ?¸ì‚¬?´íŠ¸</span>?€ ?¤ì‹œê°?ì§€?œë? ë¶„ì„?ˆìŠµ?ˆë‹¤.
          </p>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin/community/boards')}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 border-2 border-slate-900/10 bg-white text-slate-900 dark:bg-slate-900 dark:text-white dark:border-white/10 rounded-[2rem] font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition-all"
          >
            <Plus size={20} /> ???¬ìŠ¤??          </motion.button>
        </div>
      </motion.div>

      {/* Banner with Glassmorphism Overlay handled inside BannerSlider or here */}
      <motion.div variants={hubItemVariants} className="relative rounded-[3.5rem] overflow-hidden shadow-2xl">
        <BannerSlider />
      </motion.div>

      {/* Real-time Insights & Connectivity */}
      <motion.div variants={hubItemVariants} className="p-4 md:p-8 border-2 border-primary/5 rounded-[4rem] bg-slate-50 dark:bg-slate-900/50 shadow-inner">
        <RealTimeDashboard />
      </motion.div>

      {/* Summary Cards */}
      <motion.div variants={hubContainerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <HubSummaryCard
          key="summary-tasks"
          title="???…ë¬´ ?„í™©"
          value={taskList.length.toString().padStart(2, '0')}
          description={t('dashboard.newTasks', { count: taskList.filter((t: DashboardTask) => t.isNew).length })}
          icon={<Zap size={24} />}
          trend={-5}
          color="orange"
        />
        <HubSummaryCard
          key="summary-notifications"
          title="ê²°ì¬ ?€ê¸?
          value={pendingCount.toString().padStart(2, '0')}
          description="?„ì¬ ?€ê¸°ì¤‘??ê²°ì¬ ?”ì²­?…ë‹ˆ??"
          icon={<Bell size={24} />}
          trend={pendingCount > 0 ? 10 : 0}
          color="purple"
        />
        <HubSummaryCard
          key="summary-security"
          title="ë³´ì•ˆ ì§€??
          value={t('dashboard.securityStatus.safe')}
          description={t('dashboard.securityStatus.desc')}
          icon={<ShieldCheck size={24} />}
          trend={0}
          color="emerald"
        />
        <HubSummaryCard
          key="summary-visitors"
          title="?¤ëŠ˜??ë°©ë¬¸??
          value={connectStats.length > 0 ? connectStats[connectStats.length-1].statsCo.toString() : '0'}
          description="?¤ì‹œê°??‘ì† ?°ì´??ê¸°ë°˜"
          icon={<BarChart3 size={24} />}
          trend={5}
          color="blue"
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
          {/* Main Chart Card */}
          <HubChartCard
            key="main-visitor-chart"
            title="?¸ë˜???°ì´??ë¶„ì„"
            subtitle="?œìŠ¤???¤ì‹œê°?ë°©ë¬¸??ë¶„í¬ ì§€??
            icon={<BarChart3 size={24} />}
            color="blue"
          >
            <DashboardVisitorChart data={connectStats} />
          </HubChartCard>

          {/* Secondary Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <HubListCard
              key="list-notices"
              title="ìµœê·¼ ê³µì??¬í•­"
              items={notiList}
              icon={<Bell size={20} />}
              moreHref="/admin/community/boards"
              color="blue"
            />
            <HubListCard
              key="list-tasks"
              title="ë°°ì •???…ë¬´"
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
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Clock size={22} className="text-primary" />
              </div>
              ?¤ì‹œê°??¼ë“œ
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
                ?œìŠ¤???œì„± ì§€??              </h3>
            </div>
            <div className="space-y-8">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm font-black">
                   <span className="opacity-40">CPU ?¬ìš©??/span>
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
                   <span className="opacity-40">ë©”ëª¨ë¦?/span>
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
          <Skeleton className="h-20 w-96 rounded-2xl opacity-50" />
          <Skeleton className="h-6 w-[500px] rounded-lg opacity-30" />
        </div>
        <div className="flex gap-4">
          <Skeleton className="h-16 w-48 rounded-[2rem] opacity-30" />
          <Skeleton className="h-16 w-48 rounded-[2rem] opacity-40" />
        </div>
      </div>
      <Skeleton className="h-[250px] w-full rounded-[4rem] opacity-20" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={`dash-skeleton-item-${i}`} className="h-[320px] rounded-[3.5rem] opacity-20" />
        ))}
      </div>
    </div>
  );
}
