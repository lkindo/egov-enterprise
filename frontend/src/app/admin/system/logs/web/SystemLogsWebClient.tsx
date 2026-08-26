'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import type { PageResponse, WebLog } from '@/types/foundation/system';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PeriodFilter, EMPTY_PERIOD, periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';
import { requestFullExport } from '@/app/components/patterns/full-result-export';
import { FileDown } from 'lucide-react';
import { useToast } from '@/app/components/ui/toast';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Globe, Clock, Terminal, Link } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const SystemLogsWebClient = () => {
    const [page, setPage] = usePageParam();
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
    const { toast } = useToast();

    const { data, isLoading, error, refetch } = useQuery<PageResponse<WebLog>>({
        queryKey: ['admin-logs-web', page, pageSize, searchKeyword, periodToParams(period)],
        // 서비스가 `pageIndex`(1-base)만 읽는다. 기존 `pageNo` 전달은 무시돼 항상 1페이지가 조회됐다.
        queryFn: () => systemLogAdminService.getWebLogs({
            pageIndex: page,
            size: pageSize,
            searchKeyword,
            ...periodToParams(period),
        }),
    });

    const logs = data?.list ?? [];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    /** 전체 결과 xlsx 요청. 상한 초과는 다운로드를 시작하지 않고 즉시 알린다(서버도 같은 상한으로 400). */
    const handleFullExport = () => {
        requestFullExport({
            url: '/api/v1/admin/system/logs/web/export.xlsx',
            totalCount,
            searchKeyword,
            period,
            onTooMany: (message) => toast(message, 'error'),
        });
    };


    const columns: Column<WebLog>[] = [
        {
            header: '웹 로그 일련번호',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/50 tabular-nums text-left">
                    <Terminal size={12} className="opacity-30" />
                    {item.webLogSn ?? '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '요청 URL',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2">
                    <Link size={12} className="text-primary/40 shrink-0" />
                    <span className="font-mono text-xs text-muted-foreground truncate max-w-[240px]">{item.url}</span>
                </div>
            )
        },
        {
            header: '요청자',
            // 현재 페이지 범위 클라이언트 정렬(opt-in).
            sortKey: 'dmndUserId',
            accessor: (item: WebLog) => (
                <span className="text-xs font-bold text-foreground">{item.dmndUserId || '-'}</span>
            ),
            className: 'w-32'
        },
        {
            header: '응답시간',
            // 숫자 필드라 수치 정렬이 그대로 성립한다(느린 요청 탐색용).
            sortKey: 'prcsTm',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                    <Clock size={12} className="opacity-30" />
                    <span className="text-xs tabular-nums">{item.prcsTm ?? '-'}</span>
                    {item.prcsTm != null ? <span className="text-xs text-muted-foreground">ms</span> : null}
                </div>
            ),
            className: 'w-28'
        },
        {
            header: '요청자IP',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.dmndUserIpAddr || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '등록일시',
            sortKey: 'occrYmd',
            accessor: (item: WebLog) => (
                <div className="font-mono text-xs text-muted-foreground tabular-nums">
                    {item.occrYmd || '-'}
                </div>
            ),
            className: 'w-44'
        }
    ];

    return (
        <WorkListPage
            title="웹 로그"
            description="HTTP 요청·응답 이력을 발생일자 최신순으로 조회합니다."
            breadcrumbItems={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '웹 로그' }]}
            filterStateKey="system-logs-web"
            // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
            totalCount={error ? undefined : totalCount}
            toolbarActions={
                /* 전체 결과 xlsx — 서버 스트리밍 export. 조건 일치 전량이라 현재 페이지 반출과 다르다. */
                <button
                    type="button"
                    onClick={handleFullExport}
                    className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-primary/40 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                >
                    <FileDown size={16} aria-hidden="true" />
                    전체 결과 엑셀 다운로드
                </button>
            }
            filter={
                <KeywordFilter
                    label="URL · IP"
                    placeholder="URL, IP 검색"
                    value={searchKeyword}
                    onSearch={(keyword: string) => { setSearchKeyword(keyword); setPage(1); }}
                >
                    <PeriodFilter
                        label="조회 기간(발생일자)"
                        value={period}
                        onChange={(next) => { setPeriod(next); setPage(1); }}
                    />
                </KeywordFilter>
            }
        >
            <StandardDataTable
                accessibleLabel="웹 로그 목록"
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                emptyMessage={emptyResultMessage(searchKeyword, '조회된 웹 로그가 없습니다.')}
                keyField="webLogSn"
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

export default SystemLogsWebClient;
