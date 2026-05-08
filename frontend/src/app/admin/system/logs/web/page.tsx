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
        page: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<WebLog>>({
        queryKey: ['admin-logs-web', params],
        queryFn: () => systemLogAdminService.getWebLogs({
            pageNo: Number(params.page) || 1,
            size: params.size || 10,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs = (data?.list || []) as WebLog[];
    const totalPageCount = data?.totalPage || 1;

    const columns: Column<WebLog>[] = [
        {
            header: 'ë¡œê·¸ID',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/50 tabular-nums text-left">
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
                <div className="flex justify-start">
                    <code className={`px-2 py-1 rounded border font-mono text-xs font-bold ${
                        item.method === 'GET' ? 'bg-sky-50 text-sky-600 border-sky-100' :
                        item.method === 'POST' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' :
                        item.method === 'PUT' ? 'bg-amber-50 text-amber-600 border-amber-100' :
                        'bg-red-50 text-red-600 border-red-100'
                    }`}>
                        {item.method}
                    </code>
                </div>
            ),
            className: 'w-24'
        },
        {
            header: '?‘ë‹µ?œê°„',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                    <Clock size={12} className="opacity-30" />
                    <span className="text-xs tabular-nums">{item.processTime}</span>
                    <span className="text-xs text-slate-400">ms</span>
                </div>
            ),
            className: 'w-28'
        },
        {
            header: '?”ì²­?IP',
            accessor: (item: WebLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.rqesterIp}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '?±ë¡?¼ì‹œ',
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
            <PageHeader 
                title="??ë¡œê·¸" 
                breadcrumbs={[{ label: '?œìŠ¤?œê?ë¦? }, { label: 'ë¡œê·¸ê´€ë¦? }, { label: '??ë¡œê·¸' }]} 
            />

            <HubHeader 
                title="?¸ëž˜???ˆì´?? 
                highlight="??ë¡œê·¸" 
                subtitle="ëª¨ë“  HTTP ?”ì²­ê³??‘ë‹µ ?´ë ¥??ë¶„ì„?˜ì—¬ ?œìŠ¤???±ëŠ¥ê³?ë³´ì•ˆ ?´ìƒ ì§•í›„ë¥??¤ì‹œê°„ìœ¼ë¡?ê°ì??©ë‹ˆ??" 
                icon={Globe} 
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
                    placeholder: 'URL, IP ê²€??.',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page: 1 }),
                }}
            />
        </div>
    );
};

export default WebLogAdminPage;
