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
        pageë²ˆí˜¸: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<TransferLog>>({
        queryKey: ['admin-logs-transfer', params],
        queryFn: () => systemLogAdminService.getTransferLogs({
            pageë²ˆí˜¸: Number(params.pageë²ˆí˜¸) || 1,
            size: params.size,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs: TransferLog[] = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<TransferLog>[] = [
        {
            header: 'ë¡œê·¸ID',
            accessor: (item: TransferLog) => (
                <div className="font-mono text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '?œê³µê¸°ê?ì½”ë“œ',
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Box size={14} className="text-primary/40" />
                    <code className="text-xs font-bold text-slate-700">{item.provdOrgnCode}</code>
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '?œê³µ?œìŠ¤??,
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/30" />
                    <span className="text-xs font-black text-slate-600">{item.provdSysCode}</span>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '?”ì²­?œìŠ¤??,
            accessor: (item: TransferLog) => (
                <code className="px-2 py-0.5 bg-sky-50 text-sky-600 text-[10px] font-black rounded border border-sky-100">
                    {item.requstSysCode}
                </code>
            ),
            className: 'w-32'
        },
        {
            header: 'ê²°ê³¼',
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
            header: '?±ë¡?¼ì‹œ',
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
            <PageHeader title="?¡ìˆ˜??ë¡œê·¸" breadcrumbs={[{ label: '?œìŠ¤?œê?ë¦? }, { label: 'ë¡œê·¸ê´€ë¦? }, { label: '?¡ìˆ˜??ë¡œê·¸' }]} />

            <HubHeader title="?°ê³„ ë§ˆìŠ¤?? highlight="?¡ìˆ˜??ë¡œê·¸" subtitle="?¸ë? ?œìŠ¤??ë°??´ë? ëª¨ë“ˆ ê°„ì˜ ?°ì´???¡ìˆ˜???´ë ¥???¤ì‹œê°„ìœ¼ë¡?ëª¨ë‹ˆ?°ë§?©ë‹ˆ??" icon={Share2} />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                pagination={{
                    currentPage: (params.pageë²ˆí˜¸ || 1) as number,
                    totalPages: data?.totalPage || pagination?.totalPageCount || 1,
                    onPageChange: (page: number) => setParams({ ...params, pageë²ˆí˜¸: page }),
                }}
                search={{
                    placeholder: 'ê¸°ê?ì½”ë“œ, ?œìŠ¤??ê²€??..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, pageë²ˆí˜¸: 1 }),
                }}
            />
        </div>
    );
};

export default TransferLogAdminPage;
