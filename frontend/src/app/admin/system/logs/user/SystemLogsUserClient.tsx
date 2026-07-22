'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { UserLog, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { History, Terminal, FileText, Calendar } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const PAGE_SIZE = 10;

const SystemLogsUserClient = () => {
    const [page, setPage] = usePageParam();
    const [searchKeyword, setSearchKeyword] = useState('');

    const { data, isLoading, error, refetch } = useQuery<PageResponse<UserLog>>({
        queryKey: ['admin-logs-user', page, searchKeyword],
        // 서비스가 `pageIndex`(1-base)만 읽는다. 기존 `pageNo` 전달은 무시돼 항상 1페이지가 조회됐다.
        queryFn: () => systemLogAdminService.getUserLogs({
            pageIndex: page,
            size: PAGE_SIZE,
            searchKeyword,
        }),
    });

    const logs = (data?.list || []) as UserLog[];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    const columns: Column<UserLog>[] = [
        {
            header: '발생일자',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.occrrncDe || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '서비스설명',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary/40" />
                    <span className="font-bold text-foreground tracking-tight text-left">{item.svcNm}</span>
                </div>
            )
        },
        {
            header: '메소드명',
            accessor: (item: UserLog) => (
                <div className="text-left">
                    <code className="px-2 py-1 bg-muted rounded border font-mono text-xs text-muted-foreground">
                        {item.methodNm}
                    </code>
                </div>
            )
        },
        {
            header: '요청자ID',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-card border rounded-lg w-fit shadow-sm">
                    <span className="text-xs font-bold text-foreground">{item.rqesterId}</span>
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '등록일시',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    {item.creatDt ? item.creatDt.substring(0, 10) : '-'}
                </div>
            ),
            className: 'w-36'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader
                title="사용자 로그"
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '사용자 로그' }]}
            />

            <HubHeader
                title="활동 이력"
                highlight="사용자 로그"
                subtitle="시스템 사용자의 서비스 모듈별 상호작용 및 작업 수행 이력을 명확하게 관리합니다."
                icon={History}
            />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                keyField="userLogId"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    totalCount,
                    pageSize: PAGE_SIZE,
                }}
                search={{
                    placeholder: '서비스설명, 요청자ID 검색..',
                    value: searchKeyword,
                    onSearch: (keyword: string) => { setSearchKeyword(keyword); setPage(1); },
                    onClear: () => { setSearchKeyword(''); setPage(1); },
                }}
            />
        </div>
    );
};

export default SystemLogsUserClient;
