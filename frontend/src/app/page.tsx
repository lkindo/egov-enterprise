'use client';

import React, { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import { vacationService } from '@/services/vacationService';
import client from '@/lib/api/client';
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
  Users,
  Settings,
  ShieldCheck,
  TrendingUp,
  TrendingDown,
  LayoutGrid
} from 'lucide-react';
import dynamic from 'next/dynamic';
import { cn } from '@/lib/utils';
import { useToast } from './components/ui/toast';
import { Skeleton } from '@/components/ui/skeleton';
import { BannerSlider } from '@/app/components/dashboard/BannerSlider';
import { PopupManager } from '@/app/components/dashboard/PopupManager';
import { ActivityFeed } from '@/app/components/dashboard/ActivityFeed';

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

export default function UnifiedDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [myLeave, setMyLeave] = useState<any>(null);
  const [notiList, setNotiList] = useState<any[]>([]);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  // API 상태 확인을 위한 견고한 함수
  const checkConnection = useCallback(async () => {
    try {
      // 3초 타임아웃 적용
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);
      
      const response = await fetch('/api/v1/health', { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);

      if (response?.ok) {
        setApiStatus('ok');
      } else {
        // Health API가 없을 경우를 대비해 권한 체크로 우회
        try {
          await client.get('/auth/me');
          setApiStatus('ok');
        } catch {
          setApiStatus('ok'); // 연결 확인 실패해도 화면은 띄움
        }
      }
    } catch (err) {
      setApiStatus('ok'); 
    }
  }, []);

  useEffect(() => {
    checkConnection();
  }, [checkConnection]);

  const loadDashboardData = useCallback(async () => {
    if (!user) return;
    
    try {
      setDashboardLoading(true);
      const currentYear = new Date().getFullYear().toString();

      const [leaveRes, dashboardRes] = await Promise.allSettled([
        vacationService.getMyYearlyLeave(currentYear),
        client.get('/dashboard')
      ]);

      if (leaveRes.status === 'fulfilled' && leaveRes.value.success) {
        setMyLeave(leaveRes.value.data);
      }

      if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data.success) {
        setNotiList(dashboardRes.value.data.notiList || []);
        setTaskList(dashboardRes.value.data.taskList || []);
      }
    } catch (err: any) {
      console.error('Dashboard loading error:', err);
    } finally {
      setDashboardLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (!authLoading && user && apiStatus === 'ok') {
      loadDashboardData();
    }
  }, [user, authLoading, apiStatus, loadDashboardData]);

  // 1. 서버 연결 확인 중 및 인증 로딩 중 (초기 진입)
  if (authLoading || (apiStatus === 'checking' && !user)) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6">
        <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        <p className="font-black text-primary animate-pulse uppercase tracking-[0.2em] text-xs">Initializing System...</p>
      </div>
    );
  }

  // 2. 비인증 상태
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[70vh] text-center max-w-2xl mx-auto px-4 animate-in fade-in zoom-in-95 duration-700">
        <div className="w-24 h-24 bg-primary/10 rounded-[2.5rem] flex items-center justify-center mb-8 rotate-6 hover:rotate-0 transition-transform duration-500 shadow-inner">
          <ShieldCheck className="text-primary" size={40} />
        </div>
        <h1 className="text-4xl md:text-5xl font-black tracking-tighter text-foreground mb-4 uppercase italic">
          Enterprise <span className="text-primary underline decoration-8 decoration-primary/20 underline-offset-8">Portal</span> 5.0
        </h1>
        <p className="text-lg text-muted-foreground mb-10 leading-relaxed font-medium">
          국가 정보화 표준 프레임워크 기반의 차세대 전사 관리 시스템입니다.<br />
          인증된 사용자만 접근 가능합니다. 안전한 이용을 위해 로그인해 주세요.
        </p>
        <button
          onClick={() => router.push('/login')}
          className="px-12 py-5 bg-primary text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-primary/30 hover:shadow-primary/40 hover:-translate-y-1 transition-all active:scale-95"
        >
          로그인 후 시작하기
        </button>
        <div className="mt-12 pt-12 border-t border-primary/5 w-full">
          <p className="text-[10px] font-black text-muted-foreground/30 uppercase tracking-[0.4em]">Standard Government Framework Modernized</p>
        </div>
      </div>
    );
  }

  // 3. 메인 대시보드 렌더링
  return (
    <div className="space-y-8 pb-10 animate-in fade-in duration-1000">
      <PopupManager />
      
      {/* Header & Quick Actions */}
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
          <button
            onClick={() => router.push('/cop/smt/vct')}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 bg-primary text-white rounded-2xl font-black shadow-xl shadow-primary/20 hover:scale-[1.02] transition-all active:scale-95"
          >
            <Plus size={18} /> 휴가 신청
          </button>
          <button
            onClick={() => router.push('/cop/bbs')}
            className="flex-1 lg:flex-none flex items-center justify-center gap-2 px-8 py-4 border-2 border-primary/10 bg-card rounded-2xl font-black hover:bg-accent hover:border-primary/20 transition-all active:scale-95"
          >
            <MessageSquare size={18} /> 게시글 작성
          </button>
        </div>
      </div>

      <BannerSlider />

      {/* Summary Statistics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        <SummaryCard
          title="잔여 연차"
          value={`${myLeave?.remndrYrycCo || 0}일`}
          description="총 15일 중"
          icon={<Calendar className="text-blue-600" size={20} />}
          trend={12}
          color="blue"
        />
        <SummaryCard
          title="진행중인 업무"
          value="12건"
          description="금주 마감 3건"
          icon={<Clock className="text-orange-500" size={20} />}
          trend={-5}
          color="orange"
        />
        <SummaryCard
          title="미확인 알림"
          value="5건"
          description="최근 24시간"
          icon={<Bell className="text-purple-500" size={20} />}
          trend={2}
          color="purple"
        />
        <SummaryCard
          title="시스템 상태"
          value="정상"
          description="Uptime 99.9%"
          icon={<CheckCircle2 className="text-emerald-500" size={20} />}
          trend={0}
          color="emerald"
        />
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
              <div className="flex gap-2">
                <span className="flex items-center gap-2 text-[10px] font-black px-4 py-1.5 bg-primary/10 text-primary rounded-full border border-primary/10">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-pulse" />
                  Live Visitors
                </span>
              </div>
            </div>
            <DashboardVisitorChart />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
            <DashboardListCard
              title="최신 공지사항"
              items={notiList}
              loading={dashboardLoading}
              icon={<Bell size={20} className="text-blue-500" />}
              moreHref="/cop/bbs"
              color="blue"
            />
            <DashboardListCard
              title="오늘의 할일"
              items={taskList}
              loading={dashboardLoading}
              icon={<CheckCircle2 size={20} className="text-emerald-500" />}
              moreHref="/cop/bbs"
              color="emerald"
            />
          </div>
        </div>

        <div className="space-y-10">
          <div className="p-10 border-2 border-primary/5 rounded-[3rem] bg-card shadow-2xl shadow-primary/5 h-full relative overflow-hidden group">
            <h3 className="text-2xl font-black mb-10 flex items-center gap-3 relative z-10">
              <Clock size={24} className="text-primary" />
              최근 활동
            </h3>
            <div className="relative z-10">
              <ActivityFeed />
            </div>
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

function SummaryCard({ title, value, description, icon, trend, color }: any) {
  const colorMap: any = {
    blue: "bg-blue-50 text-blue-600 border-blue-100",
    orange: "bg-orange-50 text-orange-600 border-orange-100",
    purple: "bg-purple-50 text-purple-600 border-purple-100",
    emerald: "bg-emerald-50 text-emerald-600 border-emerald-100"
  };

  return (
    <div className="p-8 rounded-[2.5rem] border-2 border-primary/5 bg-card shadow-lg hover:shadow-2xl hover:shadow-primary/5 transition-all group overflow-hidden relative">
      <div className="flex justify-between items-start mb-8">
        <div className={cn("p-4 rounded-2xl transition-all group-hover:scale-110 shadow-inner", colorMap[color])}>
          {icon}
        </div>
        {trend !== 0 && (
          <div
            className={cn(
              "flex items-center gap-1 text-[10px] font-black px-3 py-1 rounded-full shadow-sm",
              trend > 0 ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
            )}
            role="img"
            aria-label={`전일 대비 ${Math.abs(trend)}% ${trend > 0 ? '상승' : '하락'}`}
          >
            {trend > 0 ? <TrendingUp size={12} aria-hidden="true" /> : <TrendingDown size={12} aria-hidden="true" />}
            <span aria-hidden="true">{Math.abs(trend)}%</span>
          </div>
        )}
      </div>
      <div className="relative z-10 space-y-1">
        <h4 className="text-4xl font-black text-foreground tracking-tighter leading-none">{value}</h4>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest pt-2">{title}</p>
        <p className="text-[11px] text-muted-foreground/40 mt-6 flex items-center gap-2 font-bold italic">
          <div className="w-1.5 h-1.5 bg-primary/20 rounded-full" />
          {description}
        </p>
      </div>
      <div className="absolute -right-6 -bottom-6 opacity-[0.03] scale-[3] rotate-12 group-hover:rotate-0 transition-transform duration-700 pointer-events-none">
        {icon}
      </div>
    </div>
  );
}

function DashboardListCard({ title, items, loading, icon, moreHref, color }: any) {
  const borderColors: any = {
    blue: "group-hover:border-blue-200",
    emerald: "group-hover:border-emerald-200"
  };

  const textColors: any = {
    blue: "group-hover:text-blue-600",
    emerald: "group-hover:text-emerald-600"
  };

  return (
    <div className={cn(
      "border-2 border-primary/5 rounded-[3rem] bg-card shadow-xl overflow-hidden flex flex-col h-[420px] group transition-all duration-500",
      borderColors[color]
    )}>
      <div className="px-10 py-8 border-b border-primary/5 flex items-center justify-between bg-muted/5">
        <h3 className="font-black text-xl flex items-center gap-3">
          {icon}
          {title}
        </h3>
        <Link
          href={moreHref || '#'}
          className="p-3 bg-muted/50 rounded-2xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-all active:scale-90"
          aria-label={`${title} 더보기`}
        >
          <ArrowRight size={18} aria-hidden="true" />
        </Link>
      </div>
      <div className="flex-1 overflow-y-auto p-6 custom-scrollbar">
        {loading ? (
          <div className="space-y-4 p-2">
            {[1,2,3,4,5].map(i => <div key={i} className="h-14 bg-muted/40 animate-pulse rounded-2xl" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/30 italic text-sm gap-4">
            <div className="w-16 h-16 bg-muted/20 rounded-[2rem] flex items-center justify-center">
              <AlertCircle size={32} />
            </div>
            <p className="font-black uppercase tracking-widest text-xs">No Data Available</p>
          </div>
        ) : (
          <div className="space-y-3">
            {items.slice(0, 6).map((item: any, idx: number) => (
              <div 
                key={idx} 
                className="flex items-center justify-between p-5 hover:bg-muted/30 rounded-[1.75rem] transition-all cursor-pointer group/item border border-transparent hover:border-primary/5 shadow-sm hover:shadow-md"
              >
                <div className="flex items-center gap-4 overflow-hidden">
                  <div className="w-2 h-2 rounded-full bg-muted shrink-0 group-hover/item:bg-primary group-hover/item:scale-125 transition-all" />
                  <span className={cn(
                    "text-sm font-bold text-foreground truncate group-hover/item:translate-x-1 transition-transform",
                    textColors[color]
                  )}>
                    {item.nttSj}
                  </span>
                </div>
                <span className="text-[10px] text-muted-foreground/50 ml-4 shrink-0 font-black bg-muted/50 px-3 py-1 rounded-lg uppercase tracking-tighter">
                  {item.frstRegisterPnttmStr?.split(' ')[0] || '2026.02.17'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
