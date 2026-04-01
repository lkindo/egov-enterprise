'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { WebLog, SearchParams, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Globe, Clock, Terminal, Link } from 'lucide-react';

const WebLogAdminPage = () => {
    const [params, setParams] = useState<SearchParams>({
        page踰덊샇: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<WebLog>>({
        queryKey: ['admin-logs-web', params],
        queryFn: () => systemLogAdminService.getWebLogs({
            page踰덊샇: Number(params.page踰덊샇) || 1,
            size: params.size,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs: WebLog[] = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<WebLog>[] = [
        {
            header: '濡쒓렇ID',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    {item.webLogId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: 'URL',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2">
                    <Link size={12} className="text-primary/40 shrink-0" />
                    <span className="font-mono text-xs text-slate-600 truncate max-w-[240px]">{item.url}</span>
                </div>
            )
        },
        {
            header: 'Method',
            accessor: (item: WebLog) => (
                <code className={`px-2 py-1 rounded border font-mono text-[10px] font-black ${
                    item.method === 'GET' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                    item.method === 'POST' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                    item.method === 'PUT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                    'bg-red-50 text-red-600 border-red-100'
                }`}>
                    {item.method}
                </code>
            ),
            className: 'w-24'
        },
        {
            header: '?묐떟?쒓컙',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                    <Clock size={12} className="opacity-30" />
                    <span className="text-xs tabular-nums">{item.processTime}</span>
                    <span className="text-[10px] text-slate-400">ms</span>
                </div>
            ),
            className: 'w-28'
        },
        {
            header: '요청?륤P',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.rqesterIp}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '등록?쇱떆',
            accessor: (item: WebLog) => (
                <div className="font-mono text-xs text-slate-500 tabular-nums">
                    {item.creatDt ? item.creatDt.substring(0, 19).replace('T', ' ') : '-'}
                </div>
            ),
            className: 'w-44'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="님濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '님濡쒓렇' }]} />

            <HubHeader title="?몃옒님?덉씠님 highlight="님濡쒓렇" subtitle="紐⑤뱺 HTTP 요청怨님묐떟 ?대젰님분석?섏뿬 ?쒖뒪님?깅뒫怨?보안 ?댁긽 吏뺥썑瑜님ㅼ떆媛꾩쑝濡?媛먯님⑸땲님" icon={Globe} />

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
                    placeholder: 'URL, IP 寃님..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page踰덊샇: 1 }),
                }}
            />
        </div>
    );
};

export default WebLogAdminPage;

