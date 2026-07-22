'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { PrivacyLog, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ShieldAlert, Calendar, User, Tag } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const PAGE_SIZE = 10;

const SystemLogsPrivacyClient = () => {
    const [page, setPage] = usePageParam();
    const [searchKeyword, setSearchKeyword] = useState('');

    const { data, isLoading, error, refetch } = useQuery<PageResponse<PrivacyLog>>({
        queryKey: ['admin-logs-privacy', page, searchKeyword],
        // 서비스가 `pageIndex`(1-base)만 읽는다. 기존 `pageNo` 전달은 무시돼 항상 1페이지가 조회됐다.
        queryFn: () => systemLogAdminService.getPrivacyLogs({
            pageIndex: page,
            size: PAGE_SIZE,
            searchKeyword,
        }),
    });

    const logs = (data?.list || []) as PrivacyLog[];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    const columns: Column<PrivacyLog>[] = [
        {
            header: '로그ID',
            accessor: (item: PrivacyLog) => (
                <div className="font-mono text-xs font-bold text-muted-foreground/50 tabular-nums text-left">
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '대상명',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <User size={14} className="text-primary/40" />
                    <span className="font-bold text-foreground">{item.trgetNm}</span>
                    <span className="text-xs text-muted-foreground font-mono">({item.trgetId})</span>
                </div>
            )
        },
        {
            header: '대상 구분',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/40" />
                    <code className="px-2 py-0.5 bg-hub-purple/10 text-hub-purple text-xs font-bold rounded border border-hub-purple/20">
                        {item.trgetClCode}
                    </code>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '처리 구분',
            accessor: (item: PrivacyLog) => (
                <span className="px-2 py-0.5 bg-amber-500/10 text-amber-600 dark:text-amber-400 text-xs font-bold rounded-md border border-amber-500/20">
                    {item.processSeCode}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: '요청자ID',
            accessor: (item: PrivacyLog) => (
                <div className="px-3 py-1 bg-card border rounded-lg w-fit shadow-sm text-xs font-bold text-foreground">
                    {item.rqesterId}
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '등록일시',
            accessor: (item: PrivacyLog) => (
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
                title="개인정보 접근 로그"
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '개인정보 접근 로그' }]}
            />

            <HubHeader
                title="프라이버시 가드"
                highlight="개인정보 접근 로그"
                subtitle="개인정보 접근 및 처리 이력을 추적하여 데이터 보호 컴플라이언스를 보장합니다."
                icon={ShieldAlert}
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
                    placeholder: '대상명, 요청자 검색..',
                    value: searchKeyword,
                    onSearch: (keyword: string) => { setSearchKeyword(keyword); setPage(1); },
                    onClear: () => { setSearchKeyword(''); setPage(1); },
                }}
            />
        </div>
    );
};

export default SystemLogsPrivacyClient;
