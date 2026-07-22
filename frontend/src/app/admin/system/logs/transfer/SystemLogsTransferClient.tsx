'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { TransferLog, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Share2, Tag, Calendar, Box } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const PAGE_SIZE = 10;

const SystemLogsTransferClient = () => {
    const [page, setPage] = usePageParam();
    const [searchKeyword, setSearchKeyword] = useState('');

    const { data, isLoading, error, refetch } = useQuery<PageResponse<TransferLog>>({
        queryKey: ['admin-logs-transfer', page, searchKeyword],
        // 서비스가 `pageIndex`(1-base)만 읽는다. 기존 `page: page - 1` 전달은 1페이지 요청 시 pageIndex=0 이 됐다.
        queryFn: () => systemLogAdminService.getTransferLogs({
            pageIndex: page,
            size: PAGE_SIZE,
            searchKeyword,
        }),
    });

    const logs = (data?.list || []) as TransferLog[];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    const columns: Column<TransferLog>[] = [
        {
            header: '로그ID',
            accessor: (item: TransferLog) => (
                <div className="font-mono text-xs font-bold text-muted-foreground/50 tabular-nums text-left">
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '제공기관코드',
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Box size={14} className="text-primary/40" />
                    <code className="text-xs font-bold text-foreground">{item.provdOrgnCode}</code>
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '제공시스템',
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/30" />
                    <span className="text-xs font-bold text-muted-foreground">{item.provdSysCode}</span>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '요청시스템',
            accessor: (item: TransferLog) => (
                <div className="text-left">
                    <code className="px-2 py-0.5 bg-info/10 text-info text-xs font-bold rounded border border-info/20">
                        {item.requstSysCode}
                    </code>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '결과',
            accessor: (item: TransferLog) => (
                <div className="flex justify-center">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border ${
                        item.result === 'SUCCESS'
                            ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20'
                    }`}>
                        {item.result || '-'}
                    </span>
                </div>
            ),
            className: 'w-24'
        },
        {
            header: '등록일시',
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    <Calendar size={14} className="opacity-30" />
                    {item.creatDt ? item.creatDt.substring(0, 10) : '-'}
                </div>
            ),
            className: 'w-36'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader
                title="전송 로그"
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '전송 로그' }]}
            />

            <HubHeader
                title="연계 마스터"
                highlight="전송 로그"
                subtitle="외부 시스템 및 내부 모듈 간의 데이터 전송 이력을 실시간으로 모니터링합니다."
                icon={Share2}
            />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                keyField="logId"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    totalCount,
                    pageSize: PAGE_SIZE,
                }}
                search={{
                    placeholder: '기관코드, 시스템 검색..',
                    value: searchKeyword,
                    onSearch: (keyword: string) => { setSearchKeyword(keyword); setPage(1); },
                    onClear: () => { setSearchKeyword(''); setPage(1); },
                }}
            />
        </div>
    );
};

export default SystemLogsTransferClient;
