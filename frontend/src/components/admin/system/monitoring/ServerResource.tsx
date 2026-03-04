'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { UltimateDataGrid, ColumnDef } from '@/app/components/ui/ultimate-data-grid';
import { monitoringAdminService, ServerResrceLog } from '@/services/admin/system/MonitoringAdminService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw, Cpu, Database } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ServerResource() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ServerResrceLog[]>([]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const result = await monitoringAdminService.getServerResourceLogs({ page: 0, size: 50 });
      setLogs((result as any)?.content || (result as any)?.data?.content || []);
    } catch (error) {
      toast('서버 리소스 로그 추출에 실패했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns: ColumnDef<ServerResrceLog>[] = [
    {
      id: 'logId',
      header: 'Telemetry ID',
      width: 150,
      accessor: (item: ServerResrceLog) => (
        <span className="text-[10px] font-mono font-black text-slate-400 uppercase tracking-widest">{item.logId || 'Auto-Gen'}</span>
      )
    },
    {
      id: 'serverNm',
      header: 'Node Identity',
      width: 250,
      accessor: (item: ServerResrceLog) => (
        <div className="flex flex-col">
          <span className="text-sm font-black text-slate-900 italic uppercase tracking-tighter">{item.serverNm || item.serverId}</span>
          <span className="text-[9px] font-mono font-bold text-slate-400 uppercase tracking-widest opacity-60">ID: {item.serverId}</span>
        </div>
      )
    },
    {
      id: 'cpuUseRt',
      header: 'Compute Load (CPU)',
      width: 220,
      accessor: (item: ServerResrceLog) => (
        <div className="flex flex-col gap-2 py-2">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1">
              <Cpu size={10} className={cn(item.cpuUseRt > 80 ? "text-rose-500" : "text-emerald-500")} />
              <span className="text-[10px] font-black italic uppercase text-slate-400">Processor Unit</span>
            </div>
            <span className={cn("text-xs font-black tabular-nums italic", item.cpuUseRt > 80 ? "text-rose-600" : "text-slate-900")}>
              {item.cpuUseRt}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-200/50">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                item.cpuUseRt > 80 ? "bg-gradient-to-r from-rose-500 to-rose-400" : "bg-gradient-to-r from-emerald-500 to-emerald-400"
              )}
              style={{ width: `${Math.min(item.cpuUseRt, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      id: 'moryUseRt',
      header: 'Memory Allocation',
      width: 220,
      accessor: (item: ServerResrceLog) => (
        <div className="flex flex-col gap-2 py-2">
          <div className="flex justify-between items-center px-1">
            <div className="flex items-center gap-1">
              <Database size={10} className={cn(item.moryUseRt > 80 ? "text-rose-500" : "text-blue-500")} />
              <span className="text-[10px] font-black italic uppercase text-slate-400">RAM Stack</span>
            </div>
            <span className={cn("text-xs font-black tabular-nums italic", item.moryUseRt > 80 ? "text-rose-600" : "text-slate-900")}>
              {item.moryUseRt}%
            </span>
          </div>
          <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden shadow-inner ring-1 ring-slate-200/50">
            <div
              className={cn(
                "h-full rounded-full transition-all duration-1000 shadow-[0_0_8px_rgba(0,0,0,0.1)]",
                item.moryUseRt > 80 ? "bg-gradient-to-r from-rose-500 to-rose-400" : "bg-gradient-to-r from-blue-500 to-blue-400"
              )}
              style={{ width: `${Math.min(item.moryUseRt, 100)}%` }}
            />
          </div>
        </div>
      )
    },
    {
      id: 'svcSttus',
      header: 'Pulse State',
      width: 150,
      accessor: (item: ServerResrceLog) => (
        <div className="flex items-center gap-3">
          <div className="relative flex h-2 w-2">
            <span className={cn("animate-ping absolute inline-flex h-full w-full rounded-full opacity-75", item.svcSttus === 'RUNNING' || item.svcSttus === 'ON' ? "bg-emerald-400" : "bg-rose-400")}></span>
            <span className={cn("relative inline-flex rounded-full h-2 w-2 shadow-[0_0_8px_rgba(0,0,0,0.2)]", item.svcSttus === 'RUNNING' || item.svcSttus === 'ON' ? "bg-emerald-500" : "bg-rose-500")}></span>
          </div>
          <span className={cn("text-[9px] font-black uppercase tracking-widest italic", item.svcSttus === 'RUNNING' || item.svcSttus === 'ON' ? "text-emerald-600" : "text-rose-600 text-shadow-sm")}>
            {item.svcSttus}
          </span>
        </div>
      )
    },
    {
      id: 'creatDt',
      header: 'Telemetry Timestamp',
      accessor: (item: ServerResrceLog) => (
        <span className="text-[10px] font-mono font-black text-slate-400 italic tabular-nums">{item.creatDt}</span>
      )
    }
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <div className="flex justify-end">
        <Button
          variant="outline"
          onClick={loadLogs}
          className="h-12 px-6 rounded-2xl bg-white border-2 border-slate-100 text-slate-400 hover:text-primary hover:bg-primary/5 transition-all shadow-xl active:scale-95 gap-2"
        >
          <RefreshCw size={16} className={cn(loading && "animate-spin")} />
          <span className="text-[10px] font-black uppercase tracking-widest italic">Sync Telemetry</span>
        </Button>
      </div>
      <div className="bg-white/50 rounded-[3rem] p-4 border border-slate-100 shadow-xl">
        <UltimateDataGrid
          title="COMPUTE RESOURCE PROTOCOL FEED"
          columns={columns as any}
          data={logs as any}
          loading={loading}
          keyField="logId"
          className="rounded-[2.5rem] border-none"
        />
      </div>
    </div>
  );
}
