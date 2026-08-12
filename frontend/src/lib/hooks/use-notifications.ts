'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import type { IMessage } from '@stomp/stompjs';
import client from '@/lib/api/client';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';

export interface Notification {
  notiSn: string;
  notiTtlNm: string;
  notiCn: string;
  notiDt: string;
  readYn: 'Y' | 'N';
  type?: 'SECURITY' | 'SYSTEM' | 'ACTIVITY' | 'INFO';
}

type NotificationKind = NonNullable<Notification['type']>;
const NOTIFICATION_KINDS = new Set<NotificationKind>(['SECURITY', 'SYSTEM', 'ACTIVITY', 'INFO']);

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** REST/WS 외부 입력을 화면 상태에 넣기 전에 최소 계약으로 정규화한다. */
function normalizeNotification(value: unknown): Notification | null {
  if (!isRecord(value)) return null;
  const notiSn = typeof value.notiSn === 'string' ? value.notiSn : '';
  const notiTtlNm = typeof value.notiTtlNm === 'string' ? value.notiTtlNm : '';
  const notiCn = typeof value.notiCn === 'string' ? value.notiCn : '';
  if (!notiSn || !notiTtlNm) return null;

  const inferredType: NotificationKind = notiTtlNm.includes('보안')
    ? 'SECURITY'
    : notiTtlNm.includes('시스템') ? 'SYSTEM' : 'ACTIVITY';
  const suppliedType = typeof value.type === 'string' ? value.type as NotificationKind : null;
  const type = suppliedType && NOTIFICATION_KINDS.has(suppliedType) ? suppliedType : inferredType;
  const dateCandidate = typeof value.notiDt === 'string'
    ? value.notiDt
    : typeof value.crtDt === 'string' ? value.crtDt : null;

  return {
    notiSn,
    notiTtlNm,
    notiCn,
    notiDt: dateCandidate || new Date().toISOString(),
    readYn: value.readYn === 'Y' ? 'Y' : 'N',
    type,
  };
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
    const [listResult, countResult] = await Promise.allSettled([
      client.get('/notifications'),
      client.get('/notifications/unread-count')
    ]);

    if (listResult.status === 'rejected') {
      console.error('Failed to fetch notifications:', listResult.reason);
      setError('알림을 불러오지 못했습니다.');
      // 60초 폴링이라 매번 토스트를 띄우면 화면이 잠긴다. 오류 '전이' 에서만 한 번 알린다.
      if (!errorNotifiedRef.current) {
        errorNotifiedRef.current = true;
        toast('알림을 불러오지 못했습니다.', 'error');
      }
      return;
    }

    errorNotifiedRef.current = false;
    setError(null);

    // client.ts 인터셉터가 이미 data.data를 떼서 주므로 바로 사용합니다.
    const listPayload = listResult.value as unknown;
    const candidates = Array.isArray(listPayload)
      ? listPayload
      : isRecord(listPayload) && Array.isArray(listPayload.list) ? listPayload.list : null;
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
      setError('알림 응답 형식이 올바르지 않습니다.');
      if (!errorNotifiedRef.current) {
        errorNotifiedRef.current = true;
        toast('알림 응답 형식이 올바르지 않습니다.', 'error');
      }
      return;
    }
    setNotifications(parsed);

    if (countResult.status === 'fulfilled') {
      const countData = countResult.value as unknown as number | { count: number };
      setUnreadCount(typeof countData === 'number' ? countData : (countData?.count || 0));
    } else {
      // 배지를 0 으로 떨어뜨리지 않는다 — '미읽음 없음' 은 조회 실패와 구분돼야 한다.
      console.error('Failed to fetch unread notification count:', countResult.reason);
    }
  }, [toast]);

  const handleNewNotification = useCallback((message: IMessage) => {
    let decoded: unknown;
    try {
      decoded = JSON.parse(message.body) as unknown;
    } catch {
      console.warn('Ignored malformed WebSocket notification payload');
      return;
    }
    const newNotif = normalizeNotification(decoded);
    if (!newNotif) {
      console.warn('Ignored WebSocket notification that violates the notification contract');
      return;
    }

    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);

    // 실시간 토스트 표시
    toast(newNotif.notiTtlNm || '새로운 알림이 도착했습니다.', 'success');
  }, [toast]);

  // 초기 로드 및 WebSocket 구독 설정
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }

    if (wsClient && isConnected) {
      // Spring user destination은 Principal에 바인딩된다. 경로에 클라이언트 제공 user.id를 넣지 않아야
      // 타 사용자 큐를 지정하는 우회가 생기지 않고, 서버의 convertAndSendToUser와 정확히 대응한다.
      const userSub = wsClient.subscribe('/user/queue/notifications', handleNewNotification);

      return () => {
        userSub.unsubscribe();
      };
    } else {
      // 폴백: WebSocket을 사용할 수 없는 경우 60초마다 폴링
      const interval = setInterval(() => {
        if (user) fetchNotifications();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, wsClient, isConnected, user, handleNewNotification]);

  const markAsRead = async (id: string) => {
    try {
      await client.post(`/notifications/${id}/read`);
      // Update local state immediately for better UX
      setNotifications(prev => prev.map(n => n.notiSn === id ? { ...n, readYn: 'Y' } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (error) {
      console.error('Failed to mark notification as read:', error);
      toast('알림 읽음 처리에 실패했습니다.', 'error');
    }
  };

  const markAllAsRead = async () => {
    const unreadIds = notifications.filter(n => n.readYn === 'N').map(n => n.notiSn);
    if (unreadIds.length === 0) return;

    try {
      await Promise.all(unreadIds.map(id => client.post(`/notifications/${id}/read`)));
      setNotifications(prev => prev.map(n => ({ ...n, readYn: 'Y' })));
      setUnreadCount(0);
      toast('모든 알림을 읽음 처리했습니다.', 'success');
    } catch (error) {
      console.error('Failed to mark all notifications as read:', error);
      // [2026-08-04] 종전에는 조용히 재조회만 했다. 사용자는 '모두 읽음' 을 눌렀는데
      //   아무 반응이 없고 배지가 그대로라 버튼이 고장 난 것으로 읽는다.
      //   일부만 성공했을 수도 있으므로 서버 상태로 되맞추되, 실패 사실은 알린다.
      toast('일부 알림을 읽음 처리하지 못했습니다.', 'error');
      fetchNotifications(); // Sync with server on failure
    }
  };

  return { notifications, unreadCount, error, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
