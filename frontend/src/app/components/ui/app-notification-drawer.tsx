'use client';

import { useContext, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { QueryClientContext } from '@tanstack/react-query';
import { X,
  Bell,
  ShieldAlert,
  Activity,
  Database,
  Zap,
  AlertTriangle,
  Trash2,
  Undo2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toDisplayDateTime } from '@/lib/format-date';
import { failureMessage } from '@/lib/safe-error-log';
import { Button } from '@/components/ui/button';
import { useToast } from '@/app/components/ui/toast';
import { Dialog as DialogPrimitive } from 'radix-ui';
import { notificationActions } from '@/extensions/generated-notification-actions';
import { useSlotEntries } from '@/extensions/use-slot-entries';
import type { NotificationAction } from '@/extensions/slots';

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  isRead: boolean;
  type?: 'SECURITY' | 'SYSTEM' | 'ACTIVITY' | 'INFO';
  /**
   * 알림을 눌렀을 때 갈 내부 경로. 목적지가 없으면 {@code null} 이고 이동 어포던스를 그린다.
   *
   * <p>훅({@code useNotifications})이 {@code normalizeInternalRoute} 로 이미 검증한 값이다 —
   * 외부 origin·다른 스킴·자격 포함 URL 은 여기 도달하기 전에 null 이 된다. 이 컴포넌트는
   * 값을 다시 신뢰하지 않고 <b>있으면 링크, 없으면 링크 없음</b>으로만 분기한다.
   */
  linkUrl?: string | null;
}

interface AppNotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: Notification[];
  onMarkRead: (id: number) => void;
  onMarkAllRead: () => void;
  /**
   * 알림 한 건 삭제.
   *
   * <p>서버는 본인 알림만 지운다. 일괄 삭제는 서버 경로가 없고 파괴적이라 범위·확인 절차를
   * 정하는 제품 결정이 선행이다(2026-08-29 판단) — 여기서는 단건만 노출한다.
   */
  onDelete: (id: number) => void;
  /**
   * [2026-08-04] 조회 실패 사유. null 이면 정상.
   * 이 값이 없던 동안 드로어는 실패와 '알림 없음' 을 **같은 화면**으로 렌더했다 —
   * 보안 알림이 오고 있어도 사용자는 조용하다고 믿었다.
   */
  error?: string | null;
  /** 오류 상태에서 사용자가 직접 재시도할 수 있게 한다(알림은 자동 폴링이 60초라 체감이 길다). */
  onRetry?: () => void;
  /** [2026-09-15 DEC-OPS-100] 첫 조회가 끝나기 전이면 true 다. 이때 빈 목록을 '알림 없음'으로 말하지 않는다. */
  loading?: boolean;
  /**
   * [2026-09-26 DIP B4 P2] 서버 전체 미읽음 수. '모두 읽음' 은 서버 일괄 읽음이라, 드로어에 불러온 알림이 모두 읽음이어도
   * 서버에 미읽음이 남아 있으면 누를 수 있어야 한다.
   */
  unreadCount?: number;
  /** 알림 센터로 가는 길. 들어갈 수 없는 사람에게는 넘기지 않는다(라우트와 같은 판정). */
  centerHref?: string;
}

/**
 * [2026-10-01] 드로어 필터는 사실로만 거른다. 종전의 '보안·시스템·활동' 은 제목 글자로 추측한 분류였고, 그마저
 * 드로어가 불러온 최근 알림 안에서만 걸러 '보안 알림 없음' 이 전체에 대한 말처럼 읽혔다(알림 센터는 DEC-OPS-153 에서
 * 같은 탭을 걷었다). 읽음 여부는 서버가 주는 사실이다. 범위가 최근 알림이라는 것은 문구가 말한다.
 */
type FilterType = 'ALL' | 'UNREAD';

/**
 * 알림 카드의 바로 처리 결과(notification-actions 슬롯). 단추를 누른 알림마다 하나다. 판정·대기열에 올리는 중(진행 중)은 따로
 * pendingNotificationId 로 둔다.
 * - queued: 되돌릴 수 있는 대기 처리 — 되돌리기 단추를 둔다
 * - done·undone·failed: 끝난 결과 문장(실패는 사유)
 */
