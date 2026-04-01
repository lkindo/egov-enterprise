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
        page踰덊샇: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<PrivacyLog>>({
        queryKey: ['admin-logs-privacy', params],
        queryFn: () => systemLogAdminService.getPrivacyLogs({
            page踰덊샇: Number(params.page踰덊샇) || 1,
            size: params.size,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs: PrivacyLog[] = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<PrivacyLog>[] = [
        {
            header: '濡쒓렇ID',
            accessor: (item: PrivacyLog) => (
                <div className="font-mono text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '??곷챸',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <User size={14} className="text-primary/40" />
                    <span className="font-bold text-slate-700">{item.trgetNm}</span>
                    <span className="text-[10px] text-slate-400 font-mono">({item.trgetId})</span>
                </div>
            )
        },
        {
            header: '??곸쑀님,
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/40" />
                    <code className="px-2 py-0.5 bg-purple-50 text-purple-600 text-[10px] font-black rounded border border-purple-100">
                        {item.trgetClCode}
                    </code>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '泥섎━援щ텇',
            accessor: (item: PrivacyLog) => (
                <span className="px-2 py-0.5 bg-orange-50 text-orange-600 text-[10px] font-black rounded-md border border-orange-100">
                    {item.processSeCode}
                </span>
            ),
            className: 'w-24'
        },
        {
            header: '요청?륤D',
            accessor: (item: PrivacyLog) => (
                <div className="px-3 py-1 bg-white border rounded-full w-fit shadow-sm text-xs font-black text-slate-700">
                    {item.rqesterId}
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '등록?쇱떆',
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
            <PageHeader title="媛쒖씤?뺣낫 ?묎렐 濡쒓렇" breadcrumbs={[{ label: '?쒖뒪?쒓?由? }, { label: '濡쒓렇愿由? }, { label: '媛쒖씤?뺣낫 ?묎렐 濡쒓렇' }]} />

            <HubHeader title="?꾨씪?대쾭님媛님 highlight="媛쒖씤?뺣낫 ?묎렐 濡쒓렇" subtitle="媛쒖씤?뺣낫 ?묎렐 諛?泥섎━ ?대젰님異붿쟻?섏뿬 ?곗씠님蹂댄샇 而댄뵆?쇱씠?몄뒪瑜?蹂댁옣?⑸땲님" icon={ShieldAlert} />

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
                    placeholder: '??곷챸, 요청님寃님..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page踰덊샇: 1 }),
                }}
            />
        </div>
    );
};

export default PrivacyLogAdminPage;

