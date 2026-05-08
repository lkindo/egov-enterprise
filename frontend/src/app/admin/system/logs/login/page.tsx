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
        page: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<LoginLog>>({
        queryKey: ['admin-logs-login', params],
        queryFn: () => systemLogAdminService.getLoginLogs({ 
            page: (Number(params.page) || 1) - 1, 
            size: params.size || 10, 
            searchWrd: params.searchKeyword 
        }),
    });

    const logs = (data?.list || []) as LoginLog[];
    const totalPageCount = data?.totalPage || 1;

    const columns: Column<LoginLog>[] = [
        {
            header: '로그ID',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/50 tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '발생?�점',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.creatDt ? item.creatDt.substring(0, 19).replace('T', ' ') : '-'}
                </div>
            ),
            className: 'w-52'
        },
        {
            header: '?�청??,
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-full w-fit shadow-sm">
                    <span className="text-xs font-bold text-slate-700">{item.loginNm}</span>
                    <span className="text-xs text-slate-400 font-bold opacity-50">({item.loginId})</span>
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '?�속IP',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.loginIp}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '구분',
            accessor: (item: LoginLog) => (
                <div className="flex items-center justify-center">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border uppercase tracking-tight ${
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
            <PageHeader 
                title="로그??로그" 
                breadcrumbs={[{ label: '?�스?��?�? }, { label: '로그관�? }, { label: '로그??로그' }]} 
            />

            <HubHeader 
                title="계정 가?�성" 
                highlight="로그??로그" 
                subtitle="?�스???�속 �?로그??로그?�웃 ?�력???�명?�게 관리하??보안 ?�고�?미연??방�??�니??" 
                icon={KeyRound} 
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
                    placeholder: '?�청?�명, ID 검??.',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page: 1 }),
                }}
            />
        </div>
    );
};

export default LoginLogAdminPage;
