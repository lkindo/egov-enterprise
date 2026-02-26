'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  ArrowRight,
  Plus,
  BarChart3,
  Bell,
  AlertCircle,
  LayoutGrid,
  TrendingUp,
  TrendingDown,
  Sparkles,
  Zap,
  ShieldCheck
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { BannerSlider } from '@/app/components/dashboard/BannerSlider';
import { PopupManager } from '@/app/components/dashboard/PopupManager';
import { ActivityFeed } from '@/app/components/dashboard/ActivityFeed';
import { motion, AnimatePresence } from 'framer-motion';
import Link from 'next/link';

const DashboardVisitorChart = dynamic(
  () => import('@/app/components/dashboard/DashboardCharts').then((mod) => mod.DashboardVisitorChart),
  {
    loading: () => <Skeleton className="h-[300px] w-full rounded-xl" />,
    ssr: false,
  }
);

const DashboardPostChart = dynamic(
  () => import('@/app/components/dashboard/DashboardCharts').then((mod) => mod.DashboardPostChart),
  {
    loading: () => <Skeleton className="h-[200px] w-full rounded-xl" />,
    ssr: false,
  }
);

interface UnifiedDashboardClientProps {
  initialLeave: any;
  initialNotiList: any[];
  initialTaskList: any[];
}

