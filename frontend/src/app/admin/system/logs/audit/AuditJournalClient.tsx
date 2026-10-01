'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PeriodFilter, EMPTY_PERIOD, hasAppliedPeriod, type PeriodValue } from '@/app/components/patterns/period-filter';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { operationsRecordAdminService, type AuditJournalEntry } from '@/services/foundation/system/OperationsRecordAdminService';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

/** 원장의 단계 이름을 사람이 읽는 말로 옮긴다. 모르는 값은 원문으로 보인다. */
const STAGE_LABELS: Record<string, string> = {
  ATTEMPTED: '시도',
  PREPARED: '응답 준비',
  COMMITTED: '반영',
  SUCCEEDED: '성공',
  FAILED: '실패',
  DENIED: '거부',
  INTERRUPTED: '중단',
  NOT_MODIFIED: '변경 없음',
};

const formatDateTime = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 19) : '-');

/**
 * 민감 작업 감사 원장(2026-10-01 결정 19).
 *
 * 비밀번호 초기화·권한 변경·개인정보 조회처럼 민감한 작업은 요청마다 원장에 단계별로 남는다. 종전에는 읽을
 * 화면이 없어 DB 를 직접 열어야 했다. 열람 권한(ADT_LOG_READ)은 기본 그룹에 없고, 이 화면을 연 것도 원장에
 * 남는다.
 */
export default function AuditJournalClient() {
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [actorId, setActorId] = useState('');
  const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
  const appliedPeriod = period.from && period.to ? { fromDate: period.from, toDate: period.to } : {};

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-audit-journal', page, pageSize, actorId, appliedPeriod.fromDate ?? '', appliedPeriod.toDate ?? ''],
    queryFn: () => operationsRecordAdminService.getAuditJournal({ actorId, ...appliedPeriod, page: page - 1, size: pageSize }),
  });
  const total = data?.total ?? 0;

  const columns: Column<AuditJournalEntry>[] = [
    { header: '일시', accessor: (row) => <span className="font-mono text-xs tabular-nums">{formatDateTime(row.occurredAt)}</span>, className: 'w-44' },
    { header: '작업', accessor: (row) => <code className="text-xs font-semibold">{row.operation ?? '-'}</code> },
    { header: '단계', accessor: (row) => (row.stage ? STAGE_LABELS[row.stage] ?? row.stage : '-'), className: 'w-24' },
    { header: '행위자', accessor: (row) => row.actorId ?? '-', className: 'w-32' },
    { header: '대상', accessor: (row) => row.targetId ?? '-', className: 'w-36' },
    { header: '접속 IP', accessor: (row) => <span className="font-mono text-xs tabular-nums">{row.clientIp ?? '-'}</span>, className: 'w-36' },
    { header: '응답', accessor: (row) => (row.httpStatus ?? '-'), className: 'w-16' },
  ];

  return (
    <WorkListPage
      title="민감 작업 감사 원장"
      description="비밀번호 초기화·권한 변경·개인정보 조회 같은 민감 작업을 요청 단계별로 최신순 표시합니다. 이 화면의 열람도 원장에 남습니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '민감 작업 감사 원장' }]}
      filterStateKey="system-logs-audit"
      totalCount={error ? undefined : total}
      filter={
        <KeywordFilter
          label="행위자 로그인 ID"
          placeholder="로그인 ID를 정확히 입력"
          value={actorId}
          onSearch={(keyword) => { setActorId(keyword.trim()); setPage(1); }}
          onReset={() => { setActorId(''); setPeriod(EMPTY_PERIOD); setPage(1); }}
        >
          <PeriodFilter label="기간(작업 일시)" value={period} onChange={(next) => { setPeriod(next); setPage(1); }} />
        </KeywordFilter>
      }
    >
      <StandardDataTable
        accessibleLabel="민감 작업 감사 원장"
        columns={columns}
        data={data?.list ?? []}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyMessage={emptyResultMessage(actorId, '기록된 민감 작업이 없습니다.', hasAppliedPeriod(period))}
        keyField="id"
        pagination={{
          currentPage: page,
          totalPages: Math.max(1, Math.ceil(total / pageSize)),
          onPageChange: setPage,
          pageSize,
          onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
      />
    </WorkListPage>
  );
}
