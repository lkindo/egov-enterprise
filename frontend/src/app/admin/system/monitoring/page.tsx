'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardChartWrapper } from '@/app/components/ui/standard-chart-wrapper';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StandardTabs, TabItem } from '@/app/components/ui/standard-tabs';
import { StandardSummaryCard } from '@/app/components/ui/standard-summary-card';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { monitoringService } from '@/services/monitoringService';
import { ServerResourceLog, ProcessMonitoring } from '@/types/monitoring';
import { useToast } from '@/app/components/ui/toast';
import { 
  Server, 
  Database, 
  Activity, 
  RefreshCcw,
  ShieldCheck,
  Zap,
  Network
} from 'lucide-react';
import { cn } from '@/lib/utils';

export default function IntegratedMonitoringPage() {
  const { toast } = useToast();
  const [activeTab, setTab] = useState('server');
  const [loading, setLoading] = useState(true);
  
  const [serverLogs, setServerLogs] = useState<ServerResourceLog[]>([]);
  const [processes, setProcesses] = useState<ProcessMonitoring[]>([]);
  const [fsLogs, setFsLogs] = useState<any[]>([]);
  const [httpLogs, setHttpLogs] = useState<any[]>([]);
  const [chartData, setChartData] = useState<any[]>([]);

  const loadMonitoringData = useCallback(async () => {
    try {
      setLoading(true);
      if (activeTab === 'server') {
        const res = await monitoringService.getServerLogs({ size: 50 });
        if (res.success) {
          const content = res.data.content || [];
          setServerLogs(content);
          setChartData(content.slice(0, 10).reverse().map((l: any) => ({
            name: l.logDt.substring(11, 16),
            cpu: l.cpuUseRt,
            mem: l.memoryUseRt
          })));
        }
      } else if (activeTab === 'process') {
        setProcesses([
          { processNm: 'API-Server', processSttus: 'RUNNING', lastCheckDt: '2026-02-14 14:30:01' },
          { processNm: 'Postgres-DB', processSttus: 'RUNNING', lastCheckDt: '2026-02-14 14:30:05' },
          { processNm: 'Redis-Cache', processSttus: 'RUNNING', lastCheckDt: '2026-02-14 14:29:50' },
          { processNm: 'Batch-Job', processSttus: 'STOPPED', lastCheckDt: '2026-02-14 14:00:00' },
        ]);
      } else if (activeTab === 'network') {
        setHttpLogs([
          { name: '대외연계 API', url: 'https://api.external.go.kr', status: '200 OK', time: '124ms' },
          { name: '공공데이터포털', url: 'https://data.go.kr', status: '200 OK', time: '45ms' },
          { name: '행정망 게이트웨이', url: 'https://gw.intra.local', status: '503 ERR', time: '0ms' },
        ]);
      } else if (activeTab === 'db') {
        setFsLogs([
          { drive: '/dev/sda1 (Root)', total: '100GB', used: '45GB', percent: 45 },
          { drive: '/data (Storage)', total: '500GB', used: '380GB', percent: 76 },
          { drive: '/var/log (Log)', total: '50GB', used: '12GB', percent: 24 },
        ]);
      }
    } catch (error) {
      toast('모니터링 데이터를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [activeTab, toast]);

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 60000); 
    return () => clearInterval(interval);
  }, [loadMonitoringData]);

  const tabItems: TabItem[] = [
    { id: 'server', label: '서버 자원', icon: <Server size={18} /> },
    { id: 'process', label: '프로세스', icon: <Activity size={18} /> },
    { id: 'db', label: '데이터베이스', icon: <Database size={18} /> },
    { id: 'network', label: '네트워크/HTTP', icon: <Network size={18} /> },
  ];

  const serverColumns = [
    { header: '서버명', accessor: 'serverNm', className: 'font-bold' },
    { 
      header: 'CPU 사용률', 
      accessor: (item: ServerResourceLog) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full", item.cpuUseRt > 80 ? "bg-red-500" : "bg-blue-500")} style={{ width: `${item.cpuUseRt}%` }} />
          </div>
          <span className="text-xs font-medium">{item.cpuUseRt}%</span>
        </div>
      )
    },
    { 
      header: 'MEM 사용률', 
      accessor: (item: ServerResourceLog) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-1.5 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full", item.memoryUseRt > 80 ? "bg-red-500" : "bg-green-500")} style={{ width: `${item.memoryUseRt}%` }} />
          </div>
          <span className="text-xs font-medium">{item.memoryUseRt}%</span>
        </div>
      )
    },
    { header: '기록 시간', accessor: 'logDt', className: 'text-xs text-muted-foreground' },
    { header: '상태', accessor: (item: ServerResourceLog) => <StatusBadge status={item.svcSttus === '01' ? 'Y' : 'N'} /> }
  ];

  const processColumns = [
    { header: '프로세스명', accessor: 'processNm', className: 'font-bold' },
    { header: '최종 체크', accessor: 'lastCheckDt', className: 'text-xs text-muted-foreground' },
    { 
      header: '상태', 
      accessor: (item: ProcessMonitoring) => (
        <span className={cn(
          "px-2 py-1 rounded text-[10px] font-black uppercase",
          item.processSttus === 'RUNNING' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {item.processSttus}
        </span>
      )
    }
  ];

  const fsColumns = [
    { header: '마운트 경로', accessor: 'drive', className: 'font-bold' },
    { header: '전체 용량', accessor: 'total' },
    { header: '사용량', accessor: 'used' },
    { 
      header: '사용률', 
      accessor: (item: any) => (
        <div className="flex items-center gap-3">
          <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
            <div className={cn("h-full", item.percent > 80 ? "bg-red-500" : "bg-primary")} style={{ width: `${item.percent}%` }} />
          </div>
          <span className="text-xs font-bold w-8">{item.percent}%</span>
        </div>
      )
    }
  ];

  const httpColumns = [
    { header: '서비스명', accessor: 'name', className: 'font-bold' },
    { header: 'URL', accessor: 'url', className: 'text-xs text-muted-foreground font-mono' },
    { header: '응답 시간', accessor: 'time', className: 'text-xs font-medium' },
    { 
      header: '상태', 
      accessor: (item: any) => (
        <span className={cn(
          "px-2 py-0.5 rounded text-[10px] font-black",
          item.status === '200 OK' ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
        )}>
          {item.status}
        </span>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="시스템 통합 모니터링 센터" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '실시간 관제' }]}
        actions={
          <button 
            onClick={loadMonitoringData}
            className="flex items-center gap-2 px-4 py-2 border rounded-xl font-bold hover:bg-accent transition-all"
          >
            <RefreshCcw size={16} className={cn(loading && "animate-spin")} />
            새로고침
          </button>
        }
      />

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StandardSummaryCard title="서버 상태" value="정상" icon={<Server size={20} />} variant="blue" />
        <StandardSummaryCard title="평균 CPU" value="24" unit="%" icon={<Zap size={20} />} variant="orange" />
        <StandardSummaryCard title="DB 연결" value="양호" icon={<Database size={20} />} variant="green" />
        <StandardSummaryCard title="활성 프로세스" value="48 / 50" icon={<Activity size={20} />} variant="purple" />
      </div>

      <StandardTabs items={tabItems} activeTab={activeTab} onChange={setTab} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Visual Analytics */}
        <div className="lg:col-span-1">
          <StandardChartWrapper 
            title="리소스 사용 추이 (최근 10회)"
            type="line"
            data={chartData}
            dataKeys={['cpu', 'mem']}
            loading={loading}
            height={400}
          />
        </div>

        {/* Detailed Status Table */}
        <div className="lg:col-span-2 bg-card border rounded-2xl shadow-sm overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
            <h3 className="font-bold flex items-center gap-2">
              <ShieldCheck size={18} className="text-primary" />
              상세 현황 목록
            </h3>
          </div>
          <div className="p-0">
            <StandardDataTable 
              columns={
                activeTab === 'server' ? serverColumns : 
                activeTab === 'process' ? processColumns :
                activeTab === 'db' ? fsColumns :
                httpColumns
              } 
              data={
                activeTab === 'server' ? serverLogs : 
                activeTab === 'process' ? processes :
                activeTab === 'db' ? fsLogs :
                httpLogs
              } 
              loading={loading}
              className="border-none rounded-none"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
