'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { TransferLog, SearchParams, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Share2, Tag, Calendar, Box } from 'lucide-react';

const TransferLogAdminPage = () => {
    const [params, setParams] = useState<SearchParams>({
        page踰덊샇: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<TransferLog>>({
        queryKey: ['admin-logs-transfer', params],
        queryFn: () => systemLogAdminService.getTransferLogs({
            page踰덊샇: Number(params.page踰덊샇) || 1,
            size: params.size,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs: TransferLog[] = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<TransferLog>[] = [
        {
            header: '로그ID',
            accessor: (item: TransferLog) => (
                <div className="font-mono text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '?쒓났湲곌肄붾뱶',
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Box size={14} className="text-primary/40" />
                    <code className="text-xs font-bold text-slate-700">{item.provdOrgnCode}</code>
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '?쒓났시스템,
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/30" />
                    <span className="text-xs font-black text-slate-600">{item.provdSysCode}</span>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '요청시스템,
            accessor: (item: TransferLog) => (
                <code className="px-2 py-0.5 bg-sky-50 text-sky-600 text-[10px] font-black rounded border border-sky-100">
                    {item.requstSysCode}
                </code>
            ),
            className: 'w-32'
        },
        {
            header: '寃곌낵',
            accessor: (item: TransferLog) => (
                <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase ${
                    item.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'
                }`}>
                    {item.result}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: '등록?쇱떆',
            accessor: (item: TransferLog) => (
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
            <PageHeader title="≪닔님로그" breadcrumbs={[{ label: '?쒖뒪?쒓由 }, { label: '로그관리 }, { label: '≪닔님로그' }]} />

            <HubHeader title="?곌퀎 留덉뒪님 highlight="≪닔님로그" subtitle="?몃? 시스템諛님대? 紐⑤뱢 媛꾩쓽 데이터≪닔님?대젰님실시간꾩쑝濡紐⑤땲?곕쭅합니다" icon={Share2} />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                pagination={{
                    currentPage: (params.page踰덊샇 || 1) as number,
                    totalPages: data?.totalPage || pagination?.totalPageCount || 1,
                    onPageChange: (page: number) => setParams({ ...params, page踰덊샇: page }),
                }}
                search={{
                    placeholder: '湲곌肄붾뱶, 시스템寃님..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page踰덊샇: 1 }),
                }}
            />
        </div>
    );
};

export default TransferLogAdminPage;

