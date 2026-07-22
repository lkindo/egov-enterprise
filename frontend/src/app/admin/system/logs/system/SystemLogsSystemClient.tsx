'use client';

import React, { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService, SysLog } from '@/services/foundation/system/SystemLogAdminService';
import { PageResponse } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { Activity, Clock, Terminal, FileText } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const PAGE_SIZE = 10;

const EXPORT_HEADERS = [
    { label: '요청ID', key: 'dmndId' },
    { label: '발생일자', key: 'ocrnYmd' },
    { label: '서비스설명', key: 'srvcNm' },
    { label: '메소드명', key: 'methodNm' },
    { label: '응답시간(ms)', key: 'prcsTm' },
    { label: '처리구분', key: 'prcsSeCd' },
    { label: '요청자ID', key: 'dmndUserId' },
    { label: '요청자IP', key: 'rqesterIp' },
];

const SystemLogsSystemClient = () => {
    const [page, setPage] = usePageParam();
    const [searchKeyword, setSearchKeyword] = useState('');

    const { data, isLoading, error, refetch } = useQuery<PageResponse<SysLog>>({
        queryKey: ['admin-logs-system', page, searchKeyword],
        queryFn: () => systemLogAdminService.getSystemLogs({
            page: page - 1,
            size: PAGE_SIZE,
            searchWrd: searchKeyword
        }),
    });

    const logs = (data?.list || []) as SysLog[];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    const columns: Column<SysLog>[] = [
        {
            header: '요청ID',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground/50 tabular-nums text-left">
                    <Terminal size={12} className="opacity-30" />
                    {item.dmndId}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '발생일자',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    {item.ocrnYmd || '-'}
                </div>
            ),
            className: 'w-52'
        },
        {
            header: '서비스설명',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary/40" />
                    <span className="font-bold text-foreground tracking-tight text-left">{item.srvcNm}</span>
                </div>
            )
        },
        {
            header: '메소드명',
            accessor: (item: SysLog) => (
                <div className="text-left">
                    <code className="px-2 py-1 bg-muted rounded border font-mono text-xs text-muted-foreground">
                        {item.methodNm}
                    </code>
                </div>
            )
        },
        {
            header: '응답시간',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-1.5 font-bold text-muted-foreground">
                    <Clock size={12} className="opacity-30" />
                    <span className="text-xs">{item.prcsTm || '-'}</span>
                    {item.prcsTm ? <span className="text-xs text-muted-foreground font-medium">ms</span> : null}
                </div>
            ),
            className: 'w-24'
        },
        {
            // 기존 '상태' 열은 데이터와 무관하게 전 행에 SUCCESS 배지를 찍는 거짓 지표였다.
            // SysLogDto 에 성공/실패 필드가 없으므로 실제 값인 처리구분(prcsSeCd)을 노출한다.
            header: '처리구분',
            accessor: (item: SysLog) => (
                <div className="flex items-center justify-center">
                    <span className="px-2 py-0.5 bg-muted text-muted-foreground text-xs font-bold rounded-md border border-border tracking-tighter">
                        {item.prcsSeCd || '-'}
                    </span>
                </div>
            ),
            className: 'w-28'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader
                title="시스템 로그"
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '시스템 로그' }]}
            />

            <HubHeader
                title="시스템 인사이트"
                highlight="시스템 로그"
                subtitle="서버의 실시간 동작 상태와 모듈별 수행 이력을 명확하게 추적합니다."
                icon={Activity}
                actions={
                    /*
                      기존 '실시간 모니터링' 버튼은 onClick 이 없는 死버튼이었다.
                      삭제하고, 이미 검증된 CSV(BOM 포함) 내보내기 자산을 배선한다.
                    */
                    <DataExportExcel
                        data={logs}
                        headers={EXPORT_HEADERS}
                        filename="시스템로그"
                        className="flex items-center gap-2 h-12 px-6 rounded-lg border-2 font-bold text-xs tracking-widest hover:bg-accent transition-colors disabled:opacity-40"
                    />
                }
            />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                keyField="dmndId"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    totalCount,
                    pageSize: PAGE_SIZE,
                }}
                search={{
                    placeholder: '서비스설명, 요청ID 검색..',
                    value: searchKeyword,
                    onSearch: (keyword: string) => { setSearchKeyword(keyword); setPage(1); },
                    onClear: () => { setSearchKeyword(''); setPage(1); },
                }}
            />
        </div>
    );
};

export default SystemLogsSystemClient;
