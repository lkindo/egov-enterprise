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

const SystemLogsLoginClient = () => {
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
            header: '발생시점',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.creatDt ? item.creatDt.substring(0, 19).replace('T', ' ') : '-'}
                </div>
            ),
            className: 'w-52'
        },
        {
            header: '요청자',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-lg w-fit shadow-sm">
                    <span className="text-xs font-bold text-foreground">{item.loginNm}</span>
                    <span className="text-xs text-muted-foreground font-bold opacity-50">({item.loginId})</span>
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
            header: '구분',
            accessor: (item: LoginLog) => (
                <div className="flex items-center justify-center">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border uppercase tracking-tighter ${
                        item.loginMthd === 'LOGIN' ? 'bg-hub-indigo/10 text-hub-indigo border-hub-indigo/20' : 'bg-muted text-muted-foreground border-border'
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
                title="로그인 로그" 
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '로그인 로그' }]} 
            />

            <HubHeader 
                title="계정 가용성" 
                highlight="로그인 로그" 
                subtitle="시스템 접속 및 로그인/로그아웃 이력을 투명하게 관리하여 보안 사고를 미연에 방지합니다." 
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
                    placeholder: '요청자명, ID 검색..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page: 1 }),
                }}
            />
        </div>
    );
};

export default SystemLogsLoginClient;
