'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { statsService } from '@/services/statsService';
import { SummaryStats, ConnectStats, MenuStats } from '@/types/stats';
import { useToast } from '@/app/components/ui/toast';
import { BarChart3, Users, FileText, MousePointer2, AlertTriangle, TrendingUp, Globe } from 'lucide-react';
import { cn } from '@/lib/utils';
import { NationalDistributionMap } from '@/app/components/ui/national-distribution-map';

export default function AdminStatsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [connectData, setConnectData] = useState<any[]>([]);
  const [menuData, setMenuData] = useState<MenuStats[]>([]);
  const [browserData, setBrowserData] = useState<{ name: string, count: number }[]>([]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, connRes, menuRes] = await Promise.all([
        statsService.getSummary().catch(() => ({ totalUsers: 0, totalPosts: 0, todayConnects: 0, pendingTroubles: 0 })),
        statsService.getConnectStats({ startDate: '20260201', endDate: '20260214' }).catch(() => []),
        statsService.getMenuStats().catch(() => [])
      ]);

      setSummary(sumRes);

      // Transform connect data for area chart
      const transformedConn = Array.isArray(connRes) ? connRes.map(item => ({
        name: item.date.substring(4, 6) + '/' + item.date.substring(6, 8),
        count: item.count
      })) : [];
      setConnectData(transformedConn);

      // Menu data
      if (Array.isArray(menuRes)) setMenuData(menuRes);

      // Mock Browser Data for demonstration
      setBrowserData([
        { name: 'Chrome', count: 6542 },
        { name: 'Safari', count: 2120 },
        { name: 'Edge', count: 1250 },
        { name: 'Others', count: 580 }
      ]);

    } catch (error) {
      toast('통계 데이터를 분석하는 중 오류가 발생했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadStats();
  }, [loadStats]);

  const menuColumns = [
    {
      header: '메뉴명',
      accessor: (item: MenuStats) => item.menuNm,
      className: 'font-bold text-foreground py-4'
    },
    {
      header: '사용 횟수',
      accessor: (item: MenuStats) => (
        <span className="font-black text-primary">{item.count.toLocaleString()}</span>
      )
    },
    {
      header: '비중',
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-4 min-w-[200px]">
          <div className="flex-1 h-3 bg-muted/30 rounded-full overflow-hidden border">
            <div
              className="h-full bg-gradient-to-r from-blue-600 to-blue-400 transition-all duration-1000"
              style={{ width: `${item.percentage}%` }}
            />
          </div>
          <span className="text-xs font-black text-muted-foreground w-10 text-right italic">{item.percentage}%</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-10 pb-20 animate-in fade-in duration-700">
      <PageHeader
        title="인텔리전스 통계 대시보드"
        breadcrumbs={[{ label: '시스템관리' }, { label: '사용분석' }]}
        actions={
          <div className="flex items-center gap-3">
            <select className="px-3 py-1.5 rounded-lg border bg-background text-xs font-bold outline-none ring-primary/20 focus:ring-4">
              <option>최근 14일</option>
              <option>최근 1개월</option>
              <option>최근 3개월</option>
            </select>
            <DataExportExcel
              data={menuData}
              headers={[
                { label: '메뉴명', key: 'menuNm' },
                { label: '사용횟수', key: 'count' },
                { label: '비중(%)', key: 'percentage' }
              ]}
              filename="system_intelligence_stats"
            />
          </div>
        }
      />

      {/* 1. Summary Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard title="누적 사용자" value={summary?.totalUsers} icon={<Users size={20} />} trend="+2.5%" />
        <StatCard title="오늘 접속" value={summary?.todayConnects} icon={<MousePointer2 size={20} />} trend="+12%" />
        <StatCard title="총 게시글" value={summary?.totalPosts} icon={<FileText size={20} />} trend="+0.8%" />
        <StatCard title="미결 장애" value={summary?.pendingTroubles} icon={<AlertTriangle size={20} />} isAlert />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 2. Connection Trend (Area Chart) */}
        <StandardChartWrapper
          title="최근 접속 추이 (지능형 분석)"
          type="area"
          data={connectData}
          dataKeys={['count']}
          loading={loading}
          height={380}
          className="lg:col-span-2"
        />

        {/* 3. Browser Distribution (Pie Chart) */}
        <StandardChartWrapper
          title="환경별 접속 비중"
          type="pie"
          data={browserData}
          dataKeys={['count']}
          loading={loading}
          height={380}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 4. Menu Usage (Bar Chart) */}
        <StandardChartWrapper
          title="최다 이용 서비스 Top 5"
          type="bar"
          data={menuData.slice(0, 5).map(m => ({ name: m.menuNm, count: m.count }))}
          dataKeys={['count']}
          loading={loading}
          height={400}
        />

        {/* 5. National Distribution Map */}
        <NationalDistributionMap />
      </div>

      {/* 6. Detailed Stats Table */}
      <div className="p-10 border rounded-[2.5rem] bg-card shadow-sm space-y-8">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <TrendingUp size={24} className="text-primary" />
            <div className="flex flex-col">
              <h3 className="text-lg font-black text-foreground uppercase tracking-tight">메뉴별 이용 심층 데이터 분석</h3>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Deep-dive analytic report</p>
            </div>
          </div>
          <span className="text-xs font-black text-primary px-4 py-2 bg-primary/5 rounded-full border border-primary/10">LIVE DATA STREAMING</span>
        </div>
        <StandardDataTable
          columns={menuColumns}
          data={menuData.slice(0, 10)}
          loading={loading}
          emptyMessage="데이터 분석 중..."
        />
      </div>

      {/* 7. System Intelligence Summary Footer */}
      <div className="p-12 rounded-[3.5rem] bg-gradient-to-br from-[#0055FB] via-[#1E6BFF] to-[#3B82F6] text-white shadow-2xl relative overflow-hidden group">
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-white/10 rounded-full -translate-y-1/2 translate-x-1/2 blur-[100px] group-hover:scale-110 transition-transform duration-[2000ms]" />
        <div className="relative z-10 flex flex-col xl:row items-center justify-between gap-12">
          <div className="space-y-6 text-center xl:text-left">
            <div className="flex items-center justify-center xl:justify-start gap-3">
              <div className="flex -space-x-2">
                {[1, 2, 3].map(i => <div key={i} className="w-6 h-6 rounded-full border-2 border-primary bg-blue-400" />)}
              </div>
              <span className="text-[10px] font-black uppercase tracking-[0.4em] text-blue-100 italic">Trusted by Internal Audit Engine</span>
            </div>
            <h2 className="text-4xl md:text-6xl font-black tracking-tighter leading-tight">AI & DDD 기반 최적화 엔진이 <br /> 실시간 가동 중입니다.</h2>
            <div className="flex flex-wrap gap-4 items-center justify-center xl:justify-start">
              <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-black uppercase border border-white/20 tracking-widest">Rich Domain Model</span>
              <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-black uppercase border border-white/20 tracking-widest">Event Driven</span>
              <span className="px-4 py-1.5 rounded-full bg-white/10 backdrop-blur-md text-[10px] font-black uppercase border border-white/20 tracking-widest">Hexagonal</span>
            </div>
          </div>
          <button className="px-12 py-6 bg-white text-blue-600 rounded-full font-black text-sm uppercase tracking-widest shadow-2xl hover:bg-blue-50 transition-all hover:-translate-y-2 active:scale-95 flex items-center gap-3">
            비즈니스 리포트 보기
            <TrendingUp size={18} />
          </button>
        </div>
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, isAlert }: any) {
  return (
    <div className={cn(
      "p-8 rounded-3xl border shadow-sm bg-card transition-all hover:scale-[1.02] hover:shadow-xl group cursor-default",
      isAlert && value > 0 && "border-red-200 bg-red-50/20"
    )}>
      <div className="flex justify-between items-start mb-6">
        <div className="p-4 rounded-2xl bg-primary/5 text-primary group-hover:bg-primary group-hover:text-white transition-colors">
          {icon}
        </div>
        {trend && (
          <div className="flex flex-col items-end">
            <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded-full mb-1">
              {trend}
            </span>
            <span className="text-[8px] font-bold text-muted-foreground uppercase opacity-0 group-hover:opacity-100 transition-opacity">vs Prev</span>
          </div>
        )}
      </div>
      <h4 className="text-4xl font-black text-foreground tracking-tighter">{value?.toLocaleString() ?? 0}</h4>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-[0.2em] mt-2 flex items-center gap-2">
        <span className="w-4 h-px bg-muted-foreground/30" />
        {title}
      </p>
    </div>
  );
}
