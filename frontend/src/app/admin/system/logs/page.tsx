'use client';

import React, { useState, useMemo } from 'react';
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
  ShieldCheck,
  SearchCode,
  ArrowRight,
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

// Log categories configuration
const logCategories = [
  { id: 'SYS', label: '시스템 로그', icon: <Terminal size={20} />, description: '서비스 및 메소드 실행 이력', serviceMethod: 'getSystemLogs' },
  { id: 'LGN', label: '로그인 로그', icon: <Lock size={20} />, description: '사용자 접속 및 인증 기록', serviceMethod: 'getLoginLogs' },
  { id: 'USR', label: '사용자 활동', icon: <UserCheck size={20} />, description: '데이터 변경 및 권한 추적', serviceMethod: 'getUserLogs' },
  { id: 'WEB', label: '웹 로그', icon: <Globe size={20} />, description: 'HTTP 요청 및 데이터 분석', serviceMethod: 'getWebLogs' },
  { id: 'TRS', label: '송수신 로그', icon: <Activity size={20} />, description: '외부 연동 및 배치 결과', serviceMethod: 'getTransferLogs' },
];

export default function LogDashboardPage() {
  const [activeCategory, setCategory] = useState('SYS');
  const [params, setParams] = useState({ page번호: 1, searchKeyword: '' });
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading } = useQuery<PageResponse<any>>({
    queryKey: ['admin-logs-integrated', activeCategory, params],
    queryFn: async () => {
      const apiParams = { page번호: params.page번호, size: 10, searchKeyword: params.searchKeyword };
      switch (activeCategory) {
        case 'SYS': return systemLogAdminService.getSystemLogs(apiParams);
        case 'LGN': return systemLogAdminService.getLoginLogs(apiParams);
        case 'USR': return systemLogAdminService.getUserLogs(apiParams);
        case 'WEB': return systemLogAdminService.getWebLogs(apiParams);
        case 'TRS': return systemLogAdminService.getTransferLogs(apiParams);
        default: return systemLogAdminService.getSystemLogs(apiParams);
      }
    }
  });

  const logs = data?.resultList || data?.list || [];
  const pagination = data?.paginationInfo || {
    currentPageNo: Number(params.page번호),
    recordCountPerPage: 10,
    totalRecordCount: Number(data?.totalCount || data?.total || 0),
    totalPageCount: Number(data?.totalPage || data?.totalPageCount || 1)
  };

  const columns = useMemo(() => {
    const commonCols: Column<any>[] = [
      {
        header: '발생 시각',
        accessor: (item: any) => (
          <div className="flex items-center gap-3 py-3">
            <div className="w-8 h-8 rounded-lg bg-slate-900 flex items-center justify-center text-white/40 shadow-sm">
              <Clock size={14} />
            </div>
            <span className="text-[11px] font-mono font-black text-slate-500 tracking-tighter italic">
              {item.creatDt || item.occcrrncDe || '-'}
            </span>
          </div>
        ),
        className: 'w-48'
      }
    ];

    if (activeCategory === 'LGN') {
      return [
        ...commonCols,
        {
          header: '요청자',
          accessor: (item: any) => (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full border-2 border-slate-100 flex items-center justify-center bg-white shadow-sm font-black text-[10px] text-slate-400">
                {item.loginNm?.substring(0, 1)}
              </div>
              <span className="text-xs font-bold text-slate-700">{item.loginNm} ({item.loginId})</span>
            </div>
          )
        },
        {
          header: '접속 IP',
          accessor: (item: any) => (
            <div className="font-mono text-[10px] font-black text-slate-400 bg-slate-50 px-3 py-1 rounded-lg border w-fit">{item.loginIp}</div>
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
        header: '요청자',
        className: 'w-32',
        accessor: (item: any) => (
          <span className="text-xs font-bold text-slate-700">{item.rqsterNm || item.rqesterId || 'SYSTEM'}</span>
        )
      },
      {
        header: '수행 서비스 / 리소스',
        accessor: (item: any) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-[11px] font-black text-foreground truncate uppercase tracking-tighter italic">{item.srvcNm || item.processSeCodeNm || 'INTERNAL_PROCESS'}</span>
            <span className="text-[9px] font-bold text-slate-300 font-mono truncate">{item.methodNm || item.trgetMenuNm || '-'}</span>
          </div>
        )
      },
      {
        header: '접속 정보',
        accessor: (item: any) => (
          <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-slate-400">
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
        title="로그 통합 대시보드"
        breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }]}
      />

      <HubHeader
        title="시스템"
        highlight="로그 통합 관리"
        subtitle="시스템 전반에서 발생하는 보안, 접속, 활동, 웹 요청 로그를 통합적으로 모니터링합니다."
        icon={History}
        actions={
          <div className="flex gap-4">
            <Button variant="outline" size="lg" className="h-14 px-8 rounded-2xl border-2 font-black text-[10px] tracking-widest gap-3">
              <SearchCode size={18} /> 상세 로그 검색
            </Button>
          </div>
        }
      />

      <HubMetricGrid>
        <HubMetricCard title="오늘 전체 로그" value="1,492" icon={Database} color="primary" />
        <HubMetricCard title="보안 위협 로그" value="3" icon={Lock} color="rose" status="이상 징후" />
        <HubMetricCard title="활성 세션" value="84" icon={Activity} color="emerald" status="안전" />
        <HubMetricCard title="평균 지연 속도" value="38ms" icon={Zap} color="amber" />
      </HubMetricGrid>

      <div className="grid grid-cols-12 gap-12">
        <div className="col-span-12 lg:col-span-3">
          <div className="rounded-[3.5rem] bg-white border-2 border-slate-100 shadow-xl p-4 flex flex-col gap-3" id="log-categories">
            {logCategories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategory(cat.id)}
                className={cn(
                  "w-full group p-6 rounded-[2.5rem] border-2 transition-all flex items-center gap-5 relative overflow-hidden",
                  activeCategory === cat.id
                    ? "bg-slate-900 border-slate-900 text-white shadow-2xl scale-[1.02] z-10"
                    : "bg-transparent border-transparent hover:bg-slate-100 text-slate-400 hover:text-slate-900"
                )}
              >
                <div className={cn(
                  "w-10 h-10 rounded-2xl flex items-center justify-center transition-all shadow-lg",
                  activeCategory === cat.id ? "bg-white/10 text-white" : "bg-white text-slate-300 group-hover:bg-primary group-hover:text-white"
                )}>
                  {cat.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-[11px] font-black tracking-tighter uppercase leading-tight">{cat.label}</span>
                  <span className="text-[7px] font-bold text-slate-400 tracking-widest uppercase opacity-60 truncate max-w-[120px]">{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9">
          <HubSectionCard
            title="실시간 로그 스트림"
            description={`${logCategories.find(c => c.id === activeCategory)?.label}에서 실시간으로 유입되는 가시성 스트림 데이터입니다.`}
            icon={Activity}
          >
            <StandardDataTable
              columns={columns}
              data={logs}
              loading={isLoading}
              className="border-none bg-transparent"
              onRowClick={(item) => setSelectedLog(item)}
              search={{
                placeholder: '요청자, IP, 메시지 등으로 정밀 분석...',
                onSearch: (keyword) => setParams({ ...params, searchKeyword: keyword, page번호: 1 })
              }}
            />

            {(Number(pagination.totalPageCount) || 0) > 1 && (
              <div className="mt-12 flex justify-center">
                <PagePagination
                  pagination={pagination}
                  onPageChange={(page) => setParams({ ...params, page번호: page })}
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
        <div className="p-8 space-y-8 font-sans">
          <div className="flex items-center justify-between p-6 bg-slate-50 rounded-3xl border-2 border-slate-100">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-slate-900 flex items-center justify-center text-white shadow-xl">
                <Terminal size={22} />
              </div>
              <div>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest leading-none mb-1">로그 리소스 식별자</p>
                <p className="text-sm font-black text-slate-900 tracking-tight leading-none">{selectedLog?.logId || selectedLog?.requstId || '알 수 없음'}</p>
              </div>
            </div>
            <HubStatusBadge label="확인됨" variant="success" />
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] px-2 italic">Raw Architecture Payload</h4>
            <div className="p-10 rounded-[2.5rem] bg-slate-900 text-emerald-400 font-mono text-[11px] overflow-auto shadow-2xl relative group max-h-[400px]">
              <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
                <Zap size={20} className="animate-pulse" />
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selectedLog, null, 2)}</pre>
            </div>
          </div>

          <div className="flex gap-4">
            <Button onClick={() => setSelectedLog(null)} className="flex-1 h-14 rounded-2xl bg-slate-900 border-none text-white font-black text-[10px] tracking-widest uppercase hover:bg-primary transition-all">
              CLOSE_INSPECTOR
            </Button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