export default function UnifiedDashboardClient({
  initialLeave,
  initialNotiList,
  initialTaskList
}: UnifiedDashboardClientProps) {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [myLeave] = useState(initialLeave);
  const [notiList] = useState(initialNotiList);
  const [taskList] = useState(initialTaskList);

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  // Framer Motion Variants
  const containerVariants: any = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants: any = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
      transition: {
        type: "spring",
        stiffness: 100
      }
    }
  };

  if (loading || !user) {
    return <DashboardSkeleton />;
  }

  return (
    <motion.div 
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className="space-y-10 pb-20 px-2 lg:px-0"
    >
      <PopupManager />
      
      {/* Header Section with Industrial Luxury Feel */}
      <motion.div variants={itemVariants} className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-2">
          <div className="inline-flex items-center gap-2 text-primary font-black text-[11px] uppercase tracking-[0.3em] bg-primary/10 w-fit px-4 py-1.5 rounded-full border border-primary/20 shadow-sm">
            <Sparkles size={14} className="animate-pulse" />
            <span>Digital Intelligence Engine</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-black tracking-tighter text-foreground leading-tight">
            Hi, <span className="text-primary italic">{user.name}</span>
          </h1>
          <p className="text-lg text-muted-foreground font-medium max-w-xl">
             오늘의 <span className="text-foreground font-bold underline decoration-primary/30 underline-offset-4">주요 인사이트</span>와 실시간 지표를 분석했습니다.
          </p>
        </div>
        
        <div className="flex gap-4 w-full lg:w-auto">
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/cop/smt/vct')} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 bg-slate-900 text-white dark:bg-primary dark:text-white rounded-[2rem] font-black shadow-2xl shadow-slate-900/20 hover:bg-primary transition-colors"
          >
            <Zap size={20} /> 휴가 신청
          </motion.button>
          <motion.button 
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => router.push('/cop/bbs')} 
            className="flex-1 lg:flex-none flex items-center justify-center gap-3 px-10 py-5 border-2 border-slate-900/10 bg-white rounded-[2rem] font-black hover:bg-slate-50 transition-all"
          >
            <Plus size={20} /> 새 포스트
          </motion.button>
        </div>
      </motion.div>

      {/* Banner with Glassmorphism Overlay handled inside BannerSlider or here */}
      <motion.div variants={itemVariants} className="relative rounded-[3.5rem] overflow-hidden shadow-2xl">
        <BannerSlider />
      </motion.div>

      {/* Summary Cards with Industrial Aesthetic */}
      <motion.div variants={containerVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        <SummaryCard 
          title="잔여 연차" 
          value={`${myLeave?.remndrYrycCo || 0}d`} 
          description={`Total 15 days allotted for ${new Date().getFullYear()}`} 
          icon={<Calendar size={24} />} 
          trend={12} 
          color="blue" 
        />
        <SummaryCard 
          title="내 업무 현황" 
          value="12" 
          description="3 high-priority tasks pending" 
          icon={<Zap size={24} />} 
          trend={-5} 
          color="orange" 
        />
        <SummaryCard 
          title="새 알림" 
          value="05" 
          description="Updates from collaboration teams" 
          icon={<Bell size={24} />} 
          trend={2} 
          color="purple" 
        />
        <SummaryCard 
          title="보안 지수" 
          value="Safe" 
          description="Encryption active & identity verified" 
          icon={<ShieldCheck size={24} />} 
          trend={0} 
          color="emerald" 
        />
      </motion.div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-12">
        <div className="xl:col-span-2 space-y-12">
          {/* Main Chart Card */}
          <motion.div 
            variants={itemVariants} 
            className="p-10 md:p-14 border-2 border-primary/5 rounded-[4rem] bg-card/50 backdrop-blur-xl shadow-2xl shadow-primary/5 relative overflow-hidden group"
          >
            <div className="absolute top-0 right-0 p-10 opacity-5 group-hover:opacity-10 transition-opacity">
              <BarChart3 size={200} />
            </div>
            <div className="flex items-center justify-between mb-12 relative z-10">
              <div>
                <h3 className="text-3xl font-black flex items-center gap-4 tracking-tighter">
                  <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <BarChart3 size={24} />
                  </div>
                   Traffic Analytics
                </h3>
                <p className="text-sm text-muted-foreground mt-2 font-bold uppercase tracking-[0.2em] opacity-60">System Visitor Distribution</p>
              </div>
            </div>
            <div className="relative z-10">
              <DashboardVisitorChart />
            </div>
          </motion.div>

          {/* Secondary Lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <DashboardListCard 
              title="Recent Notices" 
              items={notiList} 
              icon={<Bell size={20} />} 
              moreHref="/cop/bbs" 
              color="blue" 
            />
            <DashboardListCard 
              title="Assigned Tasks" 
              items={taskList} 
              icon={<CheckCircle2 size={20} />} 
              moreHref="/cop/bbs" 
              color="emerald" 
            />
          </div>
        </div>

        {/* Sidebar Widgets */}
        <div className="space-y-12">
          <motion.div 
            variants={itemVariants} 
            className="p-10 border-2 border-primary/5 rounded-[4rem] bg-slate-900 text-white shadow-2xl min-h-[500px] relative overflow-hidden group"
          >
            <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-primary/20 rounded-full blur-[100px]" />
            <h3 className="text-2xl font-black mb-12 flex items-center gap-4 relative z-10 tracking-tight">
              <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center">
                <Clock size={22} className="text-primary" />
              </div>
              Live Feed
            </h3>
            <div className="relative z-10">
              <ActivityFeed />
            </div>
          </motion.div>

          <motion.div 
            variants={itemVariants} 
            className="p-10 border-2 border-primary/5 rounded-[4rem] bg-card shadow-xl overflow-hidden relative"
          >
            <div className="flex items-center justify-between mb-8">
               <h3 className="text-[12px] font-black text-muted-foreground uppercase tracking-[0.4em] flex items-center gap-3">
                <div className="w-2 h-2 bg-primary rounded-full animate-ping" /> 
                System Pulse
              </h3>
              <div className="text-[10px] font-bold text-primary bg-primary/5 px-3 py-1 rounded-full">LIVE</div>
            </div>
            <DashboardPostChart />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}

