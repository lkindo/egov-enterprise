'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { StandardDataTable } from '@/app/components/ui/standard-data-table';
import { monitoringService, ServerResrceLog } from '@/services/monitoringService';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Activity, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function ServerResource() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [logs, setLogs] = useState<ServerResrceLog[]>([]);

  const loadLogs = useCallback(async () => {
    try {
      setLoading(true);
      const res = await monitoringService.getServerResourceLogs({ page: 0, size: 20 });
      if (res.success) {
        setLogs(res.data.content || []);
      }
    } catch (error) {
      toast('서버 리소스 로그를 불러오지 못했습니다.', 'error');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadLogs();
  }, [loadLogs]);

  const columns = [
    { header: '서버 ID', accessor: 'serverId', className: 'text-xs font-mono text-muted-foreground' },
    { 
      header: 'CPU 사용률', 
      accessor: (item: ServerResrceLog) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", item.cpuUseRt > 80 ? "bg-red-500" : "bg-blue-500")} 
              style={{ width: `${Math.min(item.cpuUseRt, 100)}%` }} 
            />
          </div>
          <span className="text-xs font-bold w-8">{item.cpuUseRt}%</span>
        </div>
      )
    },
    { 
      header: '메모리 사용률', 
      accessor: (item: ServerResrceLog) => (
        <div className="flex items-center gap-2">
          <div className="w-24 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className={cn("h-full rounded-full transition-all", item.moryUseRt > 80 ? "bg-red-500" : "bg-purple-500")} 
              style={{ width: `${Math.min(item.moryUseRt, 100)}%` }} 
            />
          </div>
          <span className="text-xs font-bold w-8">{item.moryUseRt}%</span>
        </div>
      )
    },
    { header: '상태', accessor: 'svcSttus', className: 'text-xs' },
    { header: '측정일시', accessor: 'creatDt', className: 'text-xs text-muted-foreground' },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button variant="outline" size="sm" onClick={loadLogs} className="gap-2">
          <RefreshCw size={14} /> 새로고침
        </Button>
      </div>
      <StandardDataTable 
        columns={columns} 
        data={logs} 
        loading={loading}
        emptyMessage="로그 내역이 없습니다." 
        className="border rounded-xl"
      />
    </div>
  );
}
