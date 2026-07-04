'use client';

import { useState, useEffect, useCallback } from 'react';
import { IMessage, StompSubscription } from '@stomp/stompjs';
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

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { client: wsClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      // client.ts 인터셉터가 이미 data.data를 떼서 주므로 바로 사용합니다.
      const [listResult, countResult]: any[] = await Promise.all([
        client.get('/notifications').catch(() => []),
        client.get('/notifications/unread-count').catch(() => 0)
      ]);

      const list = listResult as Notification[] | { list: Notification[] };
      const countData = countResult as number | { count: number };

      const actualList = (Array.isArray(list) ? list : (list?.list || [])).map((n: any) => ({
        notiSn: n.notiSn,
        notiTtlNm: n.notiTtlNm,
        notiCn: n.notiCn,
        notiDt: n.notiDt || n.crtDt || new Date().toISOString(),
        readYn: n.readYn || 'N',
        type: n.type || (n.notiTtlNm?.includes('보안') ? 'SECURITY' : n.notiTtlNm?.includes('시스템') ? 'SYSTEM' : 'ACTIVITY')
      }));
      setNotifications(actualList);
      setUnreadCount(typeof countData === 'number' ? countData : (countData?.count || 0));
    } catch (error) {
      // 에러 로그 출력 (프로덕션에서는 console.error 대신 에러 모니터링 서비스 사용 권장)
      console.error('Failed to fetch notifications:', error);
      // 사용자에게 토스트 메시지 표시
      toast('알림을 불러오는데 실패했습니다.', 'error');
    }
  }, [toast]);

  const handleNewNotification = useCallback((message: IMessage) => {
    const rawNotif: any = JSON.parse(message.body);
    
    // Normalize notification object to match frontend expectations
    const newNotif: Notification = {
      notiSn: rawNotif.notiSn,
      notiTtlNm: rawNotif.notiTtlNm,
      notiCn: rawNotif.notiCn,
      notiDt: rawNotif.notiDt || rawNotif.crtDt || new Date().toISOString(),
      readYn: rawNotif.readYn || 'N',
      type: rawNotif.type || (rawNotif.notiTtlNm?.includes('보안') ? 'SECURITY' : rawNotif.notiTtlNm?.includes('시스템') ? 'SYSTEM' : 'ACTIVITY')
    };

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
      // 공용 알림 구독
      const publicSub = wsClient.subscribe('/topic/public', handleNewNotification);

      // 사용자별 알림 구독
      let userSub: StompSubscription | null = null;
      if (user?.id) {
        // Spring convertAndSendToUser + userDestinationPrefix '/user' 는 인증된 STOMP 세션의
        // principal 로 사용자를 식별한다. 경로에 id 를 넣으면(/user/{id}/queue/...) 서버 전송
        // 목적지와 매칭되지 않아 개인 알림이 뱃지/목록에 반영되지 않는다. 올바른 형태:
        userSub = wsClient.subscribe('/user/queue/notifications', handleNewNotification);
      }

      return () => {
        publicSub.unsubscribe();
        if (userSub) userSub.unsubscribe();
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
      fetchNotifications(); // Sync with server on failure
    }
  };

  return { notifications, unreadCount, markAsRead, markAllAsRead, refresh: fetchNotifications };
}
