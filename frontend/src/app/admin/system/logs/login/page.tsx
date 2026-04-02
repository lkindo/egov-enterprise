'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { SearchParams, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { KeyRound, Terminal, Calendar, Globe } from 'lucide-react';

// Use the service's internal LoginLog type (has creatDt, loginNm etc.)
import type { LoginLog } from '@/services/foundation/system/SystemLogAdminService';

const LoginLogAdminPage = () => {
    const [params, setParams] = useState<SearchParams>({
        page踰덊샇: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<LoginLog>>({
        queryKey: ['admin-logs-login', params],
        queryFn: () => systemLogAdminService.getLoginLogs({ 
            page: (Number(params.page踰덊샇) || 1) - 1, 
            size: params.size, 
            searchWrd: params.searchKeyword 
        }),
    });

    const logs = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<LoginLog>[] = [
        {
            header: '로그ID',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '諛쒖깮?쒖젏',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.creatDt ? item.creatDt.substring(0, 19).replace('T', ' ') : '-'}
                </div>
            ),
            className: 'w-52'
        },
        {
            header: '요청님,
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-full w-fit shadow-sm">
                    <span className="text-xs font-black text-slate-700">{item.loginNm}</span>
                    <span className="text-[10px] text-slate-400 font-bold opacity-50">({item.loginId})</span>
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '접속IP',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.loginIp}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '援щ텇',
            accessor: (item: LoginLog) => (
                <div className="flex items-center justify-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase tracking-tighter ${
                        item.loginMthd === 'LOGIN' ? 'bg-indigo-50 text-indigo-600 border-indigo-100' : 'bg-slate-50 text-slate-500 border-slate-100'
                    }`}>
                        {item.loginMthd}
                    </span>
                </div>
            ),
            className: 'w-24'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="로그인로그" breadcrumbs={[{ label: '?쒖뒪?쒓由 }, { label: '로그관리 }, { label: '로그인로그' }]} />

            <HubHeader title="怨꾩젙 媛붿뼵" highlight="로그인로그" subtitle="시스템접속 및 로그인로그?꾩썐 ?대젰님щ챸?섍쾶 관리ы븯보안 ш퀬瑜誘몄뿰님諛⑹님⑸땲님" icon={KeyRound} />

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
                    placeholder: '요청?먮챸, ID 寃님..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page踰덊샇: 1 }),
                }}
            />
        </div>
    );
};

export default LoginLogAdminPage;

