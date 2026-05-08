'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { UserLog, SearchParams, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { History, Terminal, FileText, Calendar } from 'lucide-react';

const UserLogAdminPage = () => {
    const [params, setParams] = useState<SearchParams>({
        page: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<UserLog>>({
        queryKey: ['admin-logs-user', params],
        queryFn: () => systemLogAdminService.getUserLogs({
            pageNo: Number(params.page) || 1,
            size: params.size || 10,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs = (data?.list || []) as UserLog[];
    const totalPageCount = data?.totalPage || 1;

    const columns: Column<UserLog>[] = [
        {
            header: 'ë°œìƒ?¼ìž',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.occrrncDe || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '?œë¹„?¤ì„¤ëª?,
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary/40" />
                    <span className="font-bold text-slate-700 tracking-tight text-left">{item.svcNm}</span>
                </div>
            )
        },
        {
            header: 'ë©”ì†Œ?œëª…',
            accessor: (item: UserLog) => (
                <div className="text-left">
                    <code className="px-2 py-1 bg-slate-100 rounded border font-mono text-xs text-slate-600">
                        {item.methodNm}
                    </code>
                </div>
            )
        },
        {
            header: '?”ì²­?ID',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-full w-fit shadow-sm">
                    <span className="text-xs font-bold text-slate-700">{item.rqesterId}</span>
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '?±ë¡?¼ì‹œ',
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
                title="?¬ìš©??ë¡œê·¸" 
                breadcrumbs={[{ label: '?œìŠ¤?œê?ë¦? }, { label: 'ë¡œê·¸ê´€ë¦? }, { label: '?¬ìš©??ë¡œê·¸' }]} 
            />

            <HubHeader 
                title="?œë™ ?´ë ¥" 
                highlight="?¬ìš©??ë¡œê·¸" 
                subtitle="?œìŠ¤???¬ìš©?ì˜ ?œë¹„??ëª¨ë“ˆë³??í˜¸?‘ìš© ë°??‘ì—… ?˜í–‰ ?´ë ¥??ëª…í™•?˜ê²Œ ê´€ë¦¬í•©?ˆë‹¤." 
                icon={History} 
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
                    placeholder: '?œë¹„?¤ì„¤ëª? ?”ì²­?ëª… ê²€??.',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page: 1 }),
                }}
            />
        </div>
    );
};

export default UserLogAdminPage;
