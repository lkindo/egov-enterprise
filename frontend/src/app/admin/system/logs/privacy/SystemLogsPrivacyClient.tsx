'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { PrivacyLog, SearchParams, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ShieldAlert, Calendar, User, Tag } from 'lucide-react';

const SystemLogsPrivacyClient = () => {
    const [params, setParams] = useState<SearchParams>({
        page: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<PrivacyLog>>({
        queryKey: ['admin-logs-privacy', params],
        queryFn: () => systemLogAdminService.getPrivacyLogs({
            pageNo: Number(params.page) || 1,
            size: params.size || 10,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs = (data?.list || []) as PrivacyLog[];
    const totalPageCount = data?.totalPage || 1;

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
                    <span className="font-bold text-slate-700">{item.trgetNm}</span>
                    <span className="text-xs text-slate-400 font-mono">({item.trgetId})</span>
                </div>
            )
        },
        {
            header: '대상 구분',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/40" />
                    <code className="px-2 py-0.5 bg-purple-50 text-purple-600 text-xs font-bold rounded border border-purple-100">
                        {item.trgetClCode}
                    </code>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '처리 구분',
            accessor: (item: PrivacyLog) => (
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-bold rounded-md border border-orange-100">
                    {item.processSeCode}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: '요청자ID',
            accessor: (item: PrivacyLog) => (
                <div className="px-3 py-1 bg-white border rounded-lg w-fit shadow-sm text-xs font-bold text-slate-700">
                    {item.rqesterId}
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '등록일시',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 tabular-nums">
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
                pagination={{
                    currentPage: (params.page || 1) as number,
                    totalPages: totalPageCount,
                    onPageChange: (page: number) => setParams({ ...params, page: page }),
                }}
                search={{
                    placeholder: '대상명, 요청자 검색..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page: 1 }),
                }}
            />
        </div>
    );
};

export default SystemLogsPrivacyClient;
