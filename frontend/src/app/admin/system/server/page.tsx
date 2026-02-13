'use client';

import React, { useEffect, useState } from 'react';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { StatusBadge } from '@/app/components/ui/status-badge';
import { serverService, ServerInfo } from '@/services/serverService';
import { useToast } from '@/app/components/ui/toast';
import { Server, Monitor, Database, Globe, Cpu, MoreHorizontal, Settings2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ServerAdminPage() {
  const { toast } = useToast();
  const [servers, setServers] = useState<ServerInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const res = await serverService.getServers({});
        if (res.success) setServers(res.data || []);
      } catch (error) {
        toast('서버 정보를 불러오지 못했습니다.', 'error');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [toast]);

  const columns = [
    { 
      header: '서버 유형', 
      accessor: (item: ServerInfo) => (
        <div className="flex items-center gap-2">
          {item.serverKnd === '1' ? <Cpu size={16} className="text-orange-500" /> :
           item.serverKnd === '2' ? <Database size={16} className="text-blue-500" /> :
           <Globe size={16} className="text-green-500" />}
          <span className="text-xs font-bold text-muted-foreground uppercase">{item.serverKnd === '1' ? 'WAS' : item.serverKnd === '2' ? 'DB' : 'WEB'}</span>
        </div>
      ),
      className: 'w-28'
    },
    { header: '서버명', accessor: 'serverNm', className: 'font-black' },
    { header: 'IP 주소', accessor: 'serverIp', className: 'text-xs font-mono text-muted-foreground' },
    { 
      header: '가동 상태', 
      accessor: (item: ServerInfo) => <StatusBadge status={item.svcSttus === '01' ? 'Y' : 'N'} /> 
    },
    {
      header: '액션',
      className: 'text-right',
      accessor: () => (
        <button className="p-2 hover:bg-accent rounded-lg transition-all"><Settings2 size={16} className="text-muted-foreground" /></button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <PageHeader 
        title="전사 인프라 관리" 
        breadcrumbs={[{ label: '시스템관리' }, { label: '서버정보' }]}
      />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <ServerSummaryCard title="총 서버" count={servers.length} icon={<Server size={20} />} color="primary" />
        <ServerSummaryCard title="정상 가동" count={servers.filter(s => s.svcSttus === '01').length} icon={<Monitor size={20} />} color="green" />
        <ServerSummaryCard title="점검 필요" count={servers.filter(s => s.svcSttus !== '01').length} icon={<AlertCircle size={20} />} color="red" />
      </div>

      <div className="bg-card border rounded-2xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-muted/5 flex items-center justify-between">
          <h3 className="text-sm font-black text-muted-foreground uppercase tracking-widest flex items-center gap-2">
            <Monitor size={14} /> 시스템 자산 목록
          </h3>
        </div>
        <StandardDataTable 
          columns={columns} 
          data={servers} 
          loading={loading}
          className="border-none rounded-none"
        />
      </div>
    </div>
  );
}

function ServerSummaryCard({ title, count, icon, color }: any) {
  const colors: any = {
    primary: "bg-primary text-white shadow-primary/20",
    green: "bg-green-500 text-white shadow-green-500/20",
    red: "bg-red-500 text-white shadow-red-500/20"
  };
  return (
    <div className={cn("p-6 rounded-2xl shadow-lg flex items-center justify-between", colors[color])}>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest opacity-80">{title}</p>
        <h4 className="text-3xl font-black mt-1">{count} <span className="text-sm font-normal">대</span></h4>
      </div>
      <div className="p-3 bg-white/20 rounded-xl">{icon}</div>
    </div>
  );
}

function AlertCircle({ size }: { size: number }) { return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>; }
