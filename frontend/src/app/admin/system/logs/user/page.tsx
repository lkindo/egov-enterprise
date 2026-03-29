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
        page번호: 1,
        size: 10,
        searchKeyword: '',
    });

    const { data, isLoading } = useQuery<PageResponse<UserLog>>({
        queryKey: ['admin-logs-user', params],
        queryFn: () => systemLogAdminService.getUserLogs({
            page번호: Number(params.page번호) || 1,
            size: params.size,
            searchKeyword: params.searchKeyword,
        }),
    });

    const logs: UserLog[] = data?.resultList || data?.list || [];
    const pagination = data?.paginationInfo;

    const columns: Column<UserLog>[] = [
        {
            header: '발생일자',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-slate-500 tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.occrrncDe || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '서비스명',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary/40" />
                    <span className="font-bold text-slate-700 tracking-tight">{item.svcNm}</span>
                </div>
            )
        },
        {
            header: '메서드명',
            accessor: (item: UserLog) => (
                <code className="px-2 py-1 bg-slate-100 rounded border font-mono text-[10px] text-slate-600">
                    {item.methodNm}
                </code>
            )
        },
        {
            header: '요청자ID',
            accessor: (item: UserLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-white border rounded-full w-fit shadow-sm">
                    <span className="text-xs font-black text-slate-700">{item.rqesterId}</span>
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '등록일시',
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
            <PageHeader title="사용자 로그" breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '사용자 로그' }]} />

            <HubHeader title="행정 이력" highlight="사용자 로그" subtitle="시스템 사용자의 서비스 모듈별 상호작용 및 작업 수행 이력을 명확하게 관리합니다." icon={History} />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                pagination={{
                    currentPage: (params.page번호 || 1) as number,
                    totalPages: data?.totalPage || pagination?.totalPageCount || 1,
                    onPageChange: (page: number) => setParams({ ...params, page번호: page }),
                }}
                search={{
                    placeholder: '서비스명, 요청자 검색...',
                    onSearch: (keyword: string) => setParams({ ...params, searchKeyword: keyword, page번호: 1 }),
                }}
            />
        </div>
    );
};

export default UserLogAdminPage;
