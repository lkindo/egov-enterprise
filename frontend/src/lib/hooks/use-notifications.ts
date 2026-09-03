'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useRef } from 'react';
import type { IMessage } from '@stomp/stompjs';
import { executeGeneratedOperation } from '@/lib/api/generated-api-client';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';
import { normalizeInternalRoute } from '@/lib/navigation/internal-route';
import {
  getNotificationsOperation,
  getUnreadCountOperation,
  markAsReadOperation,
} from '@/types/generated-operations';

export interface Notification {
  notiSn: number;
  notiTtlNm: string;
  notiCn: string;
  notiDt: string;
  /** 서버 첫 페이지 정렬 기준. 화면 표시용 notiDt와 분리해 reconcile 순서를 보존한다. */
  crtDt?: string | null;
  readYn: 'Y' | 'N';
  type?: 'SECURITY' | 'SYSTEM' | 'ACTIVITY' | 'INFO';
  /**
   * 알림을 눌렀을 때 갈 내부 경로. 목적지가 없거나 신뢰할 수 없으면 {@code null}.
   *
   * <p>[2026-09-02] 종전에는 이 필드가 <b>정규화 단계에서 통째로 버려졌다.</b> 서버의 알림
   * producer 3종(결재·쪽지·댓글)이 목적지를 계산해 저장하고 API 도 내려주는데, 화면이 그것을
   * 복사하지 않아 어떤 소비자도 쓸 수 없었다 — 그래서 드로어의 '상세 보기' 버튼도
   * "갈 곳이 없다"는 이유로 걷혔다. 이제 목적지가 실재하므로 되살린다.
   */
  linkUrl?: string | null;
}

type NotificationKind = NonNullable<Notification['type']>;
const NOTIFICATION_KINDS = new Set<NotificationKind>(['SECURITY', 'SYSTEM', 'ACTIVITY', 'INFO']);
const DEFAULT_NOTIFICATION_WINDOW_SIZE = 10;
const RECENT_ID_WINDOW_PAGES = 10;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** REST/WS 외부 입력을 화면 상태에 넣기 전에 최소 계약으로 정규화한다. */
function normalizeNotification(value: unknown): Notification | null {
  if (!isRecord(value)) return null;
  const notiSn = typeof value.notiSn === 'number'
    && Number.isSafeInteger(value.notiSn)
    && value.notiSn > 0 ? value.notiSn : 0;
  const notiTtlNm = typeof value.notiTtlNm === 'string' ? value.notiTtlNm : '';
  const notiCn = typeof value.notiCn === 'string' ? value.notiCn : '';
  if (!notiSn || !notiTtlNm) return null;

  const inferredType: NotificationKind = notiTtlNm.includes('보안')
    ? 'SECURITY'
    : notiTtlNm.includes('시스템') ? 'SYSTEM' : 'ACTIVITY';
  const suppliedType = typeof value.type === 'string' ? value.type as NotificationKind : null;
  const type = suppliedType && NOTIFICATION_KINDS.has(suppliedType) ? suppliedType : inferredType;
  const createdAt = typeof value.crtDt === 'string' ? value.crtDt : null;
  const dateCandidate = typeof value.notiDt === 'string'
    ? value.notiDt
    : createdAt;

  /*
   * 목적지는 **내부 경로로 검증한 뒤에만** 싣는다.
   *
   * linkUrl 은 tb_user_noti 의 varchar(2000) 컬럼이고, 관리자용 알림 생성 API 로 임의 문자열을
   * 넣을 수 있다. 검증 없이 그대로 링크에 쓰면 열린 리다이렉트가 되고, `javascript:` 스킴이면
   * 그보다 나쁘다. 메뉴 경로가 같은 이유로 쓰는 정규화기를 그대로 재사용한다 —
   * 외부 origin·자격 포함 URL·백슬래시·점 세그먼트를 모두 거부하고 실패 시 null 을 준다.
   */
  const linkUrl = typeof value.linkUrl === 'string' ? normalizeInternalRoute(value.linkUrl) : null;

  return {
    notiSn,
    notiTtlNm,
    notiCn,
    notiDt: dateCandidate || new Date().toISOString(),
    crtDt: createdAt,
    readYn: value.readYn === 'Y' ? 'Y' : 'N',
    type,
    linkUrl,
  };
}

