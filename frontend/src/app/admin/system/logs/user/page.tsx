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
        page踰덊샇: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<UserLog>>({
        queryKey: ['admin-logs-user', params],
        queryFn: () => systemLogAdminService.getUserLogs({
            page踰덊샇: Number(params.page踰덊샇) || 1,
            size: params.size,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs: UserLog[] = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<UserLog>[] = [
        {
            header: '諛쒖깮?쇱옄',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.occrrncDe || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '?쒕퉬?ㅻ챸',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary/40" />
                    <span className="font-bold text-slate-700 tracking-tight">{item.svcNm}</span>
                </div>
            )
        },
        {
            header: '硫붿꽌?쒕챸',
            accessor: (item: UserLog) => (
                <code className="px-2 py-1 bg-slate-100 rounded border font-mono text-[10px] text-slate-600">
                    {item.methodNm}
                </code>
            )
        },
        {
            header: '요청?륤D',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-full w-fit shadow-sm">
                    <span className="text-xs font-black text-slate-700">{item.rqesterId}</span>
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '등록?쇱떆',
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
            <PageHeader title="?ъ슜님濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '?ъ슜님濡쒓렇' }]} />

            <HubHeader title="?됱젙 ?대젰" highlight="?ъ슜님濡쒓렇" subtitle="?쒖뒪님?ъ슜?먯쓽 ?쒕퉬님紐⑤뱢蹂님곹샇?묒슜 諛님묒뾽 ?섑뻾 ?대젰님紐낇솗?섍쾶 愿由ы빀?덈떎." icon={History} />

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
                    placeholder: '?쒕퉬?ㅻ챸, 요청님寃님..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page踰덊샇: 1 }),
                }}
            />
        </div>
    );
};

export default UserLogAdminPage;

