'use client';

import { useRef, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { RefreshCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';
import { extractErrorMessage } from '@/app/actions/actionUtils';
import { toSeoulDisplayDateTime } from '@/lib/format-date';
import { useAuth } from '@/contexts/AuthContext';
import { canPermission } from '@/lib/auth/permissions';
import { PagePagination } from '@/components/common/PagePagination';
import {
  EVENT_APPLICATION_STATUS_LABELS,
  eventParticipationService,
  type EventApplication,
  type EventApplicationStatus,
} from '@/services/foundation/operation/eventParticipationService';

const APPLICATIONS_PAGE_SIZE = 20;

/**
 * [V2_152] 행사 신청자 관리. 행사 등록자이거나 수정 대행 권한자에게만 서버가 목록을 연다(아니면 403 을 그대로 알린다). 승인·반려는
 * 목록에서 읽은 신청 버전으로 보낸다 — 그 사이 다른 사람이 처리했으면 409 를 보이고 목록을 다시 읽는다. 승인·반려 버튼은 행사 수정
 * 권한(EVENT_UPDATE)이 있을 때만 보인다 — 표시 판정일 뿐이고 서버가 등록자·대행 권한을 다시 본다.
 */
export function EventApplicationsPanel({ evntSn, eventName }: { evntSn: number; eventName: string }) {
  const { user } = useAuth();
  const canDecide = canPermission(user, 'EVENT_UPDATE');
  const { toast } = useToast();
  const askConfirm = useConfirm();
  const queryClient = useQueryClient();
  const key = ['admin', 'events', evntSn, 'applications'] as const;
  const [page, setPage] = useState(1);
  const [pending, setPending] = useState<{ sn: number; approved: boolean } | null>(null);
  // 같은 프레임의 두 번 누름도 한 번만 보낸다 — 상태 갱신은 다음 렌더에야 보이므로 ref 로 먼저 잠근다.
  const decisionPendingRef = useRef(false);
  const applications = useQuery({
    queryKey: [...key, page],
    queryFn: () => eventParticipationService.getApplications(evntSn, { page, size: APPLICATIONS_PAGE_SIZE }),
    retry: false,
  });
  const decide = useMutation({
    mutationFn: ({ application, approved }: { application: EventApplication; approved: boolean }) => approved
      ? eventParticipationService.approve(evntSn, application.evntAplySn as number, application.version as number)
      : eventParticipationService.reject(evntSn, application.evntAplySn as number, application.version as number),
    onSettled: () => queryClient.invalidateQueries({ queryKey: key }),
  });

  const run = async (application: EventApplication, approved: boolean) => {
    if (decisionPendingRef.current || typeof application.evntAplySn !== 'number' || typeof application.version !== 'number') return;
    const who = application.aplcntNm || application.aplcntId || '신청자';
    if (!approved && !(await askConfirm({
      title: '신청 반려', message: `${who}님의 ‘${eventName}’ 참가 신청을 반려합니다. 반려된 신청은 다시 신청할 수 없습니다.`,
      confirmText: '반려', variant: 'destructive',
    }))) return;
    if (decisionPendingRef.current) return;
    decisionPendingRef.current = true;
    setPending({ sn: application.evntAplySn, approved });
    try {
      await decide.mutateAsync({ application, approved });
      toast(`${who}님의 신청을 ${approved ? '승인' : '반려'}했습니다.`, 'success');
    } catch (error) {
      toast(extractErrorMessage(error, '처리하지 못했습니다. 목록을 다시 확인해 주세요.'), 'error');
    } finally {
      decisionPendingRef.current = false;
      setPending(null);
    }
  };

  const list = applications.data?.list ?? [];
  return (
    <section aria-label={`${eventName} 신청자`} className="space-y-2 rounded-md border border-border p-4">
      <h3 className="text-[length:var(--font-size-body)] font-semibold text-foreground">신청자 ({applications.data?.total ?? 0}명)</h3>
      {applications.isPending ? (
        <p role="status" className="text-sm text-muted-foreground">신청자를 불러오는 중입니다.</p>
      ) : applications.isError ? (
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <p className="text-muted-foreground">{extractErrorMessage(applications.error, '신청자를 불러오지 못했습니다.')}</p>
          <Button type="button" variant="outline" size="sm" onClick={() => void applications.refetch()}><RefreshCcw aria-hidden="true" /> 다시 시도</Button>
        </div>
      ) : list.length === 0 ? (
        <p className="text-sm text-muted-foreground">아직 신청한 사람이 없습니다.</p>
      ) : (
        <ul className="divide-y divide-border">
          {list.map(application => {
            const status = application.aplySttsCd as EventApplicationStatus;
            const who = application.aplcntNm || application.aplcntId || '신청자';
            return (
              <li key={application.evntAplySn} className="flex flex-wrap items-center justify-between gap-2 py-2 text-sm">
                <span>
                  {who} · {EVENT_APPLICATION_STATUS_LABELS[status] ?? status}
                  {application.aplyDt && <span className="ml-2 text-xs text-muted-foreground"><time dateTime={application.aplyDt}>{toSeoulDisplayDateTime(application.aplyDt)}</time></span>}
                </span>
                {canDecide && (status === 'APPLIED' || status === 'APPROVED') && (
                  <span className="flex gap-1">
                    {status === 'APPLIED' && (
                      <Button type="button" size="sm" variant="outline" disabled={pending !== null}
                        aria-busy={(pending !== null && pending.sn === application.evntAplySn && pending.approved) || undefined} onClick={() => void run(application, true)}>
                        <span className="sr-only">{who}</span>{' '}승인
                      </Button>
                    )}
                    <Button type="button" size="sm" variant="ghost" disabled={pending !== null}
                      aria-busy={(pending !== null && pending.sn === application.evntAplySn && !pending.approved) || undefined} onClick={() => void run(application, false)}>
                      <span className="sr-only">{who}</span>{' '}반려
                    </Button>
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <PagePagination total={applications.data?.total ?? 0} page={page} size={APPLICATIONS_PAGE_SIZE} onPageChange={setPage} />
    </section>
  );
}
