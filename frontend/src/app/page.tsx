'use client';

import React, { useEffect, useState } from 'react';
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
  AlertCircle
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { StandardChartWrapper } from './components/ui/standard-chart-wrapper';
import { StatusBadge } from './components/ui/status-badge';
import { useToast } from './components/ui/toast';

export default function UnifiedDashboard() {
  const { user } = useAuth();
  const router = useRouter();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [myLeave, setMyLeave] = useState<any>(null);
  const [notiList, setNotiList] = useState<any[]>([]);
  const [taskList, setTaskList] = useState<any[]>([]);

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const currentYear = new Date().getFullYear().toString();
        
        const [leaveRes, dashboardRes] = await Promise.all([
          vacationService.getMyYearlyLeave(currentYear).catch(() => ({ success: false })),
          client.get('/dashboard').catch(() => ({ data: { success: false } }))
        ]);

        if (leaveRes.success) setMyLeave(leaveRes.data);
        if (dashboardRes.data.success) {
          setNotiList(dashboardRes.data.notiList || []);
          setTaskList(dashboardRes.data.taskList || []);
        }
      } catch (error) {
        toast('대시보드 데이터를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();
  }, [toast]);

  // 가상 차트 데이터
  const chartData = [
    { name: '월', work: 4 },
    { name: '화', work: 7 },
    { name: '수', work: 5 },
    { name: '목', work: 8 },
    { name: '금', work: 3 },
  ];

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
          <button 
            onClick={() => router.push('/cop/smt/vct')}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold shadow-md hover:shadow-lg transition-all"
          >
            <Plus size={18} /> 휴가 신청
          </button>
          <button 
            onClick={() => router.push('/cop/bbs')}
            className="flex items-center gap-2 px-4 py-2 border bg-card rounded-xl font-bold hover:bg-accent transition-all"
          >
            <MessageSquare size={18} /> 게시글 작성
          </button>
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
            loading={loading}
            height={250}
          />
          <div className="p-6 border rounded-2xl bg-card shadow-sm space-y-4">
            <h3 className="text-sm font-bold text-muted-foreground flex items-center gap-2">
              <CheckCircle2 size={16} className="text-green-500" />
              퀵 메뉴
            </h3>
            <div className="grid grid-cols-2 gap-2">
              <QuickLink href="/admin/user" label="사용자 관리" />
              <QuickLink href="/cop/bbs" label="공지사항" />
              <QuickLink href="/cop/smt/sdm" label="부서일정" />
              <QuickLink href="/admin/system" label="시스템 설정" />
            </div>
          </div>
        </div>

        {/* 4. Boards (Right) */}
        <div className="lg:col-span-2 space-y-6">
          <DashboardListCard 
            title="최신 공지사항" 
            items={notiList} 
            loading={loading} 
            icon={<Bell size={18} className="text-primary" />}
            moreHref="/cop/bbs"
          />
          <DashboardListCard 
            title="오늘의 할일" 
            items={taskList} 
            loading={loading} 
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
        <button className="text-xs text-muted-foreground hover:text-primary flex items-center gap-1 font-medium transition-colors">
          전체보기 <ArrowRight size={12} />
        </button>
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

function QuickLink({ href, label }: { href: string; label: string }) {
  return (
    <a 
      href={href} 
      className="p-3 border rounded-xl bg-card text-center text-xs font-bold text-muted-foreground hover:border-primary hover:text-primary hover:bg-primary/5 transition-all shadow-sm"
    >
      {label}
    </a>
  );
}
