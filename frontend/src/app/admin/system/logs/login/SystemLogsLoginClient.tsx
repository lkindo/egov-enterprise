'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import type { LoginLog, PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { KeyRound, Terminal, Calendar, Globe } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const PAGE_SIZE = 10;

const EXPORT_HEADERS = [
    { label: '로그ID', key: 'logId' },
    { label: '발생시점', key: 'creatDt' },
    { label: '사용자ID', key: 'loginId' },
    { label: '접속IP', key: 'loginIp' },
    { label: '구분', key: 'loginMthd' },
    { label: '오류여부', key: 'errOccrrAt' },
    { label: '오류코드', key: 'errorCode' },
];

const SystemLogsLoginClient = () => {
    const [page, setPage] = usePageParam();
    const [searchKeyword, setSearchKeyword] = useState('');

    const { data, isLoading, error, refetch } = useQuery<PageResponse<LoginLog>>({
        queryKey: ['admin-logs-login', page, searchKeyword],
        queryFn: () => systemLogAdminService.getLoginLogs({
            page: page - 1,
            size: PAGE_SIZE,
            searchWrd: searchKeyword
        }),
    });

    const logs = data?.list ?? [];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

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
            header: '사용자ID',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-card border rounded-lg w-fit shadow-sm">
                    <span className="text-xs font-bold text-foreground">{item.loginId || '-'}</span>
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '접속IP',
            accessor: (item: LoginLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/80 tabular-nums">
                    <Globe size={12} className="opacity-30" />
                    {item.loginIp || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '구분',
            accessor: (item: LoginLog) => (
                <div className="flex items-center justify-center">
                    <span className={`px-2 py-0.5 rounded-md text-xs font-bold border tracking-tighter ${
                        item.loginMthd === 'LOGIN' ? 'bg-hub-indigo/10 text-hub-indigo border-hub-indigo/20' : 'bg-muted text-muted-foreground border-border'
                    }`}>
                        {item.loginMthd || '-'}
                    </span>
                </div>
            ),
            className: 'w-24'
        },
        {
            // 계약에 존재하는 실제 값(errOccrrAt/errorCode)만 표기한다.
            header: '오류',
            accessor: (item: LoginLog) => (
                <div className="flex items-center justify-center">
                    {item.errOccrrAt === 'Y' ? (
                        <span className="px-2 py-0.5 rounded-md text-xs font-bold border bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20">
                            {item.errorCode || '오류'}
                        </span>
                    ) : (
                        <span className="text-xs font-bold text-muted-foreground/50">-</span>
                    )}
                </div>
            ),
            className: 'w-28'
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
                actions={
                    <DataExportExcel
                        data={logs}
                        headers={EXPORT_HEADERS}
                        filename="로그인로그"
                        className="flex items-center gap-2 h-12 px-6 rounded-lg border-2 font-bold text-xs tracking-widest hover:bg-accent transition-colors"
                    />
                }
            />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                keyField="logId"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    totalCount,
                    pageSize: PAGE_SIZE,
                }}
                search={{
                    placeholder: '사용자ID, 접속IP 검색..',
                    value: searchKeyword,
                    onSearch: (keyword: string) => { setSearchKeyword(keyword); setPage(1); },
                    onClear: () => { setSearchKeyword(''); setPage(1); },
                }}
            />
        </div>
    );
};

export default SystemLogsLoginClient;