interface RevisionedNotification {
  revision: number;
  notification: Notification;
}

interface PendingReadMutation {
  generation: number;
  requests: number;
  wasUnread: boolean;
  countAccounted: boolean;
}

/** REST 한 페이지 안의 중복 ID는 첫(최신 정렬) 항목 하나만 보존한다. */
function deduplicateNotifications(items: Notification[]): Notification[] {
  const seen = new Set<number>();
  return items.filter(item => {
    if (seen.has(item.notiSn)) return false;
    seen.add(item.notiSn);
    return true;
  });
}

/** 서버의 ORDER BY crtDt DESC, notiSn DESC와 같은 first-page 순서를 재현한다. */
function compareNotificationsNewestFirst(left: Notification, right: Notification): number {
  if (!left.crtDt || !right.crtDt) return 0;
  // LocalDateTime ISO 문자열을 숫자로 바꾸면 JS Date가 PostgreSQL microsecond를 millisecond로
  // 절단한다. 같은 zone/형식의 원문을 비교해야 서버의 crtDt DESC 경계와 정확히 일치한다.
  if (left.crtDt !== right.crtDt) return left.crtDt > right.crtDt ? -1 : 1;
  return right.notiSn - left.notiSn;
}

/** 중복 STOMP 억제 이력은 최근 여러 페이지로 제한해 장기 mount에서도 메모리가 누적되지 않게 한다. */
function rememberNotificationId(
  recentIds: Map<number, true>,
  id: number,
  pageSize: number,
): boolean {
  if (recentIds.has(id)) return false;
  recentIds.set(id, true);
  const limit = Math.max(DEFAULT_NOTIFICATION_WINDOW_SIZE, pageSize) * RECENT_ID_WINDOW_PAGES;
  while (recentIds.size > limit) {
    const oldest = recentIds.keys().next().value;
    if (oldest === undefined) break;
    recentIds.delete(oldest);
  }
  return true;
}

