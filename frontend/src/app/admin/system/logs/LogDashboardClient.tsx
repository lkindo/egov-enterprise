'use client';

import { useMemo, useState, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { Terminal, Clock, Zap, Lock, Globe, UserCheck, RefreshCcw } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type {
  LoginLog,
  PageResponse,
  SysLog,
  UserLog,
  WebLog,
} from '@/types/foundation/system';
import { usePageParam, useTabParam } from './use-log-url-state';

const logCategories = [
  { id: 'SYS', label: '시스템로그', icon: <Terminal size={20} />, description: '서비스 및 메소드 수행 이력' },
  { id: 'LGN', label: '로그인로그', icon: <Lock size={20} />, description: '사용자 접속 및 인증 기록' },
  { id: 'USR', label: '사용자 활동', icon: <UserCheck size={20} />, description: '데이터 변경 및 권한 추적' },
  { id: 'WEB', label: '웹 로그', icon: <Globe size={20} />, description: 'HTTP 요청 및 처리 분석' },
] as const;

type LogCategoryId = (typeof logCategories)[number]['id'];

type IntegratedLogRow =
  Partial<Pick<SysLog, 'sysLogSn' | 'dmndId' | 'srvcNm' | 'methodNm' | 'dmndUserId' | 'rqesterIp' | 'ocrnYmd'>>
  & Partial<Pick<LoginLog, 'lgnSn' | 'loginId' | 'loginIp' | 'loginMthd' | 'creatDt'>>
  & Partial<Pick<UserLog, 'ocrnYmd' | 'dmndUserId' | 'userNm' | 'srvcNm' | 'mthdNm'>>
  & Partial<Pick<WebLog, 'webLogSn' | 'url' | 'dmndUserId' | 'dmndUserIpAddr' | 'occrYmd'>>
  & { prcsTm?: SysLog['prcsTm'] | WebLog['prcsTm'] };

const CATEGORY_IDS = logCategories.map((c) => c.id);
/** 카테고리 전환 시 페이지 번호를 URL 에서 함께 제거한다(3페이지에서 탭 전환 시 빈 화면 방지) */
const TAB_RESET_PARAMS = ['page'] as const;

/** 페이지당 건수 기본값(A1 필수 — 사용자가 바꿀 수 있다). URL 에는 싣지 않는다. */
const DEFAULT_PAGE_SIZE = 10;

/**
 * 서버 컴포넌트가 넘겨주는 첫 페이지 프리페치 결과.
 * 실패를 빈 목록으로 바꾸면 화면이 "데이터 0건"이라고 거짓말하므로,
 * 성공/실패를 구분해 전달하고 실패 시에는 initialData 를 주지 않아 클라이언트가 다시 조회하고
 * 실제 오류를 표면화하도록 한다.
 */
export type InitialSystemLogs =
  | { ok: true; data: PageResponse<SysLog> }
  | { ok: false; message: string };

function getOccurredAt(row: IntegratedLogRow, category: LogCategoryId): string {
  if (category === 'LGN') return row.creatDt || '-';
  if (category === 'WEB') return row.occrYmd || '-';
  return row.ocrnYmd || '-';
}

function getLogIdentifier(row: IntegratedLogRow, category: LogCategoryId): string {
  if (category === 'LGN') return row.lgnSn != null ? String(row.lgnSn) : '-';
  if (category === 'WEB') return row.webLogSn != null ? String(row.webLogSn) : '-';
  if (category === 'SYS') return row.dmndId || '-';

  const parts = [row.ocrnYmd, row.dmndUserId, row.srvcNm, row.mthdNm];
  return parts.every(Boolean) ? parts.join('/') : '-';
}

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
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchKeyword, setSearchKeyword] = useState('');
  const [selectedLog, setSelectedLog] = useState<{
    category: LogCategoryId;
    row: IntegratedLogRow;
  } | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery<PageResponse<IntegratedLogRow>>({
    queryKey: ['admin-logs-integrated', activeCategory, page, searchKeyword, pageSize],
    queryFn: async () => {
      // 시스템/로그인 로그 서비스는 `searchWrd`, 나머지는 `searchKeyword` 를 읽는다.
      // 둘 다 실어 보내야 카테고리 전환 후에도 검색어가 유실되지 않는다.
      const apiParams = { page: page - 1, size: pageSize, searchWrd: searchKeyword, searchKeyword };
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

  const logs = data?.list ?? [];
  const totalCount = Number(data?.total || 0);
  const totalPages = Number(data?.totalPage || 1);
  const activeLabel = logCategories.find((c) => c.id === activeCategory)?.label ?? '';

  const columns = useMemo(() => {
    const commonCols: Column<IntegratedLogRow>[] = [
      {
        /*
          [2026-08-29] 분류마다 값의 정밀도가 다르다 — 로그인 로그만 creatDt(일시)이고
          시스템·사용자·웹·개인정보 로그는 yyyyMMdd(날짜)다. 하나의 '발생 시각' 으로
          부르면 없는 정밀도를 약속한다.
        */
        header: activeCategory === 'LGN' ? '발생 일시' : '발생일자',
        accessor: (item: IntegratedLogRow) => (
          <div className="flex items-center gap-3 py-2">
            <div className="w-8 h-8 rounded-xl bg-surface-inverse flex items-center justify-center text-surface-inverse-muted shadow-sm">
              <Clock size={14} />
            </div>
            <span className="text-xs font-black text-muted-foreground tracking-tight">{getOccurredAt(item, activeCategory)}</span>
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
          accessor: (item: IntegratedLogRow) => (
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
          accessor: (item: IntegratedLogRow) => (
            <div className="font-mono text-[10px] font-black text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50 w-fit">{item.loginIp || '-'}</div>
          ),
          className: 'py-4'
        },
        {
          header: '구분',
          accessor: (item: IntegratedLogRow) => (
            <span className="px-2 py-0.5 rounded-md text-xs font-bold border uppercase tracking-tighter bg-muted text-muted-foreground border-border">
              {item.loginMthd || '-'}
            </span>
          ),
          className: 'py-4'
        }
      ];
    }

    const activityColumns: Column<IntegratedLogRow>[] = [
      ...commonCols,
      {
        header: '요청자',
        className: 'w-32 py-4',
        accessor: (item: IntegratedLogRow) => (
          <span className="text-xs font-black text-foreground tracking-tight">
            {activeCategory === 'USR' ? item.userNm || item.dmndUserId || '-' : item.dmndUserId || '-'}
          </span>
        )
      },
      {
        header: '수행 내역',
        accessor: (item: IntegratedLogRow) => (
          <div className="flex flex-col gap-0.5 max-w-md">
            <span className="text-sm font-black text-foreground tracking-tighter">
              {activeCategory === 'WEB' ? item.url || '-' : item.srvcNm || '-'}
            </span>
            <span className="text-[10px] font-bold text-muted-foreground truncate tracking-tight">
              {activeCategory === 'SYS' ? item.methodNm || '-' : activeCategory === 'USR' ? item.mthdNm || '-' : '-'}
            </span>
          </div>
        ),
        className: 'py-4'
      },
      {
        header: '접속 정보',
        accessor: (item: IntegratedLogRow) => (
          <div className="flex items-center gap-2 font-mono text-[10px] font-black text-muted-foreground bg-muted/50 px-2.5 py-1 rounded-lg border border-border/50 w-fit">
            <Globe size={11} className="opacity-40" />
            {activeCategory === 'WEB' ? item.dmndUserIpAddr || '-' : activeCategory === 'SYS' ? item.rqesterIp || '-' : '-'}
          </div>
        ),
        className: 'py-4'
      }
    ];

    if (activeCategory === 'WEB') {
      activityColumns.splice(3, 0, {
        header: '처리 시간',
        accessor: (item: IntegratedLogRow) => (
          <div className="flex items-center gap-1 text-xs font-bold text-muted-foreground tabular-nums">
            <span>{item.prcsTm ?? '-'}</span>
            {item.prcsTm != null ? <span>ms</span> : null}
          </div>
        ),
        className: 'w-24 py-4',
      });
    }

    return activityColumns;
  }, [activeCategory]);

  return (
    <WorkListPage
      title="로그 통합 조회"
      description="보안·접속·행동·웹 요청 로그를 한 화면에서 조회합니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '로그관리' }]}
      filterStateKey="system-logs-dashboard"
      totalCount={error ? undefined : totalCount}
      actions={
        <>
          <div
            role="tablist"
            aria-label="로그 카테고리"
            id="log-categories"
            className="flex flex-wrap rounded-md border border-border p-0.5"
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
                  'flex h-[var(--control-h-sm)] items-center gap-2 rounded px-3 text-xs font-bold transition-colors',
                  activeCategory === cat.id ? 'bg-muted text-primary' : 'text-muted-foreground hover:text-foreground',
                )}
              >
                {cat.label}
              </button>
            ))}
          </div>
          {/*
            기존 '상세 검색' 버튼은 onClick 이 없는 死버튼이었다(고급 검색 화면 부재).
            삭제하고, 실제로 동작하는 재조회 버튼만 남긴다.
          */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
            className="gap-2"
          >
            <RefreshCcw size={16} className={cn(isFetching && 'animate-spin')} aria-hidden="true" /> 새로고침
          </Button>
        </>
      }
      filter={
        <KeywordFilter
          label={`${activeLabel} 검색어`}
          placeholder="검색어를 입력하세요"
          value={searchKeyword}
          onSearch={(keyword) => { setSearchKeyword(keyword); setPage(1); }}
        />
      }
    >
      <div role="tabpanel" id="log-tabpanel" aria-labelledby={`log-tab-${activeCategory}`}>
        {/*
          조회 실패를 "데이터 없음"으로 위장하지 않는다 — error/onRetry 를 전달해
          실패는 오류 상태 + 다시 시도 버튼으로 노출한다.
        */}
        <StandardDataTable
          accessibleLabel={`${activeLabel} 목록`}
          columns={columns}
          data={logs}
          loading={isLoading}
          error={error}
          onRetry={() => refetch()}
          onRowClick={(item) => setSelectedLog({ category: activeCategory, row: item })}
          rowActionLabel={(item) => `${activeLabel} ${getLogIdentifier(item, activeCategory)} 상세 열기`}
          emptyMessage={emptyResultMessage(searchKeyword, `조회된 ${activeLabel}가 없습니다.`)}
          pagination={{
            currentPage: page,
            totalPages: Math.max(totalPages, 1),
            onPageChange: setPage,
            pageSize,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
          }}
        />
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
                  {selectedLog ? getLogIdentifier(selectedLog.row, selectedLog.category) : '-'}
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
              <pre className="whitespace-pre-wrap leading-relaxed">{JSON.stringify(selectedLog?.row, null, 2)}</pre>
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
    </WorkListPage>
  );
}
