'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { WebLog, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Globe, Clock, Terminal, Link } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const PAGE_SIZE = 10;

const SystemLogsWebClient = () => {
    const [page, setPage] = usePageParam();
    const [searchKeyword, setSearchKeyword] = useState('');

    const { data, isLoading, error, refetch } = useQuery<PageResponse<WebLog>>({
        queryKey: ['admin-logs-web', page, searchKeyword],
        // 서비스가 `pageIndex`(1-base)만 읽는다. 기존 `pageNo` 전달은 무시돼 항상 1페이지가 조회됐다.
        queryFn: () => systemLogAdminService.getWebLogs({
            pageIndex: page,
            size: PAGE_SIZE,
            searchKeyword,
        }),
    });

    const logs = (data?.list || []) as WebLog[];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    const columns: Column<WebLog>[] = [
        {
            header: '로그ID',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/50 tabular-nums text-left">
                    <Terminal size={12} className="opacity-30" />
                    {item.webLogId}
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
            header: '메소드',
            accessor: (item: WebLog) => (
                <div className="flex justify-start">
                    <code className={`px-2 py-1 rounded border font-mono text-xs font-bold ${
                        item.method === 'GET' ? 'bg-info/10 text-info border-info/20' :
                        item.method === 'POST' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20' :
                        item.method === 'PUT' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20' :
                        'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }`}>
                        {item.method}
                    </code>
                </div>
            ),
            className: 'w-24'
        },
        {
            header: '응답시간',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                    <Clock size={12} className="opacity-30" />
                    <span className="text-xs tabular-nums">{item.processTime ?? '-'}</span>
                    {item.processTime !== undefined && item.processTime !== null ? <span className="text-xs text-muted-foreground">ms</span> : null}
                </div>
            ),
            className: 'w-28'
        },
        {
            header: '요청자IP',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.rqesterIp}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '등록일시',
            accessor: (item: WebLog) => (
                <div className="font-mono text-xs text-muted-foreground tabular-nums">
                    {item.creatDt ? item.creatDt.substring(0, 19).replace('T', ' ') : '-'}
                </div>
            ),
            className: 'w-44'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader
                title="웹 로그"
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '웹 로그' }]}
            />

            <HubHeader
                title="트래픽 레이더"
                highlight="웹 로그"
                subtitle="모든 HTTP 요청과 응답 이력을 분석하여 시스템 성능과 보안 이상 징후를 실시간으로 감지합니다."
                icon={Globe}
            />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                keyField="webLogId"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    totalCount,
                    pageSize: PAGE_SIZE,
                }}
                search={{
                    placeholder: 'URL, IP 검색..',
                    value: searchKeyword,
                    onSearch: (keyword: string) => { setSearchKeyword(keyword); setPage(1); },
                    onClear: () => { setSearchKeyword(''); setPage(1); },
                }}
            />
        </div>
    );
};

export default SystemLogsWebClient;
