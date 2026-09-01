'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { systemLogAdminService } from '@/services/foundation/system/SystemLogAdminService';
import type { PageResponse, SysLog } from '@/types/foundation/system';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PeriodFilter, EMPTY_PERIOD, periodToParams, type PeriodValue } from '@/app/components/patterns/period-filter';
import { requestFullExport } from '@/app/components/patterns/full-result-export';
import { exportSystemLogsOperation } from '@/types/generated-operations';
import { FileDown } from 'lucide-react';
import { useToast } from '@/app/components/ui/toast';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { DataExportExcel } from '@/app/components/ui/data-export-excel';
import { Clock, Terminal, FileText } from 'lucide-react';
import { usePageParam } from '../use-log-url-state';

const DEFAULT_PAGE_SIZE = 10;
const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

const EXPORT_HEADERS = [
    { label: '시스템 로그 일련번호', key: 'sysLogSn' },
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
    const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
    const [searchKeyword, setSearchKeyword] = useState('');
    const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
    const { toast } = useToast();

    const { data, isLoading, error, refetch } = useQuery<PageResponse<SysLog>>({
        queryKey: ['admin-logs-system', page, pageSize, searchKeyword, periodToParams(period)],
        queryFn: () => systemLogAdminService.getSystemLogs({
            page: page - 1,
            size: pageSize,
            searchWrd: searchKeyword,
            ...periodToParams(period),
        }),
    });

    const logs = data?.list ?? [];
    const totalPageCount = data?.totalPage || 1;
    const totalCount = Number(data?.total || 0);

    /** 전체 결과 xlsx 요청. 상한 초과는 다운로드를 시작하지 않고 즉시 알린다(서버도 같은 상한으로 400). */
    const handleFullExport = () => {
        requestFullExport({
            operation: exportSystemLogsOperation,
            totalCount: totalCount,
            searchKeyword,
            period,
            onTooMany: (message) => toast(message, 'error'),
        });
    };


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
            // 현재 페이지 범위 클라이언트 정렬(opt-in) — YYYYMMDD 문자열이 정렬 키다.
            sortKey: 'ocrnYmd',
            accessor: (item: SysLog) => (
                <div className="flex items-center gap-2 font-mono text-xs font-bold text-muted-foreground tabular-nums">
                    {item.ocrnYmd || '-'}
                </div>
            ),
            className: 'w-52'
        },
        {
            header: '서비스설명',
            sortKey: 'srvcNm',
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
            sortKey: 'prcsSeCd',
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
        <WorkListPage
            title="시스템 로그"
            description="서버 동작 상태와 모듈별 수행 이력을 발생일자 최신순으로 조회합니다."
            breadcrumbItems={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '시스템 로그' }]}
            filterStateKey="system-logs-system"
            // 조회 실패 시 총 건수는 0 이 아니라 '알 수 없음'이다.
            totalCount={error ? undefined : totalCount}
            filter={
                <KeywordFilter
                    label="서비스 설명 · 요청ID"
                    placeholder="서비스설명, 요청ID 검색"
                    value={searchKeyword}
                    onSearch={(keyword: string) => { setSearchKeyword(keyword); setPage(1); }}
                >
                    <PeriodFilter
                        label="조회 기간(발생일자)"
                        value={period}
                        onChange={(next) => { setPeriod(next); setPage(1); }}
                    />
                </KeywordFilter>
            }
            toolbarActions={
                <div className="flex items-center gap-2">
                    {/* 종전 '실시간 모니터링' 버튼은 onClick 이 없는 死버튼이라 삭제하고,
                        검증된 CSV(BOM 포함) 반출을 배선했다. 이쪽은 현재 페이지 범위다. */}
                    <DataExportExcel
                        scope="page"
                        data={logs}
                        headers={EXPORT_HEADERS}
                        filename="시스템로그"
                        className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-border px-3 text-xs font-bold text-muted-foreground transition-colors hover:text-primary disabled:opacity-40"
                    />

                    {/* 전체 결과 xlsx — 서버 스트리밍 export. 조건 일치 전량이라 위 버튼과 범위가 다르다. */}
                    <button
                        type="button"
                        onClick={handleFullExport}
                        className="flex h-[var(--control-h-sm)] items-center gap-2 rounded-md border border-primary/40 px-3 text-xs font-bold text-primary transition-colors hover:bg-primary/5"
                    >
                        <FileDown size={16} aria-hidden="true" />
                        전체 결과 엑셀 다운로드
                    </button>
                </div>
            }
        >
            <StandardDataTable
                accessibleLabel="시스템 로그 목록"
                columns={columns}
                data={logs}
                loading={isLoading}
                error={error}
                onRetry={() => refetch()}
                emptyMessage={emptyResultMessage(searchKeyword, '조회된 시스템 로그가 없습니다.')}
                keyField="sysLogSn"
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

export default SystemLogsSystemClient;
