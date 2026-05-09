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
  { id: 'SYS', label: '시스템로그', icon: <Terminal size={20} />, description: '서비스 및 메소드 수행 이력', serviceMethod: 'getSystemLogs' },
  { id: 'LGN', label: '로그인로그', icon: <Lock size={20} />, description: '사용자 접속 및 인증 기록', serviceMethod: 'getLoginLogs' },
  { id: 'USR', label: '사용자 활동', icon: <UserCheck size={20} />, description: '데이터 변경 및 권한 추적', serviceMethod: 'getUserLogs' },
  { id: 'WEB', label: '웹 로그', icon: <Globe size={20} />, description: 'HTTP 요청 및 처리 분석', serviceMethod: 'getWebLogs' },
  { id: 'TRS', label: '전송 로그', icon: <Activity size={20} />, description: '외부 연동 및 배치 결과', serviceMethod: 'getTransferLogs' },
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
        header: '발생 시각',
        accessor: (item: any) => (
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-slate-900 flex items-center justify-center text-white/40 shadow-sm">
              <Clock size={14} />
            </div>
            <span className="text-xs font-black text-slate-600 tracking-tight">{item.creatDt || item.occcrrncDe || '-'}</span>
          </div>
        ),
        className: 'w-48 py-4'
      }
    ];

    if (activeCategory === 'LGN') {
      return [
        ...commonCols,
        {
          header: '요청자',
          accessor: (item: any) => (
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl border border-slate-100 flex items-center justify-center bg-white shadow-sm font-black text-xs text-slate-600">
                {item.loginNm?.substring(0, 1)}
              </div>
              <span className="text-xs font-black text-slate-700 tracking-tight">{item.loginNm} ({item.loginId})</span>
            </div>
          ),
          className: 'py-4'
        },
        {
          header: '접속 IP',
          accessor: (item: any) => (
            <div className="font-mono text-[10px] font-black text-slate-500 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 w-fit">{item.loginIp}</div>
          ),
          className: 'py-4'
        },
        {
          header: '구분',
          accessor: (item: any) => (
            <HubStatusBadge status={item.loginMthd} />
          ),
          className: 'py-4'
        }
      ];
    }

    return [
      ...commonCols,
      {
        header: '요청자',
        className: 'w-32 py-4',
        accessor: (item: any) => (
          <span className="text-xs font-black text-slate-700 tracking-tight">{item.rqsterNm || item.rqesterId || 'SYSTEM'}</span>
        )
      },
      {
        header: '수행 내역',
        accessor: (item: any) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-sm font-black text-slate-900 tracking-tighter uppercase">{item.srvcNm || item.processSeCodeNm || 'INTERNAL_PROCESS'}</span>
            <span className="text-[10px] font-bold text-slate-400 truncate tracking-tight">{item.methodNm || item.trgetMenuNm || '-'}</span>
          </div>
        ),
        className: 'py-4'
      },
      {
        header: '접속 정보',
        accessor: (item: any) => (
          <div className="flex items-center gap-2 font-mono text-[10px] font-black text-slate-500 bg-slate-100/50 px-2.5 py-1 rounded-lg border border-slate-200/50 w-fit">
            <Globe size={11} className="opacity-40" />
            {item.rqesterIp || '127.0.0.1'}
          </div>
        ),
        className: 'py-4'
      }
    ];
  }, [activeCategory]);

  return (
    <div className="space-y-10 pb-24 animate-in fade-in duration-1000">
      <PageHeader
        title="로그 통합 리포트"
        breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }]}
      />

      <HubHeader
        title="시스템"
        highlight="로그 관리"
        subtitle="시스템 전반에서 발생하는 보안, 접속, 행동, 웹 요청 로그를 통합 모니터링합니다."
        icon={History}
        actions={
          <div className="flex gap-3">
            <Button variant="outline" size="lg" className="h-10 px-8 rounded-xl border border-slate-200 bg-white font-black text-xs tracking-widest gap-2 shadow-sm hover:bg-slate-900 hover:text-white transition-all">
              <SearchCode size={18} /> 상세 검색
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="오늘 전체 로그" value="1,492" icon={Database} color="primary" />
        <HubMetricCard title="보안 위협" value="3" icon={Lock} color="rose" status="이상 징후" />
        <HubMetricCard title="활성 세션" value="84" icon={Activity} color="emerald" status="안전" />
        <HubMetricCard title="처리 속도" value="38ms" icon={Zap} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-xl p-3 flex flex-col gap-3" id="log-categories">
            {logCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "w-full group p-6 rounded-xl border border-transparent transition-all flex items-center gap-5 relative overflow-hidden",
                  activeCategory === cat.id
                    ? "bg-slate-900 text-white shadow-2xl scale-[1.03] z-10"
                    : "hover:bg-white/50 text-slate-600 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-10 h-9 rounded-xl flex items-center justify-center transition-all shadow-md",
                  activeCategory === cat.id ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:text-primary"
                )}>
                  {cat.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black tracking-tighter uppercase leading-tight">{cat.label}</span>
                  <span className="text-[10px] font-bold text-slate-400 tracking-tight opacity-100 truncate max-w-[120px] uppercase">{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <HubSectionCard
            title="실시간 로그 스트림"
            description={`${logCategories.find(c => c.id === activeCategory)?.label} 활동 데이터입니다.`}
            icon={Activity}
          >
            <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl overflow-hidden ring-1 ring-black/5">
              <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                className="border-none bg-transparent shadow-none"
                onRowClick={(item) => setSelectedLog(item)}
                isPremium={true}
                search={{
                  placeholder: '검색어를 입력하세요...',
                  onSearch: (keyword) => setParams({ ...params, searchKeyword: keyword, page: 1 })
                }}
              />
            </div>

            {(Number(pagination.totalPageCount) || 0) > 1 && (
              <div className="mt-10 flex justify-center">
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
        title="로그 상세 정보"
        maxWidth="2xl"
      >
        <div className="p-8 space-y-8 font-sans text-left">
          <div className="flex items-center justify-between p-6 bg-slate-50/50 rounded-xl border border-slate-100 shadow-inner">
            <div className="flex items-center gap-4">
              <div className="w-12 h-10 rounded-xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
                <Terminal size={22} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1.5">ID</p>
                <p className="text-sm font-black text-slate-900 tracking-tight leading-none uppercase">{selectedLog?.logId || selectedLog?.requstId || 'None'}</p>
              </div>
            </div>
            <HubStatusBadge status="확인됨" />
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest px-1">Raw Payload</h4>
            <div className="p-10 rounded-2xl bg-slate-900 text-emerald-400 font-mono text-[10px] overflow-auto shadow-2xl relative group max-h-[400px]">
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
                className="flex-1 h-11 rounded-xl bg-slate-900 border-none text-white font-black text-xs tracking-widest uppercase hover:bg-primary transition-all active:scale-95 shadow-xl"
            >
              Close
            </button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
