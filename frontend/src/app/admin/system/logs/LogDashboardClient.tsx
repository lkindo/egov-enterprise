'use client';

import React, { useState, useMemo, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { HubMetricGrid, HubMetricCard } from '@/components/ui/hub/HubMetrics';
import { HubStatusBadge } from '@/components/ui/hub/HubStatusBadge';
import { PagePagination } from '@/components/common/PagePagination';
import { StandardModal } from '@/app/components/ui/standard-modal';
import {
  Terminal,
  Activity,
  History,
  SearchCode,
  Database,
  Clock,
  Zap,
  Lock,
  Globe,
  UserCheck
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageResponse } from '@/types/foundation/system';

const logCategories = [
  { id: 'SYS', label: '?�스?�로�?, icon: <Terminal size={20} />, description: '?�비??�?메소???�행 ?�력', serviceMethod: 'getSystemLogs' },
  { id: 'LGN', label: '로그?�로�?, icon: <Lock size={20} />, description: '?�용???�속 �??�증 기록', serviceMethod: 'getLoginLogs' },
  { id: 'USR', label: '?�용???�동', icon: <UserCheck size={20} />, description: '?�이??변�?�?권한 추적', serviceMethod: 'getUserLogs' },
  { id: 'WEB', label: '??로그', icon: <Globe size={20} />, description: 'HTTP ?�청 �?처리 분석', serviceMethod: 'getWebLogs' },
  { id: 'TRS', label: '?�송 로그', icon: <Activity size={20} />, description: '?��? ?�동 �?배치 결과', serviceMethod: 'getTransferLogs' },
];

export default function LogDashboardClient({ systemLogsPromise }: { systemLogsPromise: Promise<any> }) {
  const initialSystemLogs = use(systemLogsPromise);
  const [activeCategory, setCategory] = useState('SYS');
  const [params, setParams] = useState({ page: 1, searchKeyword: '' });
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery<PageResponse<any>>({
    queryKey: ['admin-logs-integrated', activeCategory, params],
    queryFn: async () => {
      const apiParams = { page: (params.page || 1) - 1, size: 10, searchKeyword: params.searchKeyword };
      switch (activeCategory) {
        case 'SYS': return systemLogAdminService.getSystemLogs(apiParams);
        case 'LGN': return systemLogAdminService.getLoginLogs(apiParams);
        case 'USR': return systemLogAdminService.getUserLogs(apiParams);
        case 'WEB': return systemLogAdminService.getWebLogs(apiParams);
        case 'TRS': return systemLogAdminService.getTransferLogs(apiParams);
        default: return systemLogAdminService.getSystemLogs(apiParams);
      }
    },
    initialData: (activeCategory === 'SYS' && params.page === 1 && !params.searchKeyword) ? initialSystemLogs : undefined
  });

  const logs = (data?.list || []) as any[];
  const pagination = {
    currentPageNo: Number(params.page),
    recordCountPerPage: 10,
    totalRecordCount: Number(data?.total || 0),
    totalPageCount: Number(data?.totalPage || 1)
  };

  const columns = useMemo(() => {
    const commonCols: Column<any>[] = [
      {
        header: '발생 ?�각',
        accessor: (item: any) => (
          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-sm">
              <Clock size={14} />
            </div>
            <span className="text-xs font-mono font-bold text-slate-600 tracking-tight">_ {item.creatDt || item.occcrrncDe || '-'}</span>
          </div>
        ),
        className: 'w-48'
      }
    ];

    if (activeCategory === 'LGN') {
      return [
        ...commonCols,
        {
          header: '?�청??,
          accessor: (item: any) => (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center bg-white shadow-sm font-bold text-xs text-slate-600">
                {item.loginNm?.substring(0, 1)}
              </div>
              <span className="text-xs font-bold text-slate-700">{item.loginNm} ({item.loginId})</span>
            </div>
          )
        },
        {
          header: '?�속 IP',
          accessor: (item: any) => (
            <div className="font-mono text-xs font-bold text-slate-600 bg-slate-50 px-3 py-1 rounded-lg border w-fit">{item.loginIp}</div>
          )
        },
        {
          header: '구분',
          accessor: (item: any) => (
            <HubStatusBadge label={item.loginMthd} variant={item.loginMthd === 'LOGIN' ? 'success' : 'secondary'} />
          )
        }
      ];
    }

    return [
      ...commonCols,
      {
        header: '?�청??,
        className: 'w-32',
        accessor: (item: any) => (
          <span className="text-xs font-bold text-slate-700">{item.rqsterNm || item.rqesterId || 'SYSTEM'}</span>
        )
      },
      {
        header: '?�행 ?�비??/ 리소??,
        accessor: (item: any) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-xs font-bold text-foreground truncate uppercase tracking-tight">_ {item.srvcNm || item.processSeCodeNm || 'INTERNAL_PROCESS'}</span>
            <span className="text-xs font-bold text-slate-300 font-mono truncate">{item.methodNm || item.trgetMenuNm || '-'}</span>
          </div>
        )
      },
      {
        header: '?�속 ?�보',
        accessor: (item: any) => (
          <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-600">
            <Globe size={11} className="opacity-40" />
            {item.rqesterIp || '127.0.0.1'}
          </div>
        )
      }
    ];
  }, [activeCategory]);

  return (
    <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="로그 ?�합 리포??
        breadcrumbs={[{ label: '?�스?��?�? }, { label: '로그관�? }]}
      />

      <HubHeader
        title="?�스??
        highlight="로그 ?�합 관�?
        subtitle="?�스???�반?�서 발생?�는 보안, ?�속, ?�동, ???�청 로그�??�합?�으�?모니?�링?�니??
        icon={History}
        actions={
          <div className="flex gap-4">
            <Button variant="outline" size="lg" className="h-11 px-8 rounded-lg border-2 font-bold text-xs tracking-widest gap-3">
              <SearchCode size={18} /> ?�세 로그 검??            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="?�늘 ?�체 로그" value="1,492" icon={Database} color="primary" />
        <HubMetricCard title="보안 ?�협 로그" value="3" icon={Lock} color="rose" status="?�상 징후" />
        <HubMetricCard title="?�성 ?�션" value="84" icon={Activity} color="emerald" status="?�전" />
        <HubMetricCard title="?�균 처리 ?�도" value="38ms" icon={Zap} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-lg bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-3" id="log-categories">
            {logCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "w-full group p-6 rounded-lg border-2 transition-all flex items-center gap-5 relative overflow-hidden",
                  activeCategory === cat.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
                    : "bg-transparent border-transparent hover:bg-slate-100 text-slate-600 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-lg flex items-center justify-center transition-all shadow-lg",
                  activeCategory === cat.id ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
                )}>
                  {cat.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-bold tracking-tight uppercase leading-tight">{cat.label}</span>
                  <span className="text-[7px] font-bold text-slate-600 tracking-widest uppercase opacity-100 truncate max-w-[120px]">{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <HubSectionCard
            title="?�시�?로그 ?�트�?
            description={`${logCategories.find(c => c.id === activeCategory)?.label}?�서 ?�시간으�??�입?�는 ?�동 ?�트�??�이?�입?�다.`}
            icon={Activity}
          >
            <StandardDataTable
              columns={columns}
              data={logs}
              loading={isLoading}
              className="border-none bg-transparent"
              onRowClick={(item) => setSelectedLog(item)}
              search={{
                placeholder: '?�청??IP, 메시지 ?�으�??��? 분석...',
                onSearch: (keyword) => setParams({ ...params, searchKeyword: keyword, page: 1 })
              }}
            />

            {(Number(pagination.totalPageCount) || 0) > 1 && (
              <div className="mt-12 flex justify-center">
                <PagePagination
                  pagination={pagination}
                  onPageChange={(page) => setParams({ ...params, page: page })}
                />
              </div>
            )}
          </HubSectionCard>
        </div>
      </div>

      {/* Log Inspector Modal */}
      <StandardModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="Log Inspector (Raw Intel)"
        maxWidth="2xl"
      >
        <div className="p-8 space-y-8 font-sans text-left">
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-lg border-2 border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-lg bg-slate-900 flex items-center justify-center text-white shadow-xl">
                <Terminal size={22} />
              </div>
              <div className="text-left">
                <p className="text-xs font-bold text-slate-600 uppercase tracking-widest leading-none mb-1">로그 리소???�별??/p>
                <p className="text-sm font-bold text-slate-900 tracking-tight leading-none">{selectedLog?.logId || selectedLog?.requstId || '?�별???�음'}</p>
              </div>
            </div>
            <HubStatusBadge label="?�인?? variant="success" />
          </div>

          <div className="space-y-4">
            <h4 className="text-xs font-bold text-slate-600 uppercase tracking-[0.3em] px-2">_ Raw Architecture Payload</h4>
            <div className="p-10 rounded-lg bg-slate-900 text-emerald-400 font-mono text-xs overflow-auto shadow-2xl relative group max-h-[400px]">
              <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
                <Zap size={20} className="animate-pulse" />
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selectedLog, null, 2)}</pre>
            </div>
          </div>

          <div className="flex gap-4">
            <button 
                type="button"
                onClick={() => setSelectedLog(null)} 
                className="flex-1 h-11 rounded-lg bg-slate-900 border-none text-white font-bold text-xs tracking-widest uppercase hover:bg-primary transition-all active:scale-95 shadow-xl"
            >
              CLOSE_INSPECTOR
            </button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
