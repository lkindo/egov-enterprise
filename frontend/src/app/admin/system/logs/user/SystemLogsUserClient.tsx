'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import type { PageResponse, UserLog } from '@/types/foundation/system';
import { PageHeader } from '@/app/components/layout/page-header';
import { HubHeader } from '@/components/ui/hub/HubHeader';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { History, Terminal, FileText, Calendar } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const PAGE_SIZE = 10;

type UserLogTableRow = UserLog & { rowKey: string };

const SystemLogsUserClient = () => {
    const [page, setPage] = usePageParam();
    const [searchKeyword, setSearchKeyword] = useState('');

    const { data, isLoading, error, refetch } = useQuery<PageResponse<UserLog>>({
        queryKey: ['admin-logs-user', page, searchKeyword],
        // 서비스가 `pageIndex`(1-base)만 읽는다. 기존 `pageNo` 전달은 무시돼 항상 1페이지가 조회됐다.
        queryFn: () => systemLogAdminService.getUserLogs({
            pageIndex: page,
            size: PAGE_SIZE,
            searchKeyword,
        }),
    });

    const logs: UserLogTableRow[] = (data?.list ?? []).map((item, index) => {
        const keyParts = [item.ocrnYmd, item.dmndUserId, item.srvcNm, item.mthdNm];
        return {
            ...item,
            rowKey: keyParts.every(Boolean) ? keyParts.join(':') : `user-log-${index}`,
        };
    });
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    const columns: Column<UserLogTableRow>[] = [
        {
            header: '발생일자',
            accessor: (item: UserLogTableRow) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    <Calendar size={14} className="opacity-30 text-primary" />
                    {item.ocrnYmd || '-'}
                </div>
            ),
            className: 'w-40'
        },
        {
            header: '서비스설명',
            accessor: (item: UserLogTableRow) => (
                <div className="flex items-center gap-2">
                    <FileText size={14} className="text-primary/40" />
                    <span className="font-bold text-foreground tracking-tight text-left">{item.srvcNm}</span>
                </div>
            )
        },
        {
            header: '메소드명',
            accessor: (item: UserLogTableRow) => (
                <div className="text-left">
                    <code className="px-2 py-1 bg-muted rounded border font-mono text-xs text-muted-foreground">
                        {item.mthdNm}
                    </code>
                </div>
            )
        },
        {
            header: '요청자',
            accessor: (item: UserLogTableRow) => (
                <div className="flex items-center gap-2 px-3 py-1 bg-card border rounded-lg w-fit shadow-sm">
                    <span className="text-xs font-bold text-foreground">{item.userNm || item.dmndUserId}</span>
                </div>
            ),
            className: 'w-40'
        },
        {
            /*
             * [2026-08-05] '등록일시' 컬럼을 행위 카운터로 교체했다.
             * tb_user_log 에는 등록일시 컬럼이 없어 종전 화면은 항상 '-' 를 그렸고, 정작 이 테이블의
             * 값인 카운터 6종(생성·수정·조회·삭제·출력·오류)은 어디에도 표시되지 않았다.
             * 이 로그는 개별 요청 기록이 아니라 사용자×서비스×메서드×일자 집계이므로 카운터가 본체다.
             */
            header: '행위 (생성/수정/조회/삭제/출력/오류)',
            accessor: (item: UserLogTableRow) => (
                <div className="flex items-center gap-1.5 font-mono text-xs tabular-nums">
                    <Terminal size={12} className="opacity-30" />
                    <span className="text-emerald-600 font-bold">{item.crtCnt ?? 0}</span>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-primary font-bold">{item.mdfcnCnt ?? 0}</span>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-muted-foreground font-bold">{item.inqCnt ?? 0}</span>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-rose-500 font-bold">{item.delCnt ?? 0}</span>
                    <span className="text-muted-foreground/40">/</span>
                    <span className="text-muted-foreground font-bold">{item.otptCnt ?? 0}</span>
                    <span className="text-muted-foreground/40">/</span>
                    <span className={(item.errCnt ?? 0) > 0 ? 'text-rose-600 font-black' : 'text-muted-foreground/50 font-bold'}>
                        {item.errCnt ?? 0}
                    </span>
                </div>
            ),
            className: 'w-64'
        }
    ];

    return (
        <div className="space-y-12 pb-24 animate-in fade-in duration-1000">
            <PageHeader
                title="사용자 로그"
                breadcrumbs={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '사용자 로그' }]}
            />

            <HubHeader
                title="활동 이력"
                highlight="사용자 로그"
                subtitle="시스템 사용자의 서비스 모듈별 상호작용 및 작업 수행 이력을 명확하게 관리합니다."
                icon={History}
            />

            <StandardDataTable
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                keyField="rowKey"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    totalCount,
                    pageSize: PAGE_SIZE,
                }}
                search={{
                    placeholder: '요청자명으로 검색..',
                    value: searchKeyword,
                    onSearch: (keyword: string) => { setSearchKeyword(keyword); setPage(1); },
                    onClear: () => { setSearchKeyword(''); setPage(1); },
                }}
            />
        </div>
    );
};

export default SystemLogsUserClient;
