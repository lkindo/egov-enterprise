'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService, SysLog } from '@/services/foundation/system/SystemLogAdminService';
import { SearchParams } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Activity, Clock, Terminal, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';

const SystemLogAdminPage = () => {
    const [params, setParams] = useState<SearchParams>({
        pageNo: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery({
        queryKey: ['admin-logs-system', params],
        queryFn: () => systemLogAdminService.getSystemLogs({ 
            page: (params.pageNo || 1) - 1, 
            size: params.size,
            searchWrd: params.searchKeyword
        }),
    });

    const logs: SysLog[] = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<SysLog>[] = [
        {
            header: '요청ID',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-2 font-mono text-[10px] font-bold text-muted-foreground/50 tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    {item.requstId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '발생일자',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 tabular-nums">
                    {(item as any).occcrrncDe || '-'}
                </div>
            ),
            className: 'w-52'
        },
        {
            header: '서비스명',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary/40" />
                    <span className="font-bold text-slate-700 tracking-tight">{item.srvcNm}</span>
                </div>
            )
        },
        {
            header: '메서드명',
            accessor: (item: SysLog) => (
                <code className="px-2 py-1 bg-slate-100 rounded border font-mono text-[10px] text-slate-600">
                    {item.methodNm}
                </code>
            )
        },
        {
            header: '응답시간',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-1.5 font-bold text-slate-600">
                    <Clock size={12} className="opacity-30" />
                    <span className="text-xs">{item.processTime}</span>
                    <span className="text-[10px] text-slate-400 font-medium">ms</span>
                </div>
            ),
            className: 'w-24'
        },
        {
            header: '상태',
            accessor: (_item: SysLog) => (
                <div className="flex items-center justify-center">
                    <span className="px-2 py-0.5 bg-emerald-50 text-emerald-600 text-[10px] font-black rounded-md border border-emerald-100 uppercase tracking-tighter">SUCCESS</span>
                </div>
            ),
            className: 'w-24'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader title="시스템 로그" breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '시스템 로그' }]} />

            <HubHeader title="시스템 인사이트" highlight="시스템 로그" subtitle="서버의 실시간 동작 상태와 모듈별 실행 이력을 명확하게 추적합니다." icon={Activity} 
                actions={
                    <div className="flex gap-4 p-2 items-center">
                        <Button variant="outline" size="lg" className="h-12 rounded-xl border-2 font-black text-[10px] tracking-widest uppercase gap-2">실시간 모니터링</Button>
                    </div>
                }
            />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                pagination={{
                    currentPage: params.pageNo || 1,
                    totalPages: pagination?.totalPageCount || 1,
                    onPageChange: (page: number) => setParams({ ...params, pageNo: page }),
                }}
                search={{
                    placeholder: '서비스명, 요청ID 검색...',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, pageNo: 1 }),
                }}
            />
        </div>
    );
};

export default SystemLogAdminPage;
