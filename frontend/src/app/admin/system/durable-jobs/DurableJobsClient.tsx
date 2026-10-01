'use client';

import { useRef, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { RotateCcw } from 'lucide-react';
import { WorkListPage } from '@/app/components/patterns/work-list-page';
import { StandardDataTable, type Column } from '@/app/components/ui/standard-data-table';
import { Button } from '@/components/ui/button';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { operationsRecordAdminService, type DurableJobStatus } from '@/services/foundation/system/OperationsRecordAdminService';

const PAGE_SIZE_OPTIONS = [20, 50, 100];

const TYPE_LABELS: Record<string, string> = {
  NOTIFICATION_DELIVERY: '알림 전달',
  FILE_DELETE: '첨부 파일 삭제',
};

const STATUS_LABELS: Record<string, string> = {
  PENDING: '대기',
  RUNNING: '실행 중',
  SUCCEEDED: '완료',
  FAILED: '실패',
};

const formatDateTime = (value?: string | null) => (value ? value.replace('T', ' ').slice(0, 19) : '-');

/**
 * 후속 작업 상태(2026-10-01 결정 19).
 *
 * 알림 전달·첨부 파일 삭제처럼 업무 처리 뒤에 이어지는 작업은 최대 8회까지 다시 시도하고, 그래도 실패하면
 * '실패' 로 멈춘다. 종전에는 그 실패를 볼 화면도 다시 처리할 방법도 없었다. 재처리는 실패한 작업만, 권한
 * DWORK_RETRY 가 있을 때만 할 수 있고 원장에 남는다. 작업 내용(본문·수신자)은 보이지 않는다.
 */
export default function DurableJobsClient() {
  const { user } = useAuth();
  const { toast } = useToast();
  const confirm = useConfirm();
  const canRetry = canPermission(user, 'DWORK_RETRY');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(PAGE_SIZE_OPTIONS[0]);
  const retryLockRef = useRef(false);
  const [pendingRetryId, setPendingRetryId] = useState<string | null>(null);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['admin-durable-jobs', page, pageSize],
    queryFn: () => operationsRecordAdminService.getDurableJobs(page - 1, pageSize),
  });
  const total = data?.total ?? 0;

  const handleRetry = async (job: DurableJobStatus) => {
    if (!job.id || retryLockRef.current) return;
    retryLockRef.current = true;
    try {
      const ok = await confirm({
        title: '후속 작업 다시 처리',
        message: `${TYPE_LABELS[job.type ?? ''] ?? job.type ?? '작업'} 작업(번호 ${job.id})을 처음부터 다시 시도합니다. 시도 횟수는 0으로 돌아갑니다.`,
        confirmText: '다시 처리',
      });
      if (!ok) return;
      setPendingRetryId(job.id);
      await operationsRecordAdminService.retryDurableJob(job.id);
      toast('작업을 다시 처리 대기로 돌렸습니다.', 'success');
      await refetch();
    } catch (retryError: unknown) {
      toast(extractErrorMessage(retryError, '작업을 다시 처리하지 못했습니다.'), 'error');
    } finally {
      retryLockRef.current = false;
      setPendingRetryId(null);
    }
  };

  const columns: Column<DurableJobStatus>[] = [
    { header: '번호', accessor: (row) => <span className="font-mono text-xs tabular-nums">{row.id ?? '-'}</span>, className: 'w-24' },
    { header: '작업', accessor: (row) => (row.type ? TYPE_LABELS[row.type] ?? row.type : '-') },
    {
      header: '상태',
      accessor: (row) => (row.status === 'FAILED'
        ? <span className="rounded bg-destructive/10 px-1.5 py-0.5 text-xs font-semibold text-destructive-emphasis">실패</span>
        : (row.status ? STATUS_LABELS[row.status] ?? row.status : '-')),
      className: 'w-24',
    },
    { header: '시도 횟수', accessor: (row) => (row.attempts ?? '-'), className: 'w-20' },
    { header: '다음 시도', accessor: (row) => <span className="font-mono text-xs tabular-nums">{formatDateTime(row.availableAt)}</span>, className: 'w-44' },
    { header: '완료', accessor: (row) => <span className="font-mono text-xs tabular-nums">{formatDateTime(row.completedAt)}</span>, className: 'w-44' },
    ...(canRetry ? [{
      header: '처리',
      accessor: (row: DurableJobStatus) => (row.status === 'FAILED' ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="gap-1"
          disabled={pendingRetryId !== null}
          aria-busy={pendingRetryId === row.id || undefined}
          onClick={() => void handleRetry(row)}
        >
          <RotateCcw size={14} aria-hidden="true" /> 다시 처리
        </Button>
      ) : null),
      className: 'w-28',
    }] : []),
  ];

  return (
    <WorkListPage
      title="후속 작업 상태"
      description="알림 전달·첨부 파일 삭제처럼 업무 처리 뒤에 이어지는 작업의 상태를 최신순으로 표시합니다. 여러 번 시도해도 실패한 작업은 다시 처리할 수 있습니다."
      breadcrumbItems={[{ label: '시스템관리' }, { label: '후속 작업 상태' }]}
      totalCount={error ? undefined : total}
    >
      <StandardDataTable
        accessibleLabel="후속 작업 목록"
        columns={columns}
        data={data?.list ?? []}
        loading={isLoading}
        error={error}
        onRetry={() => refetch()}
        emptyMessage="기록된 후속 작업이 없습니다."
        keyField="id"
        pagination={{
          currentPage: page,
          totalPages: Math.max(1, data?.totalPages ?? 1),
          onPageChange: setPage,
          pageSize,
          onPageSizeChange: (size: number) => { setPageSize(size); setPage(1); },
          pageSizeOptions: PAGE_SIZE_OPTIONS,
        }}
      />
    </WorkListPage>
  );
}
