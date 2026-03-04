'use client';

import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { networkService, NetworkServiceStatus } from '@/services/networkService';
import { Network, RefreshCcw, Activity, ShieldCheck, Search, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

const QUERY_KEY = ['admin', 'monitoring-networks'] as const;

export default function NetworkMonitoringPage() {

  const { data, isLoading, refetch } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => networkService.getNetworkLogs({ ntwrkId: 'all', page: 0, size: 50 }),
    staleTime: 60 * 1000,
  });

  const logs: NetworkServiceStatus[] = data?.content || [];

  const columns = [
    {
      header: '대상 시스템',
      accessor: (item: NetworkServiceStatus) => item.sysNm,
      className: 'font-black'
    },
    {
      header: 'IP 주소',
      accessor: (item: NetworkServiceStatus) => item.sysIp,
      className: 'font-mono text-xs text-muted-foreground'
    },
    {
      header: '포트',
      accessor: (item: NetworkServiceStatus) => item.sysPort,
      className: 'w-20 font-mono text-xs'
    },
    {
      header: '연결 상태',
      accessor: (item: NetworkServiceStatus) => <StatusBadge status={item.svcSttus === '01' ? 'Y' : 'N'} />
    },
    {
      header: '최종 체크',
      accessor: (item: NetworkServiceStatus) => item.logDt,
      className: 'text-[10px] text-muted-foreground font-medium'
    },
    {
      header: '액션',
      className: 'text-right',
      accessor: () => (
        <button className="p-1.5 hover:bg-primary/10 text-primary rounded-md transition-all">
          <Zap size={14} fill="currentColor" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6 pb-12">
      <PageHeader
        title="네트워크 및 서비스 가용성 관제"
        breadcrumbs={[{ label: '시스템관리' }, { label: '모니터링' }, { label: '네트워크' }]}
        actions={
          <Button
            onClick={() => refetch()}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl font-bold shadow-md hover:bg-primary/90 transition-all"
          >
            <RefreshCcw size={16} className={cn(isLoading && "animate-spin")} /> 일괄 점검
          </Button>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatusCard title="정상 서비스" value={logs.filter(l => l.svcSttus === '01').length} color="green" icon={<ShieldCheck size={20} />} />
        <StatusCard title="연결 오류" value={logs.filter(l => l.svcSttus !== '01').length} color="red" icon={<Activity size={20} />} />
      </div>

      <div className="bg-card border rounded-3xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Network size={14} /> 서비스 노드 연결 현황
          </h3>
        </div>
        <StandardDataTable
          columns={columns}
          data={logs}
          loading={isLoading}
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}

function StatusCard({ title, value, color, icon }: any) {
  const colors: any = {
    green: "bg-green-50 text-green-600 border-green-100",
    red: "bg-red-50 text-red-600 border-red-100"
  };
  return (
    <div className={cn("p-6 border rounded-2xl shadow-sm bg-card flex items-center justify-between", colors[color] && "border-l-4 " + colors[color])}>
      <div>
        <p className="text-[10px] font-black text-muted-foreground uppercase tracking-widest">{title}</p>
        <h4 className="text-2xl font-black text-foreground mt-1">{value} <span className="text-sm font-normal">건</span></h4>
      </div>
      <div className={cn("p-3 rounded-xl", colors[color])}>{icon}</div>
    </div>
  );
}