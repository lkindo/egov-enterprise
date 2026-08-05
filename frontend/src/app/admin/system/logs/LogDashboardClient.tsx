'use client';

import React, { useMemo, useState, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { PageHeader } from '@/app/components/layout/page-header';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { HubSectionCard } from '@/components/ui/hub/HubSectionCard';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { Terminal, Activity, History, Clock, Zap, Lock, Globe, UserCheck, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { PageResponse } from '@/types/foundation/system';
import { usePageParam, useTabParam } from './use-log-url-state';

const logCategories = [
  { id: 'SYS', label: '시스템로그', icon: <Terminal size={20} />, description: '서비스 및 메소드 수행 이력' },
  { id: 'LGN', label: '로그인로그', icon: <Lock size={20} />, description: '사용자 접속 및 인증 기록' },
  { id: 'USR', label: '사용자 활동', icon: <UserCheck size={20} />, description: '데이터 변경 및 권한 추적' },
  { id: 'WEB', label: '웹 로그', icon: <Globe size={20} />, description: 'HTTP 요청 및 처리 분석' },
] as const;

type LogCategoryId = (typeof logCategories)[number]['id'];

const CATEGORY_IDS = logCategories.map((c) => c.id);
/** 카테고리 전환 시 페이지 번호를 URL 에서 함께 제거한다(3페이지에서 탭 전환 시 빈 화면 방지) */
const TAB_RESET_PARAMS = ['page'] as const;

const PAGE_SIZE = 10;

/**
 * 서버 컴포넌트가 넘겨주는 첫 페이지 프리페치 결과.
 * 실패를 빈 목록으로 바꾸면 화면이 "데이터 0건"이라고 거짓말하므로,
 * 성공/실패를 구분해 전달하고 실패 시에는 initialData 를 주지 않아 클라이언트가 다시 조회하고
 * 실제 오류를 표면화하도록 한다.
 */
export type InitialSystemLogs =
  | { ok: true; data: PageResponse<any> }
  | { ok: false; message: string };

export default function LogDashboardClient({
  systemLogsPromise,
}: {
  systemLogsPromise: Promise<InitialSystemLogs>;
}) {
  const initialSystemLogs = use(systemLogsPromise);
  const [activeCategory, setActiveCategory] = useTabParam<LogCategoryId>(CATEGORY_IDS, 'SYS', {
    paramName: 'cat',
    resetParams: TAB_RESET_PARAMS,
  });
  const [page, setPage] = usePageParam();
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLog, setSelectedLog] = useState<any | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery<PageResponse<any>>({
    queryKey: ['admin-logs-integrated', activeCategory, page, searchKeyword],
    queryFn: async () => {
      // 시스템/로그인 로그 서비스는 `searchWrd`, 나머지는 `searchKeyword` 를 읽는다.
      // 둘 다 실어 보내야 카테고리 전환 후에도 검색어가 유실되지 않는다.
      const apiParams = { page: page - 1, size: PAGE_SIZE, searchWrd: searchKeyword, searchKeyword };
      switch (activeCategory) {
        case 'LGN':
          return systemLogAdminService.getLoginLogs(apiParams);
        case 'USR':
          return systemLogAdminService.getUserLogs(apiParams);
        case 'WEB':
          return systemLogAdminService.getWebLogs(apiParams);
        case 'SYS':
        default:
          return systemLogAdminService.getSystemLogs(apiParams);
      }
    },
    initialData:
      activeCategory === 'SYS' && page === 1 && !searchKeyword && initialSystemLogs.ok
        ? initialSystemLogs.data
        : undefined,
  });

  const logs = (data?.list || []) as any[];
  const totalCount = Number(data?.total || 0);
  const totalPages = Number(data?.totalPage || 1);
  const activeLabel = logCategories.find((c) => c.id === activeCategory)?.label ?? '';

  const columns = useMemo(() => {
    const commonCols: Column<any>[] = [
      {
        header: '발생 시각',
        accessor: (item: any) => (
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-muted shadow-sm">
              <Clock size={14} />
            </div>
            {/* SysLogDto 의 발생일자는 `ocrnYmd` 다(과거 `occcrrncDe` 는 계약에 존재하지 않아 SYS 탭이 전건 '-' 였다). */}
            <span className="text-xs font-black text-muted-foreground tracking-tight">{item.creatDt || item.ocrnYmd || '-'}</span>
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
              <div className="w-9 h-9 rounded-xl border border-border flex items-center justify-center bg-card shadow-sm font-black text-xs text-muted-foreground">
                {String(item.loginId ?? '').substring(0, 1)}
              </div>
              <span className="text-xs font-black text-foreground tracking-tight">{item.loginId || '-'}</span>
            </div>
          ),
          className: 'py-4'
        },
        {
          header: '접속 IP',
          accessor: (item: any) => (
            <div className="font-mono text-[10px] font-black text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50 w-fit">{item.loginIp || '-'}</div>
          ),
          className: 'py-4'
        },
        {
          header: '구분',
          accessor: (item: any) => (
            <span className="px-2 py-0.5 rounded-md text-xs font-bold border uppercase tracking-tighter bg-muted text-muted-foreground border-border">
              {item.loginMthd || '-'}
            </span>
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
          <span className="text-xs font-black text-foreground tracking-tight">{item.rqesterId || item.dmndUserId || '-'}</span>
        )
      },
      {
        header: '수행 내역',
        accessor: (item: any) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-sm font-black text-foreground tracking-tighter">{item.srvcNm || item.svcNm || item.url || '-'}</span>
            <span className="text-[10px] font-bold text-muted-foreground truncate tracking-tight">{item.methodNm || item.method || '-'}</span>
          </div>
        ),
        className: 'py-4'
      },
      {
        header: '접속 정보',
        accessor: (item: any) => (
          <div className="flex items-center gap-2 font-mono text-[10px] font-black text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50 w-fit">
            <Globe size={11} className="opacity-40" />
            {item.rqesterIp || '-'}
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
            {/*
              기존 '상세 검색' 버튼은 onClick 이 없는 死버튼이었다(고급 검색 화면 부재).
              삭제하고, 실제로 동작하는 재조회 버튼만 남긴다.
            */}
            <Button
              variant="outline"
              size="lg"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-10 px-8 rounded-xl border border-border bg-card font-black text-xs tracking-widest gap-2 shadow-sm hover:bg-surface-inverse hover:text-surface-inverse-foreground transition-all"
            >
              <RefreshCcw size={18} className={cn(isFetching && 'animate-spin')} /> 새로고침
            </Button>
          </div>
        }
      />

      <div className="grid grid-cols-12 gap-8">
        <div className="col-span-12 lg:col-span-3">
          <div
            role="tablist"
            aria-label="로그 카테고리"
            aria-orientation="vertical"
            className="rounded-2xl bg-white/40 backdrop-blur-md border border-white/60 shadow-xl p-3 flex flex-col gap-3"
            id="log-categories"
          >
            {logCategories.map((cat) => (
              <button
                key={cat.id}
                type="button"
                role="tab"
                id={`log-tab-${cat.id}`}
                aria-selected={activeCategory === cat.id}
                aria-controls="log-tabpanel"
                onClick={() => setActiveCategory(cat.id)}
                className={cn(
                  "w-full group p-6 rounded-xl border border-transparent transition-all flex items-center gap-5 relative overflow-hidden",
                  activeCategory === cat.id
                    ? "bg-surface-inverse text-surface-inverse-foreground shadow-2xl scale-[1.03] z-10"
                    : "hover:bg-white/50 text-muted-foreground hover:text-foreground"
                )}
              >
                <div className={cn(
                  "w-10 h-9 rounded-xl flex items-center justify-center transition-all shadow-md",
                  activeCategory === cat.id ? "bg-white/10 text-surface-inverse-foreground" : "bg-card text-muted-foreground group-hover:text-primary"
                )}>
                  {cat.icon}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-sm font-black tracking-tighter leading-tight">{cat.label}</span>
                  <span className="text-[10px] font-bold text-muted-foreground tracking-tight opacity-100 truncate max-w-[120px]">{cat.description}</span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-9" role="tabpanel" id="log-tabpanel" aria-labelledby={`log-tab-${activeCategory}`}>
          <HubSectionCard
            title="실시간 로그 스트림"
            description={`${activeLabel} 활동 데이터입니다.`}
            icon={Activity}
          >
            <div className="bg-white/40 backdrop-blur-md rounded-2xl border border-white/60 shadow-xl overflow-hidden ring-1 ring-black/5">
              {/*
                조회 실패를 "데이터 없음"으로 위장하지 않는다 — error/onRetry 를 전달해
                실패는 오류 상태 + 다시 시도 버튼으로 노출한다.
              */}
              <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                className="border-none bg-transparent shadow-none"
                onRowClick={(item) => setSelectedLog(item)}
                isPremium={true}
                pagination={{
                  currentPage: page,
                  totalPages: Math.max(totalPages, 1),
                  onPageChange: setPage,
                  totalCount,
                  pageSize: PAGE_SIZE,
                }}
                search={{
                  placeholder: '검색어를 입력하세요...',
                  value: searchKeyword,
                  onSearch: (keyword) => {
                    setSearchKeyword(keyword);
                    setPage(1);
                  },
                  onClear: () => {
                    setSearchKeyword('');
                    setPage(1);
                  },
                }}
              />
            </div>
          </HubSectionCard>
        </div>
      </div>

      {/* 로그 상세 인스펙터 */}
      <StandardModal
        isOpen={!!selectedLog}
        onClose={() => setSelectedLog(null)}
        title="로그 상세 정보"
        maxWidth="2xl"
      >
        <div className="p-8 space-y-8 font-sans text-left">
          <div className="flex items-center justify-between p-6 bg-muted/50 rounded-xl border border-border shadow-inner">
            <div className="flex items-center gap-4">
              <div className="w-12 h-10 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-foreground shadow-xl">
                <Terminal size={22} />
              </div>
              <div className="text-left">
                <p className="text-[10px] font-black text-muted-foreground tracking-widest leading-none mb-1.5">식별자</p>
                <p className="text-sm font-black text-foreground tracking-tight leading-none">
                  {selectedLog?.logId || selectedLog?.dmndId || selectedLog?.webLogId || selectedLog?.userLogId || '-'}
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <h4 className="text-[10px] font-black text-muted-foreground tracking-widest px-1">원본 데이터</h4>
            <div className="p-10 rounded-2xl bg-surface-inverse text-emerald-400 font-mono text-[10px] overflow-auto shadow-2xl relative group max-h-[400px]">
              <div className="absolute top-6 right-6 opacity-20 group-hover:opacity-100 transition-opacity">
                <Zap size={20} className="animate-pulse" aria-hidden="true" />
              </div>
              <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selectedLog, null, 2)}</pre>
            </div>
          </div>

          <div className="flex gap-4">
            <button
                type="button"
                onClick={() => setSelectedLog(null)}
                className="flex-1 h-11 rounded-xl bg-surface-inverse border-none text-surface-inverse-foreground font-black text-xs tracking-widest hover:bg-primary transition-all active:scale-95 shadow-xl"
            >
              닫기
            </button>
          </div>
        </div>
      </StandardModal>
    </div>
  );
}
