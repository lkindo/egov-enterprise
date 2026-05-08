'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { PrivacyLog, SearchParams, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { ShieldAlert, Calendar, User, Tag } from 'lucide-react';

const PrivacyLogAdminPage = () => {
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
            header: 'ë¡œê·¸ID',
            accessor: (item: PrivacyLog) => (
                <div className="font-mono text-xs font-bold text-muted-foreground/50 tabular-nums text-left">
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '?€?ëª…',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <User size={14} className="text-primary/40" />
                    <span className="font-bold text-slate-700">{item.trgetNm}</span>
                    <span className="text-xs text-slate-400 font-mono">({item.trgetId})</span>
                </div>
            )
        },
        {
            header: '?€??êµ¬ë¶„',
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
            header: 'ì²˜ë¦¬ êµ¬ë¶„',
            accessor: (item: PrivacyLog) => (
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-xs font-bold rounded-md border border-orange-100">
                    {item.processSeCode}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: '?”ì²­?ID',
            accessor: (item: PrivacyLog) => (
                <div className="px-3 py-1 bg-white border rounded-full w-fit shadow-sm text-xs font-bold text-slate-700">
                    {item.rqesterId}
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '?±ë¡?¼ì‹œ',
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
                title="ê°œì¸?•ë³´ ?‘ê·¼ ë¡œê·¸" 
                breadcrumbs={[{ label: '?œìŠ¤?œê?ë¦? }, { label: 'ë¡œê·¸ê´€ë¦? }, { label: 'ê°œì¸?•ë³´ ?‘ê·¼ ë¡œê·¸' }]} 
            />

            <HubHeader 
                title="?„ë¼?´ë²„??ê°€?? 
                highlight="ê°œì¸?•ë³´ ?‘ê·¼ ë¡œê·¸" 
                subtitle="ê°œì¸?•ë³´ ?‘ê·¼ ë°?ì²˜ë¦¬ ?´ë ¥??ì¶”ì ?˜ì—¬ ?°ì´??ë³´í˜¸ ì»´í”Œ?¼ì´?¸ìŠ¤ë¥?ë³´ìž¥?©ë‹ˆ??" 
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
                    placeholder: '?€?ëª…, ?”ì²­??ê²€??.',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page: 1 }),
                }}
            />
        </div>
    );
};

export default PrivacyLogAdminPage;
