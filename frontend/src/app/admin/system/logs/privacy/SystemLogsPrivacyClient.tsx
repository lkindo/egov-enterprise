'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import type { PageResponse, PrivacyLog } from '@/types/foundation/system';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PeriodFilter, EMPTY_PERIOD, periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';
import { requestFullExport } from '@/app/components/patterns/full-result-export';
import { exportPrivacyLogsOperation } from '@/types/generated-operations';
import { FileDown } from 'lucide-react';
import { useToast } from '@/app/components/ui/toast';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { Calendar, User, Tag } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const SystemLogsPrivacyClient = () => {
    const [page, setPage] = usePageParam();
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
    const { toast } = useToast();

    const { data, isLoading, error, refetch } = useQuery<PageResponse<PrivacyLog>>({
        queryKey: ['admin-logs-privacy', page, pageSize, searchKeyword, periodToParams(period)],
        // 서비스가 `pageIndex`(1-base)만 읽는다. 기존 `pageNo` 전달은 무시돼 항상 1페이지가 조회됐다.
        queryFn: () => systemLogAdminService.getPrivacyLogs({
            pageIndex: page,
            size: pageSize,
            searchKeyword,
            ...periodToParams(period),
        }),
    });

    const logs = data?.list ?? [];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    /*
     * [2026-08-05] 컬럼을 tb_privacy_log 실물에 맞췄다.
     * 종전 컬럼(로그ID·대상명·대상구분·처리구분·요청자ID·등록일시)은 백엔드에 존재하지 않는
     * 필드를 참조하고 있어 어떤 값도 그릴 수 없었다. 실제 컬럼은 요청ID·조회일시·서비스명·
     * 조회대상정보·조회자ID·조회자IP 다.
     */

    /** 전체 결과 xlsx 요청. 상한 초과는 다운로드를 시작하지 않고 즉시 알린다(서버도 같은 상한으로 400). */
    const handleFullExport = () => {
        requestFullExport({
            operation: exportPrivacyLogsOperation,
            totalCount,
            searchKeyword,
            period,
            onTooMany: (message) => toast(message, 'error'),
        });
    };

    const columns: Column<PrivacyLog>[] = [
        {
            header: '조회일시',
            // 현재 페이지 범위 클라이언트 정렬(opt-in) — 원시 ISO 문자열이 정렬 키다.
            sortKey: 'inqDt',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    <Calendar size={14} className="opacity-30" />
                    {item.inqDt ? item.inqDt.replace('T', ' ').substring(0, 19) : '-'}
                </div>
            ),
            className: 'w-48'
        },
        {
            header: '조회 대상 정보',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <User size={14} className="text-primary/40" />
                    <span className="font-bold text-foreground">{item.inqInfo || '-'}</span>
                </div>
            )
        },
        {
            header: '서비스명',
            sortKey: 'srvcNm',
            accessor: (item: PrivacyLog) => (
                <div className="flex items-center gap-2">
                    <Tag size={12} className="text-primary/40" />
                    <code className="px-2 py-0.5 bg-hub-purple/10 text-hub-purple text-xs font-bold rounded border border-hub-purple/20">
                        {item.srvcNm}
                    </code>
                </div>
            )
        },
        {
            header: '조회자',
            sortKey: 'dmndUserId',
            accessor: (item: PrivacyLog) => (
                <div className="px-3 py-1 bg-card border rounded-lg w-fit shadow-sm text-xs font-bold text-foreground">
                    {item.dmndUserId}
                </div>
            ),
            className: 'w-36'
        },
        {
            header: '조회자 IP',
            accessor: (item: PrivacyLog) => (
                <div className="font-mono text-xs font-bold text-muted-foreground/70 tabular-nums">
                    {item.dmndUserIpAddr || '-'}
                </div>
            ),
            className: 'w-40'
        }
    ];

    return (
        <WorkListPage
            title="개인정보 접근 로그"
            description="개인정보 접근 및 처리 이력을 조회일시 최신순으로 추적합니다."
            breadcrumbItems={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '개인정보 접근 로그' }]}
            filterStateKey="system-logs-privacy"
            // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
            totalCount={error ? undefined : totalCount}
            toolbarActions={
                /* 전체 결과 xlsx — 서버 스트리밍 export. 조건 일치 전량이라 현재 페이지 반출과 다르다. */
                <button
                    type="button"
                    onClick={handleFullExport}
                    className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-primary/40 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                >
                    <FileDown size={16} aria-hidden="true" />
                    전체 결과 엑셀 다운로드
                </button>
            }
            filter={
                <KeywordFilter
                    label="조회 대상 정보"
                    placeholder="조회 대상 정보로 검색"
                    value={searchKeyword}
                    onSearch={(keyword) => { setSearchKeyword(keyword); setPage(1); }}
                >
                    <PeriodFilter
                        label="조회 기간(조회일시)"
                        value={period}
                        onChange={(next) => { setPeriod(next); setPage(1); }}
                    />
                </KeywordFilter>
            }
        >
            <StandardDataTable
                accessibleLabel="개인정보 접근 로그 목록"
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                emptyMessage={emptyResultMessage(searchKeyword, '조회된 개인정보 접근 로그가 없습니다.')}
                keyField="prvcLogSn"
                pagination={{
                    currentPage: page,
                    totalPages: totalPageCount,
                    onPageChange: setPage,
                    // totalCount 는 셸 툴바가 소유한다(표 하단 중복 표기 방지).
                    pageSize,
                    // 페이지 크기 변경 시 1페이지로 복귀 — 줄어든 총 페이지 밖에 남지 않게 한다.
                    onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
                    pageSizeOptions: PAGE_SIZE_OPTIONS,
                }}
            />
        </WorkListPage>
    );
};

export default SystemLogsPrivacyClient;
