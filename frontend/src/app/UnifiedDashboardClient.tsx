'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import {
  Calendar,
  MessageSquare,
  CheckCircle2,
  Clock,
  Plus,
  BarChart3,
  Bell,
  LayoutGrid,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { Skeleton } from '@/components/ui/skeleton';
import { BannerSlider } from '@/app/components/dashboard/BannerSlider';
import { PopupManager } from '@/app/components/dashboard/PopupManager';
import { ActivityFeed } from '@/app/components/dashboard/ActivityFeed';
import { SummaryCard } from '@/app/components/dashboard/SummaryCard';
import { DashboardListCard } from '@/app/components/dashboard/DashboardListCard';

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

// Define icons outside component for referential stability
const ICON_CALENDAR = <Calendar className="text-blue-600" size={20} />;
const ICON_CLOCK = <Clock className="text-orange-500" size={20} />;
const ICON_BELL = <Bell className="text-purple-500" size={20} />;
const ICON_CHECK = <CheckCircle2 className="text-emerald-500" size={20} />;
const ICON_BELL_BLUE = <Bell size={20} className="text-blue-500" />;
const ICON_CHECK_EMERALD = <CheckCircle2 size={20} className="text-emerald-500" />;

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
  const { user } = useAuth();
  const router = useRouter();

  if (!user) return null;

  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-1000">
      <PopupManager />
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-6">
        <div>
          <div className="flex items-center gap-2 text-primary font-black text-[10px] uppercase tracking-[0.2em] mb-2 bg-primary/5 w-fit px-3 py-1 rounded-full border border-primary/10">
            <LayoutGrid size={12} />
            <span>Dashboard Intelligence</span>
          </div>
          <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground">
            환영합니다, <span className="text-primary">{user.name}</span>님!
          </h1>
          <p className="text-muted-foreground mt-2 font-medium">오늘의 주요 지표와 업무 현황을 지능적으로 분석했습니다.</p>
        </div>
        <div className="flex gap-3 w-full lg:w-auto">
          <button onClick={() => router.push('/cop/smt/vct')} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95">
            <Plus size={18} /> 휴가 신청
          </button>
          <button onClick={() => router.push('/cop/bbs')} className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 border-2 border-primary/10 bg-card rounded-2xl font-black hover:bg-accent hover:border-primary/20 transition-all active:scale-95">
            <MessageSquare size={18} /> 게시글 작성
          </button>
        </div>
      </div>
      <BannerSlider />
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard title="잔여 연차" value={`${initialLeave?.remndrYrycCo || 0}일`} description="총 15일 중" icon={ICON_CALENDAR} trend={12} color="blue" />
        <SummaryCard title="진행중인 업무" value="12건" description="금주 마감 3건" icon={ICON_CLOCK} trend={-5} color="orange" />
        <SummaryCard title="미확인 알림" value="5건" description="최근 24시간" icon={ICON_BELL} trend={2} color="purple" />
        <SummaryCard title="시스템 상태" value="정상" description="Uptime 99.9%" icon={ICON_CHECK} trend={0} color="emerald" />
      </div>
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-10">
        <div className="xl:col-span-2 space-y-10">
          <div className="p-10 border-2 border-primary/5 rounded-[3rem] bg-card shadow-2xl shadow-primary/5 relative overflow-hidden group">
            <div className="flex items-center justify-between mb-10 relative z-10">
              <div>
                <h3 className="text-2xl font-black flex items-center gap-3">
                  <BarChart3 size={24} className="text-primary" />
                  주간 방문자 추이
                </h3>
                <p className="text-xs text-muted-foreground mt-1.5 font-bold uppercase tracking-widest">Real-time Traffic Analytics</p>
              </div>
            </div>
            <DashboardVisitorChart />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <DashboardListCard title="최신 공지사항" items={initialNotiList} icon={ICON_BELL_BLUE} moreHref="/cop/bbs" color="blue" />
            <DashboardListCard title="오늘의 할일" items={initialTaskList} icon={ICON_CHECK_EMERALD} moreHref="/cop/bbs" color="emerald" />
          </div>
        </div>
        <div className="space-y-10">
          <div className="p-10 border-2 border-primary/5 rounded-[3rem] bg-card shadow-2xl shadow-primary/5 h-full relative overflow-hidden group">
            <h3 className="text-2xl font-black mb-10 flex items-center gap-3 relative z-10">
              <Clock size={24} className="text-primary" />
              최근 활동
            </h3>
            <div className="relative z-10"><ActivityFeed /></div>
          </div>
          <div className="p-10 border-2 border-primary/5 rounded-[3rem] bg-card shadow-2xl shadow-primary/5 overflow-hidden">
            <h3 className="text-[10px] font-black mb-8 text-muted-foreground uppercase tracking-[0.3em] flex items-center gap-2">
              <div className="w-1 h-1 bg-primary rounded-full" /> Posts Analytics
            </h3>
            <DashboardPostChart />
          </div>
        </div>
      </div>
    </div>
  );
}
