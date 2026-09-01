'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import type { LoginLog, PageResponse } from '@/types/foundation/system';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PeriodFilter, EMPTY_PERIOD, periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { useToast } from '@/app/components/ui/toast';
import { requestFullExport } from '@/app/components/patterns/full-result-export';
import { exportLoginLogsOperation } from '@/types/generated-operations';
import { Terminal, Calendar, Globe, FileDown } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];


const EXPORT_HEADERS = [
    { label: '로그인 일련번호', key: 'lgnSn' },
    { label: '발생시점', key: 'creatDt' },
    { label: '사용자ID', key: 'loginId' },
    { label: '접속IP', key: 'loginIp' },
    { label: '구분', key: 'loginMthd' },
    { label: '오류여부', key: 'errOccrrAt' },
    { label: '오류코드', key: 'errorCode' },
];

const SystemLogsLoginClient = () => {
    const [page, setPage] = usePageParam();
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
    const { error: toastError } = useToast();

    const { data, isLoading, error, refetch } = useQuery<PageResponse<LoginLog>>({
        queryKey: ['admin-logs-login', page, pageSize, searchKeyword, periodToParams(period)],
        queryFn: () => systemLogAdminService.getLoginLogs({
            page: page - 1,
            size: pageSize,
            searchWrd: searchKeyword,
            ...periodToParams(period),
        }),
    });

    const logs = data?.list ?? [];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    /**
     * 전체 결과 xlsx 다운로드 — 현재 검색 조건을 그대로 실어 보낸다.
     * 서버는 페이지 파라미터를 무시하고 조건 일치 전량을 스트리밍하므로
     * page/size 는 부치지 않는다(검색어만 서버 계약 키 searchKeyword 로 전달).
     */
    /*
     * [2026-08-26] 종전에는 이 화면만 export URL 을 손으로 조립했고 **기간을 빼먹고 있었다** —
     * 조회 기간을 배선한 뒤에는 화면에서 좁힌 조건과 파일 내용이 어긋난다는 뜻이다.
     * 다섯 로그가 같은 계약을 쓰므로 공용 조립기로 수렴시킨다.
     */
    const handleFullExport = () => {
        requestFullExport({
            operation: exportLoginLogsOperation,
            totalCount,
            searchKeyword,
            period,
            onTooMany: (message) => toastError(message),
        });
    };

    const columns: Column<LoginLog>[] = [
        {
            header: '로그인 일련번호',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/50 tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    {item.lgnSn}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '발생시점',
            // 현재 페이지 범위 클라이언트 정렬(opt-in) — 원시 ISO 문자열이 정렬 키다.
            sortKey: 'creatDt',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.creatDt ? item.creatDt.substring(0, 19).replace('T', ' ') : '-'}
                </div>
            ),
            className: 'w-52'
        },
        {
            header: '사용자ID',
            sortKey: 'loginId',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-card border rounded-lg w-fit shadow-sm">
                    <span className="text-xs font-bold text-foreground">{item.loginId || '-'}</span>
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '접속IP',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.loginIp || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '구분',
            sortKey: 'loginMthd',
            accessor: (item: LoginLog) => (
                <div className="flex items-center justify-center">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border tracking-tighter ${
                        item.loginMthd === 'LOGIN' ? 'bg-hub-indigo/10 text-hub-indigo border-hub-indigo/20' : 'bg-muted text-muted-foreground border-border'
                    }`}>
                        {item.loginMthd || '-'}
                    </span>
                </div>
            ),
            className: 'w-24'
        },
        {
            // 계약에 존재하는 실제 값(errOccrrAt/errorCode)만 표기한다.
            header: '오류',
            accessor: (item: LoginLog) => (
                <div className="flex items-center justify-center">
                    {item.errOccrrAt === 'Y' ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                            {item.errorCode || '오류'}
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-muted-foreground/50">-</span>
                    )}
                </div>
            ),
            className: 'w-28'
        }
    ];

    return (
        <WorkListPage
            title="로그인 로그"
            description="시스템 접속·로그인/로그아웃 이력을 접속일시 최신순으로 조회합니다."
            breadcrumbItems={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '로그인 로그' }]}
            filterStateKey="system-logs-login"
            // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
            totalCount={error ? undefined : totalCount}
            filter={
                <KeywordFilter
                    label="사용자ID · 접속IP"
                    placeholder="사용자ID, 접속IP 검색"
                    value={searchKeyword}
                    onSearch={(keyword: string) => { setSearchKeyword(keyword); setPage(1); }}
                >
                    <PeriodFilter
                        label="조회 기간(접속일시)"
                        value={period}
                        onChange={(next) => { setPeriod(next); setPage(1); }}
                    />
                </KeywordFilter>
            }
            toolbarActions={
                <>
                    {/* 현재 페이지 CSV(기존 자산) — 전체 결과 xlsx 와 라벨로 범위를 구분한다. */}
                    <DataExportExcel
            scope="page"
                        data={logs}
                        headers={EXPORT_HEADERS}
                        filename="로그인로그"
                        className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-primary"
                    />
                    {/* 전체 결과 xlsx — 로그 5종 공통 서버 스트리밍 export(DEC-OPS-016). */}
                    <button
                        type="button"
                        onClick={handleFullExport}
                        className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-primary/40 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                        <FileDown size={16} aria-hidden="true" />
                        전체 결과 엑셀 다운로드
                    </button>
                </>
            }
        >
            <StandardDataTable
                accessibleLabel="로그인 로그 목록"
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                emptyMessage={emptyResultMessage(searchKeyword, '조회된 로그인 로그가 없습니다.')}
                keyField="lgnSn"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
                    pageSize,
                    // 페이지 크기 변경 시 1페이지로 복귀 — 줄어든 총 페이지 밖에 남지 않게 한다.
                    onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                }}
            />
        </WorkListPage>
    );
};

export default SystemLogsLoginClient;
