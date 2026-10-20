'use client';

import { useId, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Download } from 'lucide-react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { PeriodFilter, EMPTY_PERIOD, hasAppliedPeriod, type PeriodValue } from '@/app/components/patterns/period-filter';
import { MAX_EXPORT_ROWS } from '@/app/components/patterns/full-result-export';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { StandardModal } from '@/app/components/ui/standard-modal';
import { useToast } from '@/app/components/ui/toast';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { navigateToDownload } from '@/lib/navigation/full-result-download';
import { exportAuditJournalOperation } from '@/types/generated-operations';
import { operationsRecordAdminService, type AuditJournalEntry } from '@/services/foundation/system/OperationsRecordAdminService';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

/** 내보내기 사유 길이 — 서버 감사 경계(SensitiveAuditInterceptor)와 같다. 서버가 최종 판정자다. */
export const EXPORT_REASON_MIN = 2;
export const EXPORT_REASON_MAX = 200;

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

/** 서버와 같은 정규화 — 제어 문자는 공백으로 바꾸고 앞뒤 공백은 지운다. */
export function normalizeExportReason(value: string): string {
  let normalized = '';
  for (const character of value) {
    const code = character.charCodeAt(0);
    normalized += code < 0x20 || code === 0x7f ? ' ' : character;
  }
  return normalized.trim();
}

/**
 * 민감 작업 감사 원장(2026-10-01 결정 19).
 *
 * 비밀번호 초기화·권한 변경·개인정보 조회처럼 민감한 작업은 요청마다 원장에 단계별로 남는다. 종전에는 읽을
 * 화면이 없어 DB 를 직접 열어야 했다. 열람 권한(ADT_LOG_READ)은 기본 그룹에 없고, 이 화면을 연 것도 원장에
 * 남는다.
 *
 * [2026-10-20] 작업 종류 조건과 전체 결과 내보내기를 더했다. 작업 종류는 원장에 실제로 남은 작업 이름이다.
 * 내보내기는 목록과 같은 조건(행위자·작업·기간)으로 서버가 전량을 xlsx 로 만든다 — 사유가 필수이고, 내보내기와
 * 사유가 원장에 남는다. 권한은 열람과 같은 ADT_LOG_READ 다.
 */
