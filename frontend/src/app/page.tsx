'use client';

import React, { useEffect, useState } from 'react';
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
  FileText,
  ShieldCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardChartWrapper } from './components/ui/standard-chart-wrapper';
import { StatusBadge } from './components/ui/status-badge';
import { useToast } from './components/ui/toast';

export default function UnifiedDashboard() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const { toast } = useToast();

  const [dashboardLoading, setDashboardLoading] = useState(true);
  const [myLeave, setMyLeave] = useState<any>(null);
  const [notiList, setNotiList] = useState<any[]>([]);
  const [taskList, setTaskList] = useState<any[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [apiStatus, setApiStatus] = useState<'checking' | 'ok' | 'error'>('checking');

  useEffect(() => {
    // API 서버 상태 확인
    const checkApiStatus = async () => {
      try {
        // 간단한 상태 확인 API 호출
        const response = await fetch('/api/v1/health');
        if (response.ok) {
          setApiStatus('ok');
        } else {
          setApiStatus('error');
        }
      } catch (err) {
        // health check가 없을 수 있으므로, 기본 API 호출로 확인
        try {
          const response = await client.get('/auth/me');
          setApiStatus('ok');
        } catch (apiErr) {
          setApiStatus('error');
        }
      }
    };

    checkApiStatus();
    
    async function loadDashboardData() {
      if (!user) return; // Wait for authentication
      
      try {
        setDashboardLoading(true);
        setError(null);
        
        const currentYear = new Date().getFullYear().toString();

        const [leaveRes, dashboardRes] = await Promise.allSettled([
          vacationService.getMyYearlyLeave(currentYear),
          client.get('/dashboard')
        ]);

        if (leaveRes.status === 'fulfilled' && leaveRes.value.success) {
          setMyLeave(leaveRes.value.data);
        } else if (leaveRes.status === 'rejected') {
          console.error('Leave service error:', leaveRes.reason);
        }

        if (dashboardRes.status === 'fulfilled' && dashboardRes.value.data.success) {
          setNotiList(dashboardRes.value.data.notiList || []);
          setTaskList(dashboardRes.value.data.taskList || []);
        } else if (dashboardRes.status === 'rejected') {
          console.error('Dashboard API error:', dashboardRes.reason);
        }
      } catch (err: any) {
        console.error('Dashboard loading error:', err);
        setError(err.message || '대시보드 데이터를 불러오는데 실패했습니다.');
        toast('대시보드 데이터를 불러오지 못했습니다.', 'error');
      } finally {
        setDashboardLoading(false);
      }
    }

    // Only load dashboard data after authentication is complete
    if (!authLoading) {
      loadDashboardData();
    }
  }, [user, authLoading, toast]);

  // 가상 차트 데이터
  const chartData = [
    { name: '월', work: 4 },
    { name: '화', work: 7 },
    { name: '수', work: 5 },
    { name: '목', work: 8 },
    { name: '금', work: 3 },
  ];

  // API 서버 상태 확인 중
  if (apiStatus === 'checking') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-8">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto animate-pulse">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <BarChart3 className="text-white" size={24} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">시스템 연결 확인 중...</h1>
          <p className="text-muted-foreground">잠시만 기다려주세요.</p>
        </div>
      </div>
    );
  }

  // API 서버 연결 실패
  if (apiStatus === 'error') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-8">
        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center">
            <AlertCircle className="text-white" size={24} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">서버 연결에 실패했습니다</h1>
          <p className="text-muted-foreground mb-4">서버가 정상적으로 실행 중인지 확인해주세요.</p>
          <div className="space-y-2 text-sm text-muted-foreground">
            <p>• 백엔드 서버(http://localhost:8080)가 실행 중인지 확인</p>
            <p>• 네트워크 연결 상태 확인</p>
          </div>
          <div className="pt-4">
            <button
              onClick={() => window.location.reload()}
              className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
            >
              다시 시도
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show loading state while authenticating
  if (authLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="animate-pulse">
            <h1 className="text-3xl font-black tracking-tight text-foreground h-8 bg-muted rounded w-64"></h1>
            <p className="text-muted-foreground mt-1 h-4 bg-muted rounded w-80"></p>
          </div>
          <div className="flex gap-3">
            <div className="h-10 w-32 bg-muted rounded-xl"></div>
            <div className="h-10 w-32 bg-muted rounded-xl"></div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="p-6 rounded-2xl border bg-card shadow-sm">
              <div className="flex justify-between items-start mb-4">
                <div className="p-3 rounded-xl bg-muted/50">
                  <div className="w-6 h-6 bg-muted rounded-full"></div>
                </div>
                <div className="px-2 py-1 rounded text-[10px] font-bold uppercase bg-muted">
                  Live
                </div>
              </div>
              <div className="h-8 bg-muted rounded w-16 mb-2"></div>
              <div className="h-4 bg-muted rounded w-24 mb-2"></div>
              <div className="h-3 bg-muted rounded w-32"></div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
            <div className="p-6 border rounded-2xl bg-card shadow-sm h-64">
              <div className="h-6 bg-muted rounded w-48 mb-4"></div>
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="h-10 bg-muted rounded" />
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-2 space-y-6">
            {[1, 2].map((card) => (
              <div key={card} className="border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col h-[300px]">
                <div className="px-6 py-4 border-b bg-muted/5">
                  <div className="h-6 bg-muted rounded w-48"></div>
                </div>
                <div className="flex-1 p-4 space-y-3">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="h-10 bg-muted rounded" />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Show welcome message if not logged in
  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-8">
        <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto">
          <div className="w-12 h-12 bg-primary rounded-full flex items-center justify-center">
            <ShieldCheck className="text-white" size={24} />
          </div>
        </div>
        <div>
          <h1 className="text-3xl font-bold text-foreground mb-2">전자정부 현대화 플랫폼</h1>
          <p className="text-lg text-muted-foreground max-w-md mx-auto">
            효율적인 업무 관리와 다양한 기능을 제공하는 통합 플랫폼에 오신 것을 환영합니다.
          </p>
        </div>
        <div className="pt-4">
          <button
            onClick={() => router.push('/login')}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            로그인 하기
          </button>
        </div>
      </div>
    );
  }

  // Show error state if there was an error
  if (error) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center space-y-6 p-8">
        <div className="w-24 h-24 bg-destructive/10 rounded-full flex items-center justify-center mx-auto">
          <div className="w-12 h-12 bg-destructive rounded-full flex items-center justify-center">
            <AlertCircle className="text-white" size={24} />
          </div>
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground mb-2">대시보드 데이터를 불러올 수 없습니다</h1>
          <p className="text-muted-foreground mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            다시 시도
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* 1. Welcome Section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-black tracking-tight text-foreground">
            안녕하세요, <span className="text-primary">{user?.name || '사용자'}</span>님!
          </h1>
          <p className="text-muted-foreground mt-1 font-medium">오늘도 활기찬 하루 되세요. 현재 주요 업무 현황입니다.</p>
        </div>
        <div className="flex gap-3">
          <Link
            href="/cop/smt/vct"
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} /> 휴가 신청
          </Link>
          <Link
            href="/cop/bbs"
            className="flex items-center gap-2 px-4 py-2 border bg-card rounded-xl font-bold hover:bg-accent transition-all"
          >
            <MessageSquare size={18} /> 게시글 작성
          </Link>
        </div>
      </div>

      {/* 2. Top Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <SummaryCard
          title="잔여 연차"
          value={`${myLeave?.remndrYrycCo || 0} 일`}
          description="올해 사용 가능한 휴가"
          icon={<Calendar className="text-blue-600" />}
          trend="primary"
        />
        <SummaryCard
          title="진행 업무"
          value="12 건"
          description="오늘까지 완료 필요"
          icon={<Clock className="text-orange-500" />}
          trend="warning"
        />
        <SummaryCard
          title="새 알림"
          value="5 건"
          description="확인하지 않은 메시지"
          icon={<Bell className="text-purple-500" />}
          trend="info"
        />
        <SummaryCard
          title="장애 접수"
          value="1 건"
          description="시스템 점검 필요"
          icon={<AlertCircle className="text-red-500" />}
          trend="danger"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3. Work Statistics (Left) */}
        <div className="lg:col-span-1 space-y-6">
          <StandardChartWrapper
            title="주간 업무 처리 현황"
            type="bar"
            data={chartData}
            dataKeys={['work']}
            loading={dashboardLoading}
            height={250}
          />
          <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              퀵 메뉴
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink href="/admin/user" label="사용자 관리" icon={<Users size={14} />} />
              <QuickLink href="/cop/bbs" label="공지사항" icon={<MessageSquare size={14} />} />
              <QuickLink href="/cop/smt/sdm" label="부서일정" icon={<Calendar size={14} />} />
              <QuickLink href="/admin/system" label="시스템 설정" icon={<Settings size={14} />} />
            </div>
          </div>
        </div>

        {/* 4. Boards (Right) */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardListCard
            title="최신 공지사항"
            items={notiList}
            loading={dashboardLoading}
            icon={<Bell size={18} className="text-primary" />}
            moreHref="/cop/bbs"
          />
          <DashboardListCard
            title="오늘의 할일"
            items={taskList}
            loading={dashboardLoading}
            icon={<CheckCircle2 size={18} className="text-green-500" />}
            moreHref="/cop/bbs"
          />
        </div>
      </div>
    </div>
  );
}

// Internal Helper Components
function SummaryCard({ title, value, description, icon, trend }: any) {
  return (
    <div className="p-6 rounded-2xl border bg-card shadow-sm hover:shadow-md transition-all group">
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-muted/50 group-hover:bg-primary/5 transition-colors">
          {icon}
        </div>
        <div className={cn(
          "px-2 py-1 rounded text-[10px] font-bold uppercase",
          trend === 'primary' ? "bg-blue-100 text-blue-700" :
          trend === 'warning' ? "bg-orange-100 text-orange-700" :
          trend === 'danger' ? "bg-red-100 text-red-700" : "bg-purple-100 text-purple-700"
        )}>
          Live
        </div>
      </div>
      <h4 className="text-2xl font-black text-foreground">{value}</h4>
      <p className="text-xs font-bold text-muted-foreground mt-1">{title}</p>
      <p className="text-[11px] text-muted-foreground/60 mt-3">{description}</p>
    </div>
  );
}

function DashboardListCard({ title, items, loading, icon, moreHref }: any) {
  return (
    <div className="border rounded-2xl bg-card shadow-sm overflow-hidden flex flex-col h-[300px]">
      <div className="px-6 py-4 border-b flex items-center justify-between bg-muted/5">
        <h3 className="font-bold flex items-center gap-2">
          {icon}
          {title}
        </h3>
        {moreHref && (
          <Link
            href={moreHref}
            className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-medium transition-colors"
          >
            전체보기 <ArrowRight size={12} />
          </Link>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-2">
        {loading ? (
          <div className="p-4 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-10 bg-muted/50 animate-pulse rounded-lg" />)}
          </div>
        ) : items.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-muted-foreground italic text-sm">
            데이터가 없습니다.
          </div>
        ) : (
          <div className="space-y-1">
            {items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-accent/50 rounded-xl transition-colors cursor-pointer group">
                <span className="text-sm font-medium text-foreground truncate flex-1 group-hover:text-primary">
                  {item.nttSj}
                </span>
                <span className="text-[10px] text-muted-foreground ml-4 shrink-0 font-medium">
                  {item.frstRegisterPnttmStr || '2026-02-14'}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function QuickLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <Link
      href={href}
      className="p-3 border rounded-xl bg-card text-center text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm flex flex-col items-center justify-center gap-1"
    >
      {icon}
      {label}
    </Link>
  );
}