function SummaryCard({ title, value, description, icon, trend, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-500 text-white border-blue-600 shadow-blue-500/20",
    orange: "bg-slate-900 text-white border-slate-800 shadow-slate-900/20",
    purple: "bg-white text-slate-900 border-slate-100 shadow-slate-200/50",
    emerald: "bg-emerald-500 text-white border-emerald-600 shadow-emerald-500/20"
  };

  const iconBgMap: any = {
    blue: "bg-white/20 text-white",
    orange: "bg-primary/20 text-primary",
    purple: "bg-slate-100 text-slate-900",
    emerald: "bg-white/20 text-white"
  };

  return (
    <motion.div 
      variants={{
        hidden: { scale: 0.9, opacity: 0 },
        visible: { scale: 1, opacity: 1 }
      }}
      whileHover={{ y: -8, transition: { duration: 0.2 } }}
      className={cn(
        "p-10 rounded-[3.5rem] border-2 transition-all flex flex-col justify-between h-[320px] relative overflow-hidden group",
        colorMap[color]
      )}
    >
      <div className="flex justify-between items-start relative z-10">
        <div className={cn("p-5 rounded-[1.5rem] transition-transform group-hover:rotate-6", iconBgMap[color])}>
          {icon}
        </div>
        {trend !== 0 && (
          <div className={cn(
            "flex items-center gap-1 text-[11px] font-black px-4 py-1.5 rounded-full backdrop-blur-md border",
            trend > 0 ? "bg-white/20 border-white/10" : "bg-red-500/20 border-red-500/10"
          )}>
            {trend > 0 ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      <div className="space-y-2 relative z-10">
        <p className="text-[11px] font-black uppercase tracking-[0.3em] opacity-60 mb-2">{title}</p>
        <h4 className="text-6xl font-black tracking-tighter leading-none">{value}</h4>
        <div className="pt-6">
           {/* HYDRATION FIX: changed <p> to <div> */}
           <div className="text-[11px] opacity-40 font-bold leading-relaxed max-w-[180px]">
             {description}
           </div>
        </div>
      </div>

      {/* Industrial decor element */}
      <div className="absolute -bottom-6 -left-6 opacity-5 group-hover:opacity-10 group-hover:rotate-12 transition-all duration-700">
        {icon}
      </div>
    </motion.div>
  );
}

function DashboardListCard({ title, items, icon, moreHref, color }: any) {
  const itemColorMap: any = {
    blue: "group-hover/item:border-blue-500/30 group-hover/item:bg-blue-50/50",
    emerald: "group-hover/item:border-emerald-500/30 group-hover/item:bg-emerald-50/50"
  };

  return (
    <motion.div 
      variants={{
        hidden: { y: 20, opacity: 0 },
        visible: { y: 0, opacity: 1 }
      }}
      className="border-2 border-primary/5 rounded-[4rem] bg-card shadow-2xl flex flex-col h-[480px] group overflow-hidden"
    >
      <div className="px-10 py-10 border-b border-primary/5 flex items-center justify-between">
        <h3 className="font-black text-2xl flex items-center gap-4 tracking-tight">
          <div className={cn("w-10 h-10 rounded-xl flex items-center justify-center", 
            color === 'blue' ? "bg-blue-100 text-blue-600" : "bg-emerald-100 text-emerald-600"
          )}>
            {icon}
          </div>
          {title}
        </h3>
        <Link href={moreHref || '#'} className="w-12 h-12 bg-muted/50 rounded-2xl flex items-center justify-center text-muted-foreground hover:text-primary hover:scale-110 transition-all">
          <ArrowRight size={20} />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-8 space-y-4 custom-scrollbar">
        {items && items.length > 0 ? (
          items.slice(0, 6).map((item: any, idx: number) => (
            <motion.div 
              key={idx} 
              whileHover={{ x: 5 }}
              className={cn(
                "flex flex-col gap-2 p-6 rounded-[2rem] border-2 border-transparent transition-all cursor-pointer group/item",
                itemColorMap[color]
              )}
            >
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-muted-foreground/40 uppercase tracking-widest">
                  {item.frstRegisterPnttmStr?.split(' ')[0] || '2026.02.17'}
                </span>
                <div className="w-1.5 h-1.5 rounded-full bg-slate-200 group-hover/item:bg-primary" />
              </div>
              <span className="text-[15px] font-black text-foreground line-clamp-1 tracking-tight">
                {item.nttSj}
              </span>
            </motion.div>
          ))
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground opacity-30 gap-4">
             <AlertCircle size={40} />
             <p className="text-sm font-black uppercase tracking-widest">No data available</p>
          </div>
        )}
      </div>
    </motion.div>
  );
}

function DashboardSkeleton() {
  return (
    <div className="space-y-12 pb-20 animate-pulse">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-6">
          <Skeleton className="h-8 w-48 rounded-full" />
          <Skeleton className="h-20 w-96 rounded-2xl" />
          <Skeleton className="h-6 w-[500px] rounded-lg" />
        </div>
        <div className="flex gap-4"><Skeleton className="h-16 w-48 rounded-[2rem]" /><Skeleton className="h-16 w-48 rounded-[2rem]" /></div>
      </div>
      <Skeleton className="h-[250px] w-full rounded-[4rem]" />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
        {[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-[320px] rounded-[3.5rem]" />)}
      </div>
    </div>
  );
}