type ActionState =
  | { readonly phase: 'queued'; readonly token: number; readonly message: string; readonly undo: () => boolean; readonly undoneMessage: string }
  | { readonly phase: 'done' | 'undone' | 'failed'; readonly message: string };

export function AppNotificationDrawer({ isOpen, onClose, notifications, onMarkRead, onMarkAllRead, onDelete, error, onRetry, loading = false, unreadCount = 0, centerHref }: AppNotificationDrawerProps) {
  const [activeFilter, setActiveFilter] = useState<FilterType>('ALL');
  const hasUnreadNotifications = unreadCount > 0 || notifications.some(n => !n.isRead);
  /*
    [2026-10-16] 알림 카드의 바로 처리 단추는 다른 기능이 notification-actions 슬롯에 기여한다(결재 차례 알림의 [승인]). 이 드로어는
    알림 기능 소유라 결재 코드를 import 하지 않는다 — 결재가 빠진 구성에서 레지스트리가 비면 단추만 사라지고 드로어는 남는다.
    잠금(알림마다 한 번)·상태 문구·토스트·되돌리기 단추·[열기] 링크는 이 호스트가 소유하고, 기여는 match·submit 만 준다(post-actions 선례).
    쿼리 클라이언트가 없는 곳(공급자 밖)에서는 단추를 두지 않는다 — submit 이 문서를 다시 읽어야 한다.
  */
  const contributedActions = useSlotEntries(notificationActions);
  const queryClient = useContext(QueryClientContext);
  const { toast } = useToast();
  const [actionStates, setActionStates] = useState<Record<number, ActionState>>({});
  const [announcement, setAnnouncement] = useState('');
  // 판정·대기열에 올리는 중인 알림. 그동안 모든 바로 처리 단추를 잠근다(누른 단추는 aria-busy).
  const [pendingNotificationId, setPendingNotificationId] = useState<number | null>(null);
  // 같은 알림을 연달아 눌러도 한 번만 보낸다 — 렌더를 기다리지 않는 동기 잠금이다.
  const pendingNotificationRef = useRef(new Set<number>());
  // 되돌린 뒤에 늦게 끝난 결과가 상태를 덮지 않게 대기 처리마다 표지를 둔다.
  const nextToken = useRef(0);
  const queuedCount = Object.values(actionStates).filter(state => state.phase === 'queued').length;
  // 되돌릴 수 있는 대기 처리가 있으면 탭을 닫기 전에 한 번 묻는다 — 닫으면 그 처리가 보내지지 않는다(결재함과 같다).
  useEffect(() => {
    if (queuedCount === 0) return undefined;
    const warn = (event: BeforeUnloadEvent) => { event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [queuedCount]);

  const setActionState = (id: number, state: ActionState) => setActionStates(current => ({ ...current, [id]: state }));
  // 지금 그 알림에 걸린 대기 처리의 표지. 되돌리거나 결과가 나면 지운다.
  const queuedTokenRef = useRef(new Map<number, number>());

  /** 대기 처리의 결과를 그 대기 처리가 아직 살아 있을 때만 반영한다(되돌린 뒤에 끝난 결과는 버린다). */
  const followQueued = (notif: Notification, action: NotificationAction, token: number, settled: Promise<string>) => {
    settled.then((message) => {
      if (queuedTokenRef.current.get(notif.id) !== token) return;
      queuedTokenRef.current.delete(notif.id);
      setActionState(notif.id, { phase: 'done', message });
      setAnnouncement(message);
      toast(message, 'success');
    }, (settleError: unknown) => {
      if (queuedTokenRef.current.get(notif.id) !== token) return;
      queuedTokenRef.current.delete(notif.id);
      setActionState(notif.id, { phase: 'failed', message: failureMessage(settleError, action.failureMessage) });
      toast(action.failureMessage, 'error');
    });
  };

  /** 바로 처리. 같은 알림은 한 번만 보낸다(동기 잠금). 판정 실패·서버 거부는 사유를 카드 아래에, 무엇을 못 했는지는 토스트로 알린다. */
  const handleNotificationAction = async (notif: Notification, action: NotificationAction, target: string) => {
    if (!queryClient || pendingNotificationRef.current.has(notif.id)) return;
    pendingNotificationRef.current.add(notif.id);
    setPendingNotificationId(notif.id);
    try {
      const outcome = await action.submit({ notificationId: notif.id, title: notif.title ?? '', target, queryClient });
      if (!notif.isRead) onMarkRead(notif.id);
      setAnnouncement(outcome.message);
      if (outcome.undo && outcome.settled) {
        const token = nextToken.current++;
        queuedTokenRef.current.set(notif.id, token);
        setActionState(notif.id, { phase: 'queued', token, message: outcome.message, undo: outcome.undo,
          undoneMessage: outcome.undoneMessage ?? '처리를 되돌렸습니다.' });
        followQueued(notif, action, token, outcome.settled);
      } else {
        setActionState(notif.id, { phase: 'done', message: outcome.message });
        toast(outcome.message, 'success');
      }
    } catch (submitError: unknown) {
      setActionState(notif.id, { phase: 'failed', message: failureMessage(submitError, action.failureMessage) });
      toast(action.failureMessage, 'error');
    } finally {
      pendingNotificationRef.current.delete(notif.id);
      setPendingNotificationId(null);
    }
  };

  /** 되돌리기. 아직 보내지 않았으면 취소하고, 이미 보냈으면 그 사실을 말한다(결과는 곧 온다). */
  const undoNotificationAction = (id: number) => {
    const state = actionStates[id];
    if (state?.phase !== 'queued') return;
    if (!state.undo()) {
      setAnnouncement('이미 보낸 처리라 되돌릴 수 없습니다. 결과를 곧 알려 드립니다.');
      return;
    }
    queuedTokenRef.current.delete(id);
    setActionState(id, { phase: 'undone', message: state.undoneMessage });
    setAnnouncement(state.undoneMessage);
  };

  const filteredNotifications = activeFilter === 'UNREAD' ? notifications.filter((n) => !n.isRead) : notifications;

  const getIcon = (type?: string) => {
    switch (type) {
      case 'SECURITY': return <ShieldAlert size={16} className="text-destructive-emphasis" aria-hidden="true" />;
      case 'SYSTEM': return <Database size={16} className="text-warning" aria-hidden="true" />;
      case 'ACTIVITY': return <Activity size={16} className="text-success-emphasis" aria-hidden="true" />;
      default: return <Bell size={16} className="text-primary" aria-hidden="true" />;
    }
  };

  return (
    <DialogPrimitive.Root open={isOpen} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogPrimitive.Portal>
        {/* 배경 오버레이 */}
        <DialogPrimitive.Overlay 
          className="fixed inset-0 z-[1000] bg-background/80 backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0"
        />

        {/* 알림 드로어 */}
        <DialogPrimitive.Content
          className="fixed right-0 top-0 bottom-0 z-[1000] h-full w-full max-w-md border-l border-border bg-card text-card-foreground shadow-[-40px_0_80px_rgba(0,0,0,0.1)] overflow-hidden flex flex-col focus:outline-none data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right duration-300"
        >
          {/* 접근성 준수를 위한 타이틀/설명 (화면 비표시) */}
          <DialogPrimitive.Title className="sr-only">알림 센터</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">받은 알림 목록입니다.</DialogPrimitive.Description>

          {/* Header Fabric */}
          <div className="sticky top-0 z-20 flex items-center justify-between gap-2 border-b border-border bg-card px-4 py-3">
            <div className="space-y-1">
              <h2 className="flex items-center gap-2 text-base font-semibold tracking-tight text-card-foreground">
                <Bell size={16} className="shrink-0 text-muted-foreground" aria-hidden="true" />
                알림 센터
              </h2>
              <p className="text-xs text-muted-foreground">받은 알림</p>
            </div>
            <div className="flex items-center gap-2">
              {hasUnreadNotifications && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={onMarkAllRead}
                  className="px-2 text-xs hover:text-primary"
                >
                  {/*
                    [2026-09-26 DIP B4 P2] '불러온 알림 읽음' → '모두 읽음'. 서버 일괄 읽음이 생겨 이 동작은
                    드로어에 불러온 범위가 아니라 받은 알림 전체를 읽음 처리한다(use-notifications markAllAsRead).
                  */}
                  모두 읽음
                </Button>
              )}
              <button 
                onClick={onClose} 
                data-testid="e2e-drawer-close"
                aria-label="알림 센터 닫기"
                className="rounded-md p-2 transition-colors hover:bg-accent"
              >
                <X size={16} className="text-muted-foreground" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Advanced Filter Matrix */}
          <div className="flex gap-1.5 border-b border-border bg-muted/30 p-3">
             {(['ALL', 'UNREAD'] as FilterType[]).map((f) => (
                <button
                   key={f}
                   type="button"
                   aria-pressed={activeFilter === f}
                   onClick={() => setActiveFilter(f)}
                   className={cn(
                      "cursor-pointer rounded-md border px-3 py-1.5 text-[length:var(--font-size-body)] transition-colors",
                      activeFilter === f
                         ? "border-primary bg-primary text-primary-foreground"
                         : "border-border bg-background text-muted-foreground hover:bg-accent"
                   )}
                >
                   {f === 'ALL' ? '전체' : '읽지 않음'}
                </button>
             ))}
             <span className="ml-auto self-center text-xs text-muted-foreground">최근 알림</span>
             {/*
                [2026-08-29] '알림 전체 삭제' 휴지통 버튼을 걷었다.
                onClick·type·form 이 전혀 없어 눌러도 아무 일이 없었는데, hover 하면 빨갛게
                변하고 cursor-pointer 라 눌리는 것처럼 보였다. 되살리려면 대상 자체가 필요하다 —
                서버에는 단건 DELETE /api/v1/notifications/{notiSn} 만 있고 일괄 삭제 경로가 없다.
                일괄 삭제는 파괴적 작업이라 범위·확인 절차를 정하는 제품 결정이 선행된다.
             */}
          </div>

          {/* 바로 처리의 진행·결과를 보조기술에 알린다(카드 안 문구와 같은 문장). 목록의 '불러오는 중' 상태(role=status)와 겹치지 않게
              역할 없이 live 영역만 두고, 바로 처리 단추가 있을 때만 둔다. */}
          {queryClient && contributedActions.length > 0 && <p aria-live="polite" className="sr-only">{announcement}</p>}

          {/* Notification Stream */}
          <div className="custom-scrollbar relative z-10 flex-1 space-y-2 overflow-y-auto p-3">
             {/* [2026-08-04] 조회 실패를 '알림 없음' 으로 렌더하지 않는다.
                 오류 상태를 빈 상태보다 **먼저** 판정한다 — 실패 시 목록이 비어 있는 경우가
                 대부분이라, 순서를 뒤집으면 오류 화면이 영원히 도달하지 못한다. */}
             {error ? (
                <div className="flex flex-col items-center justify-center h-full gap-4 px-8 text-center">
                  <AlertTriangle size={28} className="text-destructive-emphasis" aria-hidden="true" />
                  <div className="space-y-1">
                    <p className="text-sm font-bold text-foreground">{error}</p>
                    <p className="text-sm text-muted-foreground">
                      표시할 알림이 없는 것이 아니라 <strong>조회에 실패</strong>했습니다.
                      읽지 않은 알림이 있을 수 있습니다.
                    </p>
                  </div>
                  {onRetry ? (
                    <button
                      type="button"
                      onClick={onRetry}
                      className="mt-2 px-5 py-2 rounded-lg border border-border bg-card text-sm font-bold hover:bg-muted transition-colors"
                    >
                      다시 시도
                    </button>
                  ) : null}
                </div>
             ) : loading && filteredNotifications.length === 0 ? (
                <div role="status" className="flex h-full items-center justify-center text-sm font-bold text-muted-foreground">
                  알림을 불러오는 중…
                </div>
             ) : filteredNotifications.length === 0 ? (
                <div
                   className="flex h-full flex-col items-center justify-center text-muted-foreground"
                >
                  <Zap size={28} className="mb-3" aria-hidden="true" />
                  <span className="text-[length:var(--font-size-body)] text-muted-foreground">
                    {activeFilter === 'UNREAD' ? '최근 알림 가운데 읽지 않은 알림이 없습니다' : '받은 알림이 없습니다'}
                  </span>
                </div>
             ) : (
                filteredNotifications.map((notif) => {
                  const canMarkRead = !notif.linkUrl && !notif.isRead;
                  // 이 알림에 붙는 바로 처리 단추(슬롯 기여). 목적지 링크가 있는 카드만 고른다 — 그 카드는 버튼이 아니라 중첩 단추가 생기지 않는다.
                  const linkUrl = notif.linkUrl;
                  const matchedActions = linkUrl && queryClient
                    ? contributedActions.flatMap(action => { const target = action.match(linkUrl); return target ? [{ action, target }] : []; })
                    : [];
                  const actionState = actionStates[notif.id];
                  const actionTitle = notif.title || '알림';
                  /* 목적지 링크가 있으면 카드와 링크를 중첩 인터랙션으로 만들지 않는다.
                     링크가 없는 미읽음 알림만 카드 자체가 "읽음 처리" 버튼 역할을 한다. */
                  const cardClassName = cn(
                    "group relative w-full overflow-hidden rounded-md border px-3 py-2 text-left transition-colors",
                    canMarkRead && "cursor-pointer",
                    notif.isRead
                      ? "border-border/40 bg-muted/10 text-muted-foreground"
                      : "border-border bg-card hover:border-primary",
                    !notif.isRead && notif.type === 'SECURITY' && "border-destructive/40 bg-destructive/5"
                  );
                  const cardContent = (
                    <>
                    <div className="relative z-10 flex items-start justify-between gap-2">
                      <div className={cn(
                         "flex size-7 shrink-0 items-center justify-center rounded-md",
                         notif.isRead ? "bg-muted text-muted-foreground" : "border border-border bg-background"
                      )}>
                         {getIcon(notif.type)}
                      </div>
                      <div className="flex-1 space-y-1 min-w-0">
                         <div className="flex items-center justify-between">
                            <h3 className={cn("truncate pr-2 text-[length:var(--font-size-body)] font-medium text-card-foreground", !notif.isRead && "text-foreground")}>
                               {notif.title}
                            </h3>
                            {!notif.isRead && <div className="size-2 shrink-0 rounded-full bg-primary" aria-hidden="true" />}
                         </div>
                         <p className="line-clamp-2 text-xs leading-relaxed text-muted-foreground">
                            {notif.message}
                         </p>
                      </div>
                    </div>

                    <div className="relative z-10 mt-1.5 flex items-center justify-between">
                      <span className="text-xs tabular-nums text-muted-foreground">{toDisplayDateTime(new Date(notif.time))}</span>
                      {/*
                         [2026-08-29] '상세 보기 →' 버튼을 걷었다. onClick·href·router.push 가
                         전혀 없었고, 갈 곳도 없었다.

                         [2026-09-02] 갈 곳이 생겨서 되살린다 — 다만 '상세 보기' 가 아니라
                         **업무로 이동**이다. 서버의 알림 producer 3종이 결재함·쪽지함·게시글로
                         가는 경로를 계산해 저장하고, 훅이 그것을 내부 경로로 검증해 넘긴다.
                         목적지가 없는 알림(관리자 수기 공지 등)에는 아무것도 그리지 않는다 —
                         누를 수 없는 버튼을 두는 것이 종전에 걷어낸 바로 그 문제였다.

                         ⚠ Link 클릭이 바깥 카드의 onClick(읽음 처리)까지 타지 않게 stopPropagation
                         하지 않는다. 오히려 반대로, 이동하면서 읽음 처리도 되는 것이 맞다 —
                         사용자가 알림을 눌러 업무로 갔는데 그 알림이 미읽음으로 남으면 안 된다.
                      */}
                      {notif.linkUrl && matchedActions.length === 0 ? (
                        <Link
                          href={notif.linkUrl}
                          aria-label={`${notif.title || '알림'} 업무로 이동`}
                          onClick={() => {
                            if (!notif.isRead) onMarkRead(notif.id);
                            onClose();
                          }}
                          className="rounded-sm text-xs text-primary underline-offset-4 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2"
                        >
                          바로가기 →
                        </Link>
                      ) : null}
                    </div>

                    {/*
                      [2026-10-16] 바로 처리 단추(예: 결재 차례 알림의 [승인])와 [열기]. 처리 결과·되돌리기·실패 사유를 카드 안에 남긴다.
                      [열기] 는 '바로가기' 와 같은 목적지다 — 단추가 붙은 카드는 두 동작을 나란히 둔다.
                    */}
                    {notif.linkUrl && matchedActions.length > 0 && (
                      <div className="relative z-10 mt-2 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          {actionState?.phase === 'queued' ? (
                            <Button type="button" size="sm" variant="outline" aria-label={`되돌리기: ${actionTitle}`} onClick={() => undoNotificationAction(notif.id)}>
                              <Undo2 aria-hidden="true" /> 되돌리기
                            </Button>
                          ) : matchedActions.map(({ action, target }) => {
                            return (
                              <Button
                                key={action.id}
                                type="button"
                                size="sm"
                                aria-label={`${action.name}: ${actionTitle}`}
                                aria-busy={pendingNotificationId === notif.id || undefined}
                                disabled={pendingNotificationId !== null || actionState?.phase === 'done'}
                                onClick={() => { void handleNotificationAction(notif, action, target); }}
                              >
                                {pendingNotificationId === notif.id ? action.busyLabel : action.label}
                              </Button>
                            );
                          })}
                          <Button asChild size="sm" variant="ghost">
                            <Link
                              href={notif.linkUrl}
                              aria-label={`열기: ${actionTitle}`}
                              onClick={() => {
                                if (!notif.isRead) onMarkRead(notif.id);
                                onClose();
                              }}
                            >
                              열기
                            </Link>
                          </Button>
                        </div>
                        {actionState && (
                          <p role={actionState.phase === 'failed' ? 'alert' : undefined} className={cn('text-xs', actionState.phase === 'failed' ? 'text-destructive-emphasis' : 'text-muted-foreground')}>
                            {actionState.message}
                          </p>
                        )}
                      </div>
                    )}

                    {/* Background Decoration */}
                    </>
                  );

                  /*
                    [2026-09-08] 삭제 버튼은 카드 **바깥**에 둔다. 미읽음 카드는 카드 전체가
                    button(클릭 = 읽음 처리)이라 그 안에 버튼을 넣으면 중첩 button 이 되고
                    보조기술이 두 동작을 구분하지 못한다.
                  */
                  return (
                    <div key={notif.id} className="flex items-start gap-2">
                      <div className="flex-1 min-w-0">
                        {canMarkRead ? (
                          <button
                            type="button"
                            aria-label={`알림: ${notif.title || '알림 항목'}`}
                            className={cardClassName}
                            onClick={() => onMarkRead(notif.id)}
                          >
                            {cardContent}
                          </button>
                        ) : (
                          <div className={cardClassName}>{cardContent}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        aria-label={`${notif.title || '알림 항목'} 삭제`}
                        className="shrink-0 mt-1 p-2 rounded-md text-muted-foreground hover:text-destructive-emphasis hover:bg-destructive/10 transition-colors"
                        onClick={() => onDelete(notif.id)}
                      >
                        <Trash2 size={16} aria-hidden="true" />
                      </button>
                    </div>
                  );
                })
             )}
          </div>

          {/* Bottom Sticky Control */}
          <div className="space-y-2 border-t border-border bg-card p-3">
             <Button
               data-testid="read-all-broadcasts-btn"
               onClick={onMarkAllRead}
               disabled={!hasUnreadNotifications}
               className="w-full"
             >
                받은 알림 모두 읽음 처리
             </Button>
             {centerHref && (
               <Button asChild variant="outline" className="w-full">
                 <Link href={centerHref} onClick={onClose}>알림 센터에서 전체 보기</Link>
               </Button>
             )}
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}

