'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { statsService } from '@/services/statsService';
import { SummaryStats, ConnectStats, MenuStats } from '@/types/stats';
import { useToast } from '@/app/components/ui/toast';
import { BarChart3, Users, FileText, MousePointer2, AlertTriangle, TrendingUp } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function AdminStatsPage() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState<SummaryStats | null>(null);
  const [connectData, setConnectData] = useState<any[]>([]);
  const [menuData, setMenuData] = useState<MenuStats[]>([]);

  const loadStats = useCallback(async () => {
    try {
      setLoading(true);
      const [sumRes, connRes, menuRes] = await Promise.all([
        statsService.getSummary().catch(() => ({ data: { success: false } })),
        statsService.getConnectStats({ startDate: '20260201', endDate: '20260214' }).catch(() => ({ data: [] })),
        statsService.getMenuStats().catch(() => ({ data: [] }))
      ]);

      if (sumRes.success) setSummary(sumRes.data);
      
      // Transform connect data for line chart
      const transformedConn = Array.isArray(connRes) ? connRes.map(item => ({
        name: item.date.substring(4, 8),
        count: item.count
      })) : [];
      setConnectData(transformedConn);

      // Menu data for table and charts
      if (Array.isArray(menuRes)) setMenuData(menuRes);

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
      className: 'font-bold' 
    },
    { header: '사용 횟수', accessor: (item: MenuStats) => item.count.toLocaleString() + ' 회' },
    { 
      header: '비중', 
      accessor: (item: MenuStats) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className="h-full bg-primary" style={{ width: `${item.percentage}%` }} />
          </div>
          <span className="text-xs font-bold text-muted-foreground w-8">{item.percentage}%</span>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-8 pb-12">
      <PageHeader 
        title="시스템 통합 통계 및 분석" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '사용통계' }]}
        actions={
          <DataExportExcel 
            data={menuData} 
            headers={[
              { label: '메뉴명', key: 'menuNm' },
              { label: '사용횟수', key: 'count' },
              { label: '비중(%)', key: 'percentage' }
            ]}
            filename="system_menu_stats"
          />
        }
      />

      {/* 1. Summary Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard title="누적 사용자" value={summary?.totalUsers} icon={<Users size={20} />} trend="+2.5%" />
        <StatCard title="오늘 접속" value={summary?.todayConnects} icon={<MousePointer2 size={20} />} trend="+12%" />
        <StatCard title="총 게시글" value={summary?.totalPosts} icon={<FileText size={20} />} trend="+0.8%" />
        <StatCard title="미결 장애" value={summary?.pendingTroubles} icon={<AlertTriangle size={20} />} isAlert />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 2. Connection Trend (Line Chart) */}
        <StandardChartWrapper 
          title="최근 14일 접속 추이"
          type="line"
          data={connectData}
          dataKeys={['count']}
          loading={loading}
          height={350}
        />

        {/* 3. Menu Usage (Bar Chart) */}
        <StandardChartWrapper 
          title="메뉴별 사용량 Top 5"
          type="bar"
          data={menuData.slice(0, 5).map(m => ({ name: m.menuNm, count: m.count }))}
          dataKeys={['count']}
          loading={loading}
          height={350}
        />
      </div>

      {/* 4. Detailed Stats Table */}
      <div className="space-y-4">
        <div className="flex items-center gap-2 px-1">
          <TrendingUp size={18} className="text-primary" />
          <h3 className="font-black text-foreground">메뉴별 상세 이용 현황</h3>
        </div>
        <StandardDataTable 
          columns={menuColumns} 
          data={menuData} 
          loading={loading}
          emptyMessage="분석된 통계 데이터가 없습니다."
        />
      </div>
    </div>
  );
}

function StatCard({ title, value, icon, trend, isAlert }: any) {
  return (
    <div className={cn(
      "p-6 rounded-2xl border shadow-sm bg-card transition-all hover:shadow-md",
      isAlert && value > 0 && "border-red-200 bg-red-50/30 dark:bg-red-900/10"
    )}>
      <div className="flex justify-between items-start mb-4">
        <div className="p-3 rounded-xl bg-muted/50 text-primary">
          {icon}
        </div>
        {trend && (
          <span className="text-[10px] font-black text-green-600 bg-green-50 px-2 py-1 rounded">
            {trend}
          </span>
        )}
      </div>
      <h4 className="text-2xl font-black text-foreground">{value?.toLocaleString() ?? 0}</h4>
      <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest mt-1">{title}</p>
    </div>
  );
}