export default function AuditJournalClient() {
  const { toast } = useToast();
  const operationId = useId();
  const reasonId = useId();
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const [actorId, setActorId] = useState('');
  const [operation, setOperation] = useState('');
  const [period, setPeriod] = useState<PeriodValue>(EMPTY_PERIOD);
  const [exportOpen, setExportOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [reasonError, setReasonError] = useState<string | null>(null);
  const appliedPeriod = period.from && period.to ? { fromDate: period.from, toDate: period.to } : {};

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-audit-journal', page, pageSize, actorId, operation, appliedPeriod.fromDate ?? '', appliedPeriod.toDate ?? ''],
    queryFn: () => operationsRecordAdminService.getAuditJournal({
      actorId, ...(operation ? { operation } : {}), ...appliedPeriod, page, size: pageSize,
    }),
  });
  const { data: operations = [] } = useQuery({
    queryKey: ['admin-audit-journal-operations'],
    queryFn: () => operationsRecordAdminService.getAuditJournalOperations(),
  });
  const total = data?.total ?? 0;
  // 고른 값이 원장에서 사라져도(보존 정리) 선택지에서 빠지지 않게 지금 값을 남긴다.
  const operationOptions = operation && !operations.includes(operation) ? [operation, ...operations] : operations;
  const emptyMessage = actorId
    ? emptyResultMessage(actorId, '')
    : operation || hasAppliedPeriod(period)
      ? '선택한 조건에 해당하는 기록이 없습니다. 조건을 넓히거나 초기화해 보세요.'
      : '기록된 민감 작업이 없습니다.';

  const columns: Column<AuditJournalEntry>[] = [
    { header: '일시', accessor: (row) => <span className="font-mono text-xs tabular-nums">{formatDateTime(row.occurredAt)}</span>, className: 'w-44' },
    {
      header: '작업',
      // 설명은 사람이 읽는 작업 이름(내보내기는 사유 포함)이고, 작업 이름은 조건 검색의 값이다.
      accessor: (row) => (
        <div className="flex flex-col gap-0.5">
          {row.description ? <span className="text-sm text-foreground">{row.description}</span> : null}
          <code className="text-xs font-semibold text-muted-foreground">{row.operation ?? '-'}</code>
        </div>
      ),
    },
    { header: '단계', accessor: (row) => (row.stage ? STAGE_LABELS[row.stage] ?? row.stage : '-'), className: 'w-24' },
    { header: '행위자', accessor: (row) => row.actorId ?? '-', className: 'w-32' },
    { header: '대상', accessor: (row) => row.targetId ?? '-', className: 'w-36' },
    { header: '접속 IP', accessor: (row) => <span className="font-mono text-xs tabular-nums">{row.clientIp ?? '-'}</span>, className: 'w-36' },
    { header: '응답', accessor: (row) => (row.httpStatus ?? '-'), className: 'w-16' },
  ];

  const openExport = () => {
    if (total > MAX_EXPORT_ROWS) {
      toast(`전체 결과가 ${total.toLocaleString('ko-KR')}건으로 내보내기 상한(${MAX_EXPORT_ROWS.toLocaleString('ko-KR')}건)을 넘습니다. 조건이나 기간을 좁혀 다시 시도하세요.`, 'error');
      return;
    }
    setReason('');
    setReasonError(null);
    setExportOpen(true);
  };

  const submitExport = () => {
    const normalized = normalizeExportReason(reason);
    if (normalized.length < EXPORT_REASON_MIN || normalized.length > EXPORT_REASON_MAX) {
      setReasonError(`사유를 ${EXPORT_REASON_MIN}~${EXPORT_REASON_MAX}자로 입력하세요.`);
      return;
    }
    // 화면에서 좁힌 조건과 같은 조건을 싣는다 — 다르면 파일과 화면이 어긋난다.
    navigateToDownload(exportAuditJournalOperation, {
      ...(actorId ? { actorId } : {}),
      ...(operation ? { operation } : {}),
      ...appliedPeriod,
      reason: normalized,
    });
    setExportOpen(false);
    toast('내보내기를 요청했습니다. 내보내기와 사유는 감사 원장에 남습니다.', 'success');
  };

  return (
    <WorkListPage
      title="민감 작업 감사 원장"
      description="비밀번호 초기화·권한 변경·개인정보 조회 같은 민감 작업을 요청 단계별로 최신순 표시합니다. 이 화면의 열람과 내보내기도 원장에 남습니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '로그관리' }, { label: '민감 작업 감사 원장' }]}
      filterStateKey="system-logs-audit"
      totalCount={error ? undefined : total}
      actions={
        <Button type="button" variant="outline" size="sm" className="gap-2" onClick={openExport} disabled={Boolean(error) || isLoading}>
          <Download size={16} aria-hidden="true" /> 전체 결과 내보내기
        </Button>
      }
      filter={
        <KeywordFilter
          label="행위자 로그인 ID"
          placeholder="로그인 ID를 정확히 입력"
          value={actorId}
          onSearch={(keyword) => { setActorId(keyword.trim()); setPage(1); }}
          onReset={() => { setActorId(''); setOperation(''); setPeriod(EMPTY_PERIOD); setPage(1); }}
        >
          <div className="space-y-1">
            <label htmlFor={operationId} className="text-[length:var(--font-size-body)] font-medium">작업 종류</label>
            <select
              id={operationId}
              value={operation}
              onChange={(event) => { setOperation(event.target.value); setPage(1); }}
              className="block h-[var(--control-h)] max-w-xs rounded-md border border-input bg-background px-3 text-sm"
            >
              <option value="">전체 작업</option>
              {operationOptions.map((name) => <option key={name} value={name}>{name}</option>)}
            </select>
          </div>
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
        emptyMessage={emptyMessage}
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

      <StandardModal
        isOpen={exportOpen}
        onClose={() => setExportOpen(false)}
        title="감사 원장 내보내기"
        maxWidth="lg"
        footer={
          <div className="flex w-full justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setExportOpen(false)}>취소</Button>
            <Button type="submit" form={`${reasonId}-export-form`} className="gap-2">
              <Download size={16} aria-hidden="true" /> 내보내기
            </Button>
          </div>
        }
      >
        <form
          id={`${reasonId}-export-form`}
          noValidate
          className="space-y-3 pt-2"
          onSubmit={(event) => { event.preventDefault(); submitExport(); }}
        >
          <p className="text-sm text-muted-foreground">
            지금 조건에 맞는 {total.toLocaleString('ko-KR')}건을 xlsx 파일로 내려받습니다. 내보내기와 그 사유는 감사 원장에 남습니다.
          </p>
          <div className="space-y-1">
            <label htmlFor={reasonId} className="text-sm font-medium">내보내기 사유</label>
            <Textarea
              id={reasonId}
              value={reason}
              maxLength={EXPORT_REASON_MAX}
              rows={3}
              aria-invalid={reasonError ? true : undefined}
              aria-describedby={reasonError ? `${reasonId}-hint ${reasonId}-error` : `${reasonId}-hint`}
              onChange={(event) => { setReason(event.target.value); if (reasonError) setReasonError(null); }}
            />
            <p id={`${reasonId}-hint`} className="text-xs text-muted-foreground">
              {EXPORT_REASON_MIN}~{EXPORT_REASON_MAX}자. 예: 월간 접속기록 점검. 사유는 원장에 그대로 남으므로 개인정보를 적지 마세요.
            </p>
            {reasonError ? <p id={`${reasonId}-error`} role="alert" className="text-xs text-destructive">{reasonError}</p> : null}
          </div>
        </form>
      </StandardModal>
    </WorkListPage>
  );
}
