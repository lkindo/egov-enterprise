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
  const initialNotiList = data.initialNotiList || [];
  const initialTaskList = data.initialTaskList || [];
  const pendingApprovalCount = data.pendingApprovalCount || 0;
  const { t } = useMessage();
  const { user, loading } = useAuth();
  const router = useRouter();

  const [notiList] = useState<DashboardTask[]>(initialNotiList);
  const [taskList] = useState<DashboardTask[]>(initialTaskList);
  const [pendingCount] = useState<number>(pendingApprovalCount);

  // ?묒냽 ?듦퀎 ?곗씠??議고쉶 (理쒓렐 7??
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
            ?덈뀞?섏꽭?? <span className="text-primary ">{user.name}</span>??          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-xl">
            ?ㅻ뒛? <span className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">二쇱슂 ?몄궗?댄듃</span> 諛??ㅼ떆媛?吏?쒕? 遺꾩꽍?덉뒿?덈떎.
          </p>
        </div>

        <div className="flex gap-4 w-full lg:w-auto">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/admin/community/boards')}
            aria-label={t('dashboard.createNewPost') || '???ъ뒪???묒꽦'}
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 border-2 border-slate-900/10 bg-white text-slate-900 dark:bg-slate-900 dark:text-white dark:border-white/10 rounded-[0.1rem] font-black hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <Plus size={20} /> ???ъ뒪??          </motion.button>
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
          title="?낅Т ?꾪솴"
          value={taskList.length.toString().padStart(2, '0')}
          description={`?좉퇋 諛곗젙???낅Т ${taskList.filter((t: DashboardTask) => t.isNew).length}嫄댁씠 ?덉뒿?덈떎.`}
          icon={<Zap size={24} />}
          trend={-5}
          color="orange"
        />
        <HubSummaryCard
          key="summary-notifications"
          title="寃곗옱 ?湲?
          value={pendingCount.toString().padStart(2, '0')}
          description="?꾩옱 ?湲?以묒씤 寃곗옱 ?붿껌?낅땲??"
          icon={<Bell size={24} />}
          trend={pendingCount > 0 ? 10 : 0}
          color="purple"
        />
        <HubSummaryCard
          key="summary-security"
          title="蹂댁븞 吏??
          value="?덉쟾"
          description="?쒖뒪??蹂댁븞 諛??몄쬆 ?곹깭媛 ?묓샇?⑸땲??"
          icon={<ShieldCheck size={24} />}
          trend={0}
          color="emerald"
        />
        <HubSummaryCard
          key="summary-visitors"
          title="?ㅻ뒛??諛⑸Ц??
          value={connectStats.length > 0 ? connectStats[connectStats.length-1].statsCo.toString() : '0'}
          description="?ㅼ떆媛??묒냽 ?곗씠??湲곕컲"
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
            title="?몃옒???곗씠??遺꾩꽍"
            subtitle="?쒖뒪???ㅼ떆媛?諛⑸Ц??遺꾪룷 吏??
            icon={<BarChart3 size={24} />}
            color="blue"
          >
            <DashboardVisitorChart data={connectStats} />
          </HubChartCard>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <HubListCard
              key="list-notices"
              title="理쒓렐 怨듭??ы빆"
              items={notiList}
              icon={<Bell size={20} />}
              moreHref="/admin/community/boards"
              color="blue"
            />
            <HubListCard
              key="list-tasks"
              title="諛곗젙???낅Т"
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
              ?ㅼ떆媛??쇰뱶
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
                ?쒖뒪???쒖꽦 吏??              </h3>
            </div>
            <div className="space-y-8">
               <div className="space-y-2">
                 <div className="flex justify-between text-sm font-black">
                   <span className="opacity-80">CPU ?ъ슜瑜?/span>
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
                   <span className="opacity-80">硫붾え由?/span>
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
