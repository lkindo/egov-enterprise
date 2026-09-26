'use client';

import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { CheckCheck, ExternalLink, RefreshCw, Trash2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { StandardDataTable, Column } from '@/app/components/ui/standard-data-table';
import { KeywordFilter } from '@/app/components/patterns/keyword-filter';
import { emptyResultMessage } from '@/app/components/patterns/empty-result-message';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { useToast } from '@/app/components/ui/toast';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { normalizeNotification, type Notification } from '@/lib/hooks/use-notifications';
import { announceNotificationsChanged, subscribeNotificationsChanged } from '@/lib/notifications/notification-sync';
import {
  deleteNotificationOperation,
  getNotificationsOperation,
  getUnreadCountOperation,
  markAllAsReadOperation,
  markAsReadOperation,
} from '@/types/generated-operations';

/**
 * 알림 센터 목록 — 받은 알림을 서버 페이지로 조회하고, 행에서 이동·읽음·삭제를 한다.
 *
 * [2026-09-26 DIP B4 P2] 종전에는 헤더 드로어와 같은 실시간 훅(useNotifications)을 한 벌 더 띄워 **드로어가 불러온 첫
 * 10건만** 보여 주고, 검색·탭도 그 10건 안에서만 걸렀다(11번째 알림은 어떤 경로로도 볼 수 없었다). 같은 개인 큐를
 * 두 번 구독하고 60초 폴링도 두 벌 돌았다. 이제 실시간 구독은 헤더 한 곳만 갖고, 이 화면은 서버 페이지·검색어·
 * 읽음 조건으로 조회한다. 양쪽의 읽음·삭제·새 알림은 notification-sync 신호로 서로 다시 읽는다.
 *
 * '보안 알림' 탭은 걷었다 — 서버가 분류를 저장하지 않고 제목 키워드로 추론한 값이라 서버 조건으로 거를 수 없고,
 * 페이지 안에서 거르면 다시 '불러온 범위만' 보는 화면이 된다. 제목에 '보안' 이 든 알림은 검색으로 찾는다.
 */
type ReadFilter = 'all' | 'unread';

const READ_FILTERS: ReadonlyArray<{ id: ReadFilter; label: string }> = [
  { id: 'all', label: '전체 알림' },
  { id: 'unread', label: '읽지 않은 알림' },
];

const QUERY_ROOT = ['notifications', 'center'] as const;

function kindLabel(type: Notification['type']): string {
  return type === 'SECURITY' ? '보안' : type === 'SYSTEM' ? '시스템' : type === 'INFO' ? '안내' : '활동';
}

export function SmartNotificationHub() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const confirm = useConfirm();
  const { toast } = useToast();
  const [readFilter, setReadFilter] = useState<ReadFilter>('all');
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  /** 한 번에 한 가지 변경만 보낸다 — 같은 틱의 중복 클릭도 막는다(동기 잠금). */
  const actionLockRef = useRef(false);
  const [pendingAction, setPendingAction] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: [...QUERY_ROOT, 'list', readFilter, keyword, page, pageSize],
    queryFn: async () => {
      const response = await executeGeneratedOperation(getNotificationsOperation, {
        query: {
          ...(keyword ? { searchWrd: keyword } : {}),
          ...(readFilter === 'unread' ? { readYn: 'N' } : {}),
          page: page - 1,
          size: pageSize,
        },
      });
      const items: Notification[] = [];
      for (const candidate of Array.isArray(response.list) ? response.list : []) {
        const item = normalizeNotification(candidate);
        if (!item) throw new Error('알림 응답 형식이 올바르지 않습니다.');
        items.push(item);
      }
      return { items, total: typeof response.total === 'number' ? response.total : items.length };
    },
  });
  const unreadQuery = useQuery({
    queryKey: [...QUERY_ROOT, 'unread-count'],
    queryFn: () => executeGeneratedOperation(getUnreadCountOperation, {}),
  });

  // 헤더에서 읽음·삭제·새 알림이 생기면 다시 읽는다. 이 화면은 스스로 구독·폴링하지 않는다.
  useEffect(() => subscribeNotificationsChanged('center', () => {
    void queryClient.invalidateQueries({ queryKey: QUERY_ROOT });
  }), [queryClient]);

  const items = listQuery.data?.items ?? [];
  const total = listQuery.data?.total ?? 0;
  const unreadCount = typeof unreadQuery.data === 'number' ? unreadQuery.data : null;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const runAction = async (key: string, action: () => Promise<void>, failure: string) => {
    if (actionLockRef.current) return;
    actionLockRef.current = true;
    setPendingAction(key);
    try {
      await action();
      announceNotificationsChanged('center');
      await queryClient.invalidateQueries({ queryKey: QUERY_ROOT });
    } catch (error) {
      toast(extractErrorMessage(error, failure), 'error');
    } finally {
      actionLockRef.current = false;
      setPendingAction(null);
    }
  };

  const handleMarkRead = (item: Notification) => runAction(`read:${item.notiSn}`, async () => {
    await executeGeneratedOperation(markAsReadOperation, { path: { notiSn: item.notiSn } });
  }, '알림을 읽음 처리하지 못했습니다.');

  const handleDelete = async (item: Notification) => {
    if (actionLockRef.current) return;
    const confirmed = await confirm({
      title: '알림 삭제',
      message: `'${item.notiTtlNm}' 알림을 삭제합니다. 되돌릴 수 없습니다.`,
      confirmText: '삭제',
      variant: 'destructive',
    });
    if (!confirmed) return;
    await runAction(`delete:${item.notiSn}`, async () => {
      await executeGeneratedOperation(deleteNotificationOperation, { path: { notiSn: item.notiSn } });
      toast('알림을 삭제했습니다.', 'success');
    }, '알림을 삭제하지 못했습니다.');
  };

  const handleMarkAllRead = () => runAction('read-all', async () => {
    const updated = await executeGeneratedOperation(markAllAsReadOperation, {});
    toast(typeof updated === 'number' ? `알림 ${updated}건을 읽음 처리했습니다.` : '알림을 모두 읽음 처리했습니다.', 'success');
  }, '알림을 모두 읽음 처리하지 못했습니다.');

  /** 목적지가 있는 알림은 읽음 처리 뒤 이동한다. 읽음 처리가 실패해도 이동은 막지 않는다. */
  const openNotification = async (item: Notification) => {
    if (!item.linkUrl) return;
    if (item.readYn === 'N') {
      try {
        await executeGeneratedOperation(markAsReadOperation, { path: { notiSn: item.notiSn } });
        announceNotificationsChanged('center');
      } catch {
        // 이동이 본래 의도다 — 읽음 표시는 다음 조회에서 되맞춘다.
      }
    }
    router.push(item.linkUrl);
  };

  const columns: Column<Notification>[] = [
    {
      header: '번호',
      accessor: (_, index) => (
        <span className="font-mono text-xs text-muted-foreground tabular-nums">
          {total - (page - 1) * pageSize - (index ?? 0)}
        </span>
      ),
      className: 'w-16 text-center',
    },
    {
      // 서버가 분류를 저장하지 않고 제목에서 추론한다 — 머리글이 그 사실을 말한다.
      header: '분류(제목 기준)',
      accessor: (item) => (
        <span className={cn(
          'inline-flex items-center rounded px-2 py-0.5 text-xs font-semibold',
          item.type === 'SECURITY' ? 'bg-destructive/10 text-destructive-emphasis' : 'bg-muted text-muted-foreground',
        )}>
          {kindLabel(item.type)}
        </span>
      ),
      className: 'w-24',
    },
    {
      header: '알림',
      accessor: (item) => (
        <div className="flex flex-col gap-1 py-1">
          <div className="flex items-center gap-2">
            {item.readYn === 'N' && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
            <span className={cn('text-[length:var(--font-size-body)] text-foreground', item.readYn === 'N' && 'font-semibold')}>
              {item.notiTtlNm}
            </span>
            {item.readYn === 'N' && <span className="sr-only">(읽지 않음)</span>}
          </div>
          <p className="max-w-xl truncate text-xs text-muted-foreground">{item.notiCn}</p>
        </div>
      ),
    },
    {
      header: '발생 일시',
      accessor: (item) => <span className="text-xs text-muted-foreground tabular-nums">{item.notiDt}</span>,
      className: 'w-40',
    },
    {
      header: '관리',
      accessor: (item) => {
        const busy = pendingAction !== null;
        return (
          <div className="flex items-center justify-end gap-1">
            {item.linkUrl && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.notiTtlNm} 열기`}
                onClick={() => void openNotification(item)}
              >
                <ExternalLink size={16} aria-hidden="true" />
              </Button>
            )}
            {item.readYn === 'N' && (
              <Button
                type="button"
                variant="ghost"
                size="icon-sm"
                aria-label={`${item.notiTtlNm} 읽음 처리`}
                disabled={busy}
                aria-busy={pendingAction === `read:${item.notiSn}`}
                onClick={() => void handleMarkRead(item)}
              >
                <CheckCheck size={16} aria-hidden="true" />
              </Button>
            )}
            <Button
              type="button"
              variant="ghost"
              size="icon-sm"
              aria-label={`${item.notiTtlNm} 삭제`}
              disabled={busy}
              aria-busy={pendingAction === `delete:${item.notiSn}`}
              onClick={() => void handleDelete(item)}
            >
              <Trash2 size={16} aria-hidden="true" />
            </Button>
          </div>
        );
      },
      className: 'w-32 text-right',
    },
  ];

  const changeFilter = (next: ReadFilter) => {
    setReadFilter(next);
    setPage(1);
  };

  return (
    <section aria-label="받은 알림" className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="읽음 조건">
          {READ_FILTERS.map((filter) => (
            <Button
              key={filter.id}
              type="button"
              size="sm"
              variant={readFilter === filter.id ? 'default' : 'outline'}
              aria-pressed={readFilter === filter.id}
              onClick={() => changeFilter(filter.id)}
            >
              {filter.label}
              {filter.id === 'unread' && unreadCount !== null && ` ${unreadCount.toLocaleString()}건`}
            </Button>
          ))}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-2"
            disabled={pendingAction !== null || unreadCount === 0}
            aria-busy={pendingAction === 'read-all'}
            onClick={() => void handleMarkAllRead()}
          >
            <CheckCheck size={16} aria-hidden="true" /> 모두 읽음
          </Button>
          <Button
            type="button"
            size="icon-sm"
            variant="outline"
            aria-label="알림 목록 새로고침"
            onClick={() => void queryClient.invalidateQueries({ queryKey: QUERY_ROOT })}
          >
            <RefreshCw size={16} aria-hidden="true" />
          </Button>
        </div>
      </div>

      <KeywordFilter
        label="알림 검색어"
        placeholder="알림 제목 또는 내용 검색"
        value={keyword}
        onSearch={(next) => { setKeyword(next.trim()); setPage(1); }}
      />

      <StandardDataTable
        accessibleLabel="받은 알림 목록"
        columns={columns}
        data={items}
        loading={listQuery.isLoading}
        error={listQuery.isError ? listQuery.error : null}
        onRetry={() => void listQuery.refetch()}
        emptyMessage={emptyResultMessage(
          keyword,
          readFilter === 'unread' ? '읽지 않은 알림이 없습니다.' : '받은 알림이 없습니다.',
        )}
        pagination={{
          currentPage: page,
          totalPages,
          onPageChange: setPage,
          pageSize,
          onPageSizeChange: (size) => { setPageSize(size); setPage(1); },
        }}
      />
    </section>
  );
}
