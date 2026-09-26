'use client';

import { useMemo, useState, use } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { PeriodFilter, EMPTY_PERIOD, periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';
import { requestFullExport } from '@/app/components/patterns/full-result-export';
import { useToast } from '@/app/components/ui/toast';
import {
  exportLoginLogsOperation,
  exportSystemLogsOperation,
  exportUserLogsOperation,
  exportWebLogsOperation,
} from '@/types/generated-operations';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { Terminal, Lock, Globe, UserCheck, RefreshCcw, FileDown } from 'lucide-react';
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

/** 분류별 전체 결과 export — 개별 로그 화면이 쓰는 것과 같은 서버 operation 이다. */
const EXPORT_OPERATIONS = {
  SYS: exportSystemLogsOperation,
  LGN: exportLoginLogsOperation,
  USR: exportUserLogsOperation,
  WEB: exportWebLogsOperation,
} as const satisfies Record<LogCategoryId, unknown>;
/** 기본 SYS는 query에서 생략하고, root dashboard의 비기본 category만 page 변경 때 보존한다. */
const PAGE_PRESERVED_PARAMS = [{
  name: 'cat',
  allowedValues: CATEGORY_IDS.filter((id) => id !== 'SYS'),
}] as const;
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
  const [page, setPage] = usePageParam('page', PAGE_PRESERVED_PARAMS);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
  const [searchKeyword, setSearchKeyword] = useState('');
  // [2026-09-26 DIP C6] 통합 조회에도 개별 로그 화면과 같은 기간 조건을 둔다 — 네 분류 모두 서버가 기간을 받는다.
  const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
  const { toast } = useToast();
  const [selectedLog, setSelectedLog] = useState<{
    category: LogCategoryId;
    row: IntegratedLogRow;
  } | null>(null);

  const { data, isLoading, isFetching, error, refetch } = useQuery<PageResponse<IntegratedLogRow>>({
    queryKey: ['admin-logs-integrated', activeCategory, page, searchKeyword, pageSize, periodToParams(period)],
    queryFn: async () => {
      // 시스템/로그인 로그 서비스는 `searchWrd`, 나머지는 `searchKeyword` 를 읽는다.
      // 둘 다 실어 보내야 카테고리 전환 후에도 검색어가 유실되지 않는다.
      const apiParams = { page: page - 1, size: pageSize, searchWrd: searchKeyword, searchKeyword, ...periodToParams(period) };
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
      activeCategory === 'SYS' && page === 1 && !searchKeyword && !period.from && !period.to && initialSystemLogs.ok
        ? initialSystemLogs.data
        : undefined,
  });

  const handleFullExport = () => {
    requestFullExport({
      operation: EXPORT_OPERATIONS[activeCategory],
      totalCount: data?.total,
      searchKeyword,
      period,
      onTooMany: (message) => toast(message, 'error'),
    });
  };

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
          <span className="text-[length:var(--font-size-body)] tabular-nums text-muted-foreground">{getOccurredAt(item, activeCategory)}</span>
        ),
        className: 'w-48'
      }
    ];

    if (activeCategory === 'LGN') {
      return [
        ...commonCols,
        {
          header: '요청자',
          accessor: (item: IntegratedLogRow) => (
            <span className="text-[length:var(--font-size-body)] font-medium text-foreground">{item.loginId || '-'}</span>
          ),
          className: ''
        },
        {
          header: '접속 IP',
          accessor: (item: IntegratedLogRow) => (
            <span className="font-mono text-[length:var(--font-size-body)] tabular-nums text-muted-foreground">{item.loginIp || '-'}</span>
          ),
          className: ''
        },
        {
          header: '구분',
          accessor: (item: IntegratedLogRow) => (
            <span className="inline-flex w-fit items-center rounded border border-border bg-muted px-1.5 py-0.5 text-xs text-muted-foreground">
              {item.loginMthd || '-'}
            </span>
          ),
          className: ''
        }
      ];
    }

    const activityColumns: Column<IntegratedLogRow>[] = [
      ...commonCols,
      {
        header: '요청자',
        className: 'w-32',
        accessor: (item: IntegratedLogRow) => (
          <span className="text-[length:var(--font-size-body)] font-medium text-foreground">
            {activeCategory === 'USR' ? item.userNm || item.dmndUserId || '-' : item.dmndUserId || '-'}
          </span>
        )
      },
      {
        header: '수행 내역',
        accessor: (item: IntegratedLogRow) => (
          <div className="min-w-0 max-w-md">
            <p className="truncate text-[length:var(--font-size-body)] font-medium leading-tight text-foreground">
              {activeCategory === 'WEB' ? item.url || '-' : item.srvcNm || '-'}
            </p>
            <p className="truncate font-mono text-xs leading-tight text-muted-foreground">
              {activeCategory === 'SYS' ? item.methodNm || '-' : activeCategory === 'USR' ? item.mthdNm || '-' : '-'}
            </p>
          </div>
        ),
        className: ''
      },
      {
        header: '접속 정보',
        accessor: (item: IntegratedLogRow) => (
          <span className="font-mono text-[length:var(--font-size-body)] tabular-nums text-muted-foreground">
            {activeCategory === 'WEB' ? item.dmndUserIpAddr || '-' : activeCategory === 'SYS' ? item.rqesterIp || '-' : '-'}
          </span>
        ),
        className: ''
      }
    ];

    if (activeCategory === 'WEB') {
      activityColumns.splice(3, 0, {
        header: '처리 시간',
        accessor: (item: IntegratedLogRow) => (
          <div className="flex items-center justify-end gap-1 text-[length:var(--font-size-body)] tabular-nums text-muted-foreground">
            <span>{item.prcsTm ?? '-'}</span>
            {item.prcsTm != null ? <span>ms</span> : null}
          </div>
        ),
        className: 'w-24 text-right',
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
      totalCount={error || isLoading ? undefined : totalCount}
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
          {/* [2026-09-26 DIP C6] 전체 결과 xlsx — 개별 로그 화면과 같은 서버 export 를 지금 분류·검색어·기간으로 요청한다. */}
          <Button variant="outline" size="sm" onClick={handleFullExport} className="gap-2">
            <FileDown size={16} aria-hidden="true" /> 전체 결과 엑셀 다운로드
          </Button>
        </>
      }
      filter={
        <KeywordFilter
          label={`${activeLabel} 검색어`}
          placeholder="검색어를 입력하세요"
          value={searchKeyword}
          onSearch={(keyword) => { setSearchKeyword(keyword); setPage(1); }}
          onReset={() => { setSearchKeyword(''); setPeriod(EMPTY_PERIOD); setPage(1); }}
        >
          <PeriodFilter
            label="조회 기간(발생일자)"
            value={period}
            onChange={(next) => { setPeriod(next); setPage(1); }}
          />
        </KeywordFilter>
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
        footer={
          <Button type="button" variant="outline" onClick={() => setSelectedLog(null)}>
            닫기
          </Button>
        }
      >
        <div className="space-y-4 text-left">
          <div className="rounded-md border border-border bg-muted/50 px-3 py-2">
            <p className="text-xs text-muted-foreground">식별자</p>
            <p className="mt-0.5 font-mono text-[length:var(--font-size-body)] text-foreground">
              {selectedLog ? getLogIdentifier(selectedLog.row, selectedLog.category) : '-'}
            </p>
          </div>

          <div className="space-y-2">
            <h4 className="text-[length:var(--font-size-body)] font-semibold text-foreground">원본 데이터</h4>
            <div className="max-h-[360px] overflow-auto rounded-md border border-border bg-muted p-3">
              <pre className="whitespace-pre-wrap font-mono text-xs leading-relaxed text-foreground">{JSON.stringify(selectedLog?.row, null, 2)}</pre>
            </div>
          </div>
        </div>
      </StandardModal>
    </WorkListPage>
  );
}
