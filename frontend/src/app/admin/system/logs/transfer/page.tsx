'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import { TransferLog, SearchParams, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Share2, Tag, Calendar, Box } from 'lucide-react';

const TransferLogAdminPage = () => {
    const [params, setParams] = useState<SearchParams>({
        page: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<TransferLog>>({
        queryKey: ['admin-logs-transfer', params],
        queryFn: () => systemLogAdminService.getTransferLogs({
            page: (Number(params.page) || 1) - 1,
            size: params.size || 10,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs = (data?.resultList || data?.list || []) as TransferLog[];
    const totalPageCount = data?.totalPage || data?.paginationInfo?.totalPageCount || 1;

    const columns: Column<TransferLog>[] = [
        {
            header: '로그ID',
            accessor: (item: TransferLog) => (
                <div className="font-mono text-[10px] font-bold text-muted-foreground/50 tabular-nums text-left">
                    {item.logId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '제공기관코드',
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Box size={14} className="text-primary/40" />
                    <code className="text-xs font-bold text-slate-700">{item.provdOrgnCode}</code>
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '제공시스템',
            accessor: (item: TransferLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/30" />
                    <span className="text-xs font-black text-slate-600">{item.provdSysCode}</span>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '요청시스템',
            accessor: (item: TransferLog) => (
                <div className="text-left">
                    <code className="px-2 py-0.5 bg-sky-50 text-sky-600 text-[10px] font-black rounded border border-sky-100">
                        {item.requstSysCode}
                    </code>
                </div>
            ),
            className: 'w-32'
        },
        {
            header: '결과',
            accessor: (item: TransferLog) => (
                <div className="flex justify-center">
                    <span className={`px-2 py-0.5 rounded-md text-[10px] font-black border uppercase ${
                        item.result === 'SUCCESS' ? 'bg-emerald-50 text-emerald-600 border-emerald-100' : 'bg-red-50 text-red-500 border-red-100'
                    }`}>
                        {item.result}
                    </span>
                </div>
            ),
            className: 'w-24'
        },
        {
            header: '등록일시',
            accessor: (item: TransferLog) => (
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
                title="전송 로그" 
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '전송 로그' }]} 
            />

            <HubHeader 
                title="연계 마스터" 
                highlight="전송 로그" 
                subtitle="외부 시스템 및 내부 모듈 간의 데이터 전송 이력을 실시간으로 모니터링합니다." 
                icon={Share2} 
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
                    placeholder: '기관코드, 시스템 검색..',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page: 1 }),
                }}
            />
        </div>
    );
};

export default TransferLogAdminPage;
