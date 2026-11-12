'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { CalendarDays, RefreshCcw, Users } from 'lucide-react';
import { PageHeader } from '@/app/components/layout/page-header';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import {
  EVENT_APPLICATION_STATUS_LABELS,
  eventParticipationService,
  type EventApplicationStatus,
  type OpenEvent,
} from '@/services/foundation/operation/eventParticipationService';

const openEventsKey = ['events', 'open'] as const;

const formatYmd = (ymd?: string | null) => (ymd && ymd.length === 8 ? `${ymd.slice(0, 4)}.${ymd.slice(4, 6)}.${ymd.slice(6, 8)}` : '-');

/**
 * [V2_152] 사용자 행사 신청. 신청을 받는 행사(담당자가 정한 마감일이 오늘 이후)를 보이고 신청·취소한다. 자리 수·마감·내 신청
 * 상태는 서버가 판정한 값이다 — 버튼을 눌러도 정원이 그 사이 찼으면 서버가 409 로 거부하고 이 화면이 그 문구를 보인다.
 */
export default function EventParticipationClient() {
  const { toast } = useToast();
  const askConfirm = useConfirm();
  const queryClient = useQueryClient();
  const [pendingSn, setPendingSn] = useState<number | null>(null);
  // 같은 프레임의 두 번 누름도 한 번만 보낸다 — 상태 갱신은 다음 렌더에야 보이므로 ref 로 먼저 잠근다.
  const requestPendingRef = useRef(false);
  const events = useQuery({
    queryKey: openEventsKey,
    queryFn: () => eventParticipationService.getOpenEvents({ page: 1, size: 50 }),
  });
  const refresh = () => queryClient.invalidateQueries({ queryKey: openEventsKey });
  const apply = useMutation({ mutationFn: (evntSn: number) => eventParticipationService.apply(evntSn), onSettled: refresh });
  const cancel = useMutation({ mutationFn: (evntSn: number) => eventParticipationService.cancel(evntSn), onSettled: refresh });

  const run = async (event: OpenEvent, action: 'apply' | 'cancel') => {
    if (requestPendingRef.current || typeof event.evntSn !== 'number') return;
    const name = event.evntNm || '행사';
    if (action === 'cancel' && !(await askConfirm({
      title: '신청 취소', message: `‘${name}’ 참가 신청을 취소합니다. 마감 전이면 다시 신청할 수 있습니다.`,
      confirmText: '신청 취소', cancelText: '그대로 두기', variant: 'destructive',
    }))) return;
    if (requestPendingRef.current) return;
    requestPendingRef.current = true;
    setPendingSn(event.evntSn);
    try {
      if (action === 'apply') await apply.mutateAsync(event.evntSn);
      else await cancel.mutateAsync(event.evntSn);
      toast(action === 'apply' ? `‘${name}’ 참가를 신청했습니다.` : `‘${name}’ 참가 신청을 취소했습니다.`, 'success');
    } catch (error) {
      toast(extractErrorMessage(error, action === 'apply' ? '신청하지 못했습니다. 다시 시도해 주세요.' : '취소하지 못했습니다. 다시 시도해 주세요.'), 'error');
    } finally {
      requestPendingRef.current = false;
      setPendingSn(null);
    }
  };

  const list = events.data?.list ?? [];
  return (
    <div className="space-y-6">
      <PageHeader title="행사 참가" breadcrumbs={[{ label: '참여' }, { label: '행사 참가' }]} />
      {events.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">신청을 받는 행사를 불러오는 중입니다.</p>
      ) : events.isError ? (
        <div role="alert" className="space-y-2 rounded-md border border-destructive/30 p-4 text-sm">
          <p>행사 목록을 불러오지 못했습니다.</p>
          <Button type="button" variant="outline" onClick={() => void events.refetch()}><RefreshCcw aria-hidden="true" /> 다시 시도</Button>
        </div>
      ) : list.length === 0 ? (
        <p className="rounded-md border border-border p-6 text-sm text-muted-foreground">지금 신청을 받는 행사가 없습니다.</p>
      ) : (
        <ul className="grid gap-4 md:grid-cols-2" aria-label="신청을 받는 행사">
          {list.map(event => {
            const status = event.myStatus as EventApplicationStatus | null | undefined;
            const holdsSeat = status === 'APPLIED' || status === 'APPROVED';
            const name = event.evntNm || '행사';
            const seats = event.pscpNope ? `${event.seatsTaken ?? 0}/${event.pscpNope}명` : `${event.seatsTaken ?? 0}명 신청 · 정원 없음`;
            return (
              <li key={event.evntSn} className="space-y-3 rounded-md border border-border bg-card p-4" aria-label={name}>
                <div className="space-y-1">
                  <h2 className="text-[length:var(--font-size-body)] font-semibold text-foreground">{name}</h2>
                  {event.evntCn && <p className="line-clamp-3 whitespace-pre-wrap text-sm text-muted-foreground">{event.evntCn}</p>}
                </div>
                <dl className="grid grid-cols-2 gap-2 text-sm">
                  <div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><CalendarDays size={14} aria-hidden="true" /> 기간</dt><dd>{formatYmd(event.evntBgngYmd)} ~ {formatYmd(event.evntEndYmd)}</dd></div>
                  <div><dt className="flex items-center gap-1 text-xs text-muted-foreground"><Users size={14} aria-hidden="true" /> 자리</dt><dd>{seats}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">신청 마감</dt><dd>{formatYmd(event.aplyDdlnYmd)}</dd></div>
                  <div><dt className="text-xs text-muted-foreground">내 신청</dt><dd>{status ? EVENT_APPLICATION_STATUS_LABELS[status] : '신청 안 함'}</dd></div>
                </dl>
                <div className="flex justify-end gap-2">
                  {holdsSeat ? (
                    <Button type="button" variant="outline" disabled={pendingSn !== null} aria-busy={pendingSn === event.evntSn || undefined}
                      onClick={() => void run(event, 'cancel')}>
                      <span className="sr-only">{name}</span>{' '}신청 취소
                    </Button>
                  ) : status === 'REJECTED' ? (
                    <p className="text-sm text-muted-foreground">반려된 신청입니다. 행사 담당자에게 문의해 주세요.</p>
                  ) : (
                    <Button type="button" disabled={pendingSn !== null || !event.acceptingApplications} aria-busy={pendingSn === event.evntSn || undefined}
                      onClick={() => void run(event, 'apply')}>
                      <span className="sr-only">{name}</span>{' '}{event.acceptingApplications ? '참가 신청' : '신청 마감'}
                    </Button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