/** 조회 시작 뒤 도착한 WS/읽음 변경을 오래 걸린 REST snapshot 위에 다시 적용한다. */
function overlayLocalChanges(
  snapshot: Notification[],
  liveUpserts: Map<number, RevisionedNotification>,
  readRevisions: Map<number, number>,
): Notification[] {
  let merged = deduplicateNotifications(snapshot);
  const pendingUpserts = [...liveUpserts.values()]
    .sort((left, right) => left.revision - right.revision);

  for (const { notification } of pendingUpserts) {
    merged = [notification, ...merged.filter(item => item.notiSn !== notification.notiSn)];
  }

  return merged.map(item => (
    readRevisions.has(item.notiSn)
      ? { ...item, readYn: 'Y' as const }
      : item
  )).sort(compareNotificationsNewestFirst);
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  /** 조회 실패 사유. null 이면 정상. UI 는 이것을 '알림 없음' 과 반드시 구분해 표시해야 한다. */
  const [error, setError] = useState<string | null>(null);
  /** 오류 토스트 중복 억제 — 60초 폴링이라 매 실패마다 띄우면 화면이 잠긴다. */
  const errorNotifiedRef = useRef(false);
  const { client: wsClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const { toast } = useToast();
  const userId = user?.id ?? null;

  // 비동기 REST snapshot보다 나중에 일어난 로컬 사실(WS·읽음)을 잃지 않기 위한 barrier 상태.
  const notificationsRef = useRef<Notification[]>([]);
  const unreadCountRef = useRef(0);
  const localRevisionRef = useRef(0);
  const liveUpsertsRef = useRef(new Map<number, RevisionedNotification>());
  const readRevisionsRef = useRef(new Map<number, number>());
  const pendingReadMutationsRef = useRef(new Map<number, PendingReadMutation>());
  const recentNotificationIdsRef = useRef(new Map<number, true>());
  const visibleWindowSizeRef = useRef(DEFAULT_NOTIFICATION_WINDOW_SIZE);
  const latestRequestRef = useRef(0);
  const lifecycleGenerationRef = useRef(0);
  const ownerIdRef = useRef<string | null>(userId);

  const replaceNotifications = useCallback((next: Notification[]) => {
    const visible = deduplicateNotifications(next)
      .sort(compareNotificationsNewestFirst)
      .slice(0, visibleWindowSizeRef.current);
    const visibleIds = new Set(visible.map(notification => notification.notiSn));
    for (const id of liveUpsertsRef.current.keys()) {
      if (!visibleIds.has(id)) liveUpsertsRef.current.delete(id);
    }
    for (const id of readRevisionsRef.current.keys()) {
      if (!visibleIds.has(id)) readRevisionsRef.current.delete(id);
    }
    notificationsRef.current = visible;
    setNotifications(visible);
  }, []);

  const replaceUnreadCount = useCallback((next: number) => {
    const safe = Math.max(0, next);
    unreadCountRef.current = safe;
    setUnreadCount(safe);
  }, []);

  const reportFetchError = useCallback((message: string) => {
    setError(message);
    if (!errorNotifiedRef.current) {
      errorNotifiedRef.current = true;
      toast(message, 'error');
    }
  }, [toast]);

  const fetchNotifications = useCallback(async () => {
    // [2026-08-04] 조회 실패를 '알림 없음' 으로 번역하던 경로를 제거했다.
    //
    //   종전 구현:
    //     client.get('/notifications').catch(() => [])
    //     client.get('/notifications/unread-count').catch(() => 0)
    //
    //   내부 .catch 가 오류를 먹어 버려서 **바깥 try/catch 가 애초에 발화하지 못했다.**
    //   즉 아래에 있던 "알림을 불러오는데 실패했습니다" 토스트는 API 실패로는 절대 뜨지 않았고,
    //   500 이든 네트워크 단절이든 화면에는 빈 목록 + 미읽음 0 이 표시됐다.
    //   드로어는 그 상태를 '활성화된 알림이 없습니다' 로 렌더한다 —
    //   **보안 알림이 오고 있는데 사용자는 조용하다고 믿는** 상황이 만들어진다.
    //
    //   Promise.allSettled 로 두 호출을 개별 판정한다:
    //     · 목록 실패 → 오류 상태로 올리고 **기존 목록을 지우지 않는다**(지우는 것도 거짓말이다)
    //     · 카운트만 실패 → 목록은 살리고 배지는 직전 값을 유지한다(0 으로 덮으면 미읽음이 사라진다)
    if (!userId || ownerIdRef.current !== userId) return;

    const requestId = ++latestRequestRef.current;
    const lifecycleGeneration = lifecycleGenerationRef.current;

    // 조회 중 WS/read 변경이 발생하면 한 번 즉시 재조회한다. 두 번째에도 트래픽이 계속되면
    // 목록에는 patch를 재생하고 전체 count는 현재 값을 보존한 뒤 다음 60초 reconcile에 맡긴다.
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const barrierRevision = localRevisionRef.current;
      const [listResult, countResult] = await Promise.allSettled([
        executeGeneratedOperation(getNotificationsOperation, { query: {} }),
        executeGeneratedOperation(getUnreadCountOperation, {}),
      ]);

      if (requestId !== latestRequestRef.current
          || lifecycleGeneration !== lifecycleGenerationRef.current
          || ownerIdRef.current !== userId) {
        return;
      }

      if (listResult.status === 'rejected') {
        reportFetchError('알림을 불러오지 못했습니다.');
        return;
      }

      const candidates = Array.isArray(listResult.value.list) ? listResult.value.list : null;
      const parsed: Notification[] = [];
      let invalidPayload = candidates === null;
      for (const candidate of candidates ?? []) {
        const item = normalizeNotification(candidate);
        if (!item) {
          invalidPayload = true;
          break;
        }
        parsed.push(item);
      }
      if (invalidPayload) {
        reportFetchError('알림 응답 형식이 올바르지 않습니다.');
        return;
      }

      const responseSize = listResult.value.size;
      if (typeof responseSize === 'number' && Number.isSafeInteger(responseSize) && responseSize > 0) {
        visibleWindowSizeRef.current = responseSize;
      }

      errorNotifiedRef.current = false;
      setError(null);

      const currentRevision = localRevisionRef.current;
      const concurrentLocalChange = currentRevision !== barrierRevision;
      const deduplicated = deduplicateNotifications(parsed);
      const snapshotById = new Map(deduplicated.map(item => [item.notiSn, item]));

      // journal은 snapshot이 해당 사실을 실제로 포함한 뒤에만 비운다. 단순히 두 번째 요청이
      // 끝났다는 이유로 지우면 캐시/복제 지연 시 WS 알림이나 성공한 읽음 처리가 다시 사라진다.
      for (const id of liveUpsertsRef.current.keys()) {
        if (snapshotById.has(id)) liveUpsertsRef.current.delete(id);
      }
      for (const id of readRevisionsRef.current.keys()) {
        if (snapshotById.get(id)?.readYn === 'Y') readRevisionsRef.current.delete(id);
      }

      const reconciled = overlayLocalChanges(
        deduplicated,
        liveUpsertsRef.current,
        readRevisionsRef.current,
      );
      replaceNotifications(reconciled);
      for (const notification of notificationsRef.current) {
        rememberNotificationId(
          recentNotificationIdsRef.current,
          notification.notiSn,
          visibleWindowSizeRef.current,
        );
      }

      if (countResult.status === 'fulfilled'
          && !concurrentLocalChange
          && pendingReadMutationsRef.current.size === 0) {
        replaceUnreadCount(countResult.value);
      }
      // 카운트 실패 또는 barrier 뒤 변경 시 배지를 0/오래된 snapshot으로 덮지 않는다.

      if (!concurrentLocalChange) {
        return;
      }
    }
  }, [replaceNotifications, replaceUnreadCount, reportFetchError, userId]);

  const handleNewNotification = useCallback((message: IMessage) => {
    let decoded: unknown;
    try {
      decoded = JSON.parse(message.body) as unknown;
    } catch {
      return;
    }
    const newNotif = normalizeNotification(decoded);
    if (!newNotif) {
      return;
    }

    // STOMP 재전달이나 REST와의 중첩은 같은 알림을 두 건/배지 +2로 만들면 안 된다.
    if (!rememberNotificationId(
      recentNotificationIdsRef.current,
      newNotif.notiSn,
      visibleWindowSizeRef.current,
    )) return;

    const revision = ++localRevisionRef.current;
    liveUpsertsRef.current.set(newNotif.notiSn, { revision, notification: newNotif });
    replaceNotifications([
      newNotif,
      ...notificationsRef.current.filter(item => item.notiSn !== newNotif.notiSn),
    ]);
    if (newNotif.readYn === 'N') {
      replaceUnreadCount(unreadCountRef.current + 1);
    }

    // 실시간 토스트 표시
    toast(newNotif.notiTtlNm || '새로운 알림이 도착했습니다.', 'success');
  }, [replaceNotifications, replaceUnreadCount, toast]);

  // 사용자 경계가 바뀌면 이전 사용자의 화면 상태와 delayed request를 함께 폐기한다.
  useLayoutEffect(() => {
    if (ownerIdRef.current === userId) return;
    ownerIdRef.current = userId;
    lifecycleGenerationRef.current += 1;
    latestRequestRef.current += 1;
    localRevisionRef.current = 0;
    liveUpsertsRef.current.clear();
    readRevisionsRef.current.clear();
    pendingReadMutationsRef.current.clear();
    recentNotificationIdsRef.current.clear();
    visibleWindowSizeRef.current = DEFAULT_NOTIFICATION_WINDOW_SIZE;
    errorNotifiedRef.current = false;
    replaceNotifications([]);
    replaceUnreadCount(0);
    setError(null);
  }, [replaceNotifications, replaceUnreadCount, userId]);

  const beginReadMutations = (ids: number[], generation: number) => {
    for (const id of ids) {
      const pending = pendingReadMutationsRef.current.get(id);
      if (pending?.generation === generation) {
        pending.requests += 1;
        pending.wasUnread ||= notificationsRef.current.some(
          notification => notification.notiSn === id && notification.readYn === 'N',
        );
      } else {
        pendingReadMutationsRef.current.set(id, {
          generation,
          requests: 1,
          wasUnread: notificationsRef.current.some(
            notification => notification.notiSn === id && notification.readYn === 'N',
          ),
          countAccounted: false,
        });
      }
    }
  };

  const finishReadMutations = (ids: number[], generation: number) => {
    for (const id of ids) {
      const pending = pendingReadMutationsRef.current.get(id);
      if (!pending || pending.generation !== generation) continue;
      pending.requests -= 1;
      if (pending.requests === 0) pendingReadMutationsRef.current.delete(id);
    }
  };

  const accountReadMutation = (id: number, generation: number): boolean => {
    const pending = pendingReadMutationsRef.current.get(id);
    if (!pending || pending.generation !== generation || pending.countAccounted) return false;
    pending.countAccounted = true;
    return pending.wasUnread;
  };

  // 초기 로드 및 WebSocket 구독 설정
  useEffect(() => {
    const generation = ++lifecycleGenerationRef.current;
    latestRequestRef.current += 1;
    if (!userId) return;

    let userSub: { unsubscribe: () => void } | null = null;
    if (wsClient && isConnected) {
      // Spring user destination은 Principal에 바인딩된다. 경로에 클라이언트 제공 user.id를 넣지 않아야
      // 타 사용자 큐를 지정하는 우회가 생기지 않고, 서버의 convertAndSendToUser와 정확히 대응한다.
      // SUBSCRIBE frame을 먼저 보내고 그 다음 REST snapshot을 읽어 사이의 유실 창을 줄인다.
      try {
        userSub = wsClient.subscribe('/user/queue/notifications', message => {
          if (generation === lifecycleGenerationRef.current && ownerIdRef.current === userId) {
            handleNewNotification(message);
          }
        });
      } catch {
        // 연결 상태 확인과 SUBSCRIBE 사이에 broker가 끊길 수 있다. 구독 실패가 effect 전체를
        // 중단시켜 REST 초기 조회와 60초 reconcile까지 잃지 않도록 폴링 경로를 계속 설치한다.
        userSub = null;
      }
    }

    // effect 본문에서는 구독만 동기 완료하고, 조회는 다음 microtask에서 시작한다. cleanup으로
    // generation이 바뀐 경우 fetch 내부 guard가 결과를 폐기한다.
    queueMicrotask(() => {
      if (generation === lifecycleGenerationRef.current && ownerIdRef.current === userId) {
        void fetchNotifications();
      }
    });
    // 연결 중에도 broker 재연결·일시 유실을 REST 정본으로 주기적으로 되맞춘다.
    const interval = setInterval(() => { void fetchNotifications(); }, 60000);

    return () => {
      clearInterval(interval);
      try {
        userSub?.unsubscribe();
      } catch {
        // 이미 끊어진 broker에서 unsubscribe가 실패해도 lifecycle 폐기는 반드시 수행한다.
      } finally {
        if (generation === lifecycleGenerationRef.current) {
          lifecycleGenerationRef.current += 1;
          latestRequestRef.current += 1;
        }
      }
    };
  }, [fetchNotifications, wsClient, isConnected, userId, handleNewNotification]);

  const markAsRead = async (id: number) => {
    if (!userId || ownerIdRef.current !== userId) return;
    const generation = lifecycleGenerationRef.current;
    beginReadMutations([id], generation);
    try {
      await executeGeneratedOperation(markAsReadOperation, { path: { notiSn: id } });
      if (generation !== lifecycleGenerationRef.current || ownerIdRef.current !== userId) return;

      const decrementUnreadCount = accountReadMutation(id, generation);
      const revision = ++localRevisionRef.current;
      readRevisionsRef.current.set(id, revision);
      replaceNotifications(notificationsRef.current.map(
        n => n.notiSn === id ? { ...n, readYn: 'Y' } : n,
      ));
      if (decrementUnreadCount) replaceUnreadCount(unreadCountRef.current - 1);
    } catch {
      if (generation === lifecycleGenerationRef.current && ownerIdRef.current === userId) {
        toast('알림 읽음 처리에 실패했습니다.', 'error');
      }
    } finally {
      finishReadMutations([id], generation);
    }
  };

  /**
   * 화면에 불러온 알림을 읽음 처리한다.
   *
   * ⚠ [2026-08-29] '모두' 가 아니다. `notifications` 는 `GET /notifications` 첫 응답이고
   * 페이지 파라미터를 주지 않으므로 서버 기본 페이지 크기만큼만 담긴다. 반면 배지의
   * `unreadCount` 는 `/notifications/unread-count` 로 받는 **서버 전체** 미읽음 수다.
   *
   * 종전에는 그 일부만 처리하고 `setUnreadCount(0)` 으로 배지를 덮은 뒤
   * '모든 알림을 읽음 처리했습니다.' 를 띄웠다 — **미읽음이 남아 있는데 화면은 0 이라고
   * 말했다.** 헤더 배지가 사라지므로 사용자는 확인할 방법도 없다.
   *
   * 진짜 일괄 읽음은 서버 신설(@Modifying UPDATE ... WHERE rcvrId AND readYn='N')이 필요하다.
   * 그때까지는 처리한 범위를 그대로 말하고, 배지는 0 으로 덮지 않고 처리한 만큼만 뺀다.
   */
  const markAllAsRead = async () => {
    if (!userId || ownerIdRef.current !== userId) return;
    const unreadIds = notificationsRef.current.filter(n => n.readYn === 'N').map(n => n.notiSn);
    if (unreadIds.length === 0) return;
    const generation = lifecycleGenerationRef.current;
    beginReadMutations(unreadIds, generation);
    let shouldReconcile = false;

    try {
      const results = await Promise.allSettled(unreadIds.map(notiSn => (
        executeGeneratedOperation(markAsReadOperation, { path: { notiSn } })
      )));
      if (generation !== lifecycleGenerationRef.current || ownerIdRef.current !== userId) return;
      if (results.some(result => result.status === 'rejected')) {
        shouldReconcile = true;
        toast('일부 알림을 읽음 처리하지 못했습니다.', 'error');
        return;
      }

      const captured = new Set(unreadIds);
      const accountedIds = unreadIds.filter(id => accountReadMutation(id, generation));
      if (unreadIds.length > 0) {
        const revision = ++localRevisionRef.current;
        for (const id of unreadIds) readRevisionsRef.current.set(id, revision);
        replaceNotifications(notificationsRef.current.map(
          n => captured.has(n.notiSn) ? { ...n, readYn: 'Y' } : n,
        ));
        replaceUnreadCount(unreadCountRef.current - accountedIds.length);
      }
      toast(`불러온 알림 ${unreadIds.length}건을 읽음 처리했습니다.`, 'success');
    } catch {
      if (generation === lifecycleGenerationRef.current && ownerIdRef.current === userId) {
        shouldReconcile = true;
        toast('일부 알림을 읽음 처리하지 못했습니다.', 'error');
      }
    } finally {
      finishReadMutations(unreadIds, generation);
      if (shouldReconcile
          && generation === lifecycleGenerationRef.current
          && ownerIdRef.current === userId) {
        void fetchNotifications();
      }
    }
  };

  return {
    notifications,
    unreadCount,
    error,
    markAsRead,
    markAllAsRead,
    refresh: fetchNotifications,
  };
}
