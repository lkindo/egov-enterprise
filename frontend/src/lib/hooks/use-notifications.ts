'use client';

import { useState, useEffect, useCallback } from 'react';
import { IMessage, StompSubscription } from '@stomp/stompjs';
import client from '@/lib/api/client';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';

export interface Notification {
  ntfcId: string;
  ntfcSj: string;
  ntfcCn: string;
  ntfcPnttm: string;
  readYn: 'Y' | 'N';
  type?: string;
}

export function useNotifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { client: wsClient, isConnected } = useWebSocket();
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchNotifications = useCallback(async () => {
    try {
      // client.ts 인터셉터가 이미 data.data 를 풀어서 주므로 바로 사용합니다.
      const [listResult, countResult]: unknown[] = await Promise.all([
        client.get('/notifications').catch(() => []),
        client.get('/notifications/unread-count').catch(() => 0)
      ]);

      const list = listResult as Notification[] | { list: Notification[] };
      const countData = countResult as number | { count: number };

      const actualList = Array.isArray(list) ? list : (list?.list || []);
      setNotifications(actualList);
      setUnreadCount(typeof countData === 'number' ? countData : (countData?.count || 0));
    } catch {
      // 에러 로그 출력 (프로덕션에서는 console.error 대신 에러 모니터링 서비스 사용 권장)
      console.error('Failed to fetch notifications:', error);
      // 사용자에게 토스트 메시지 표시
      toast('알림을 불러오는데 실패했습니다.', 'error');
    }
  }, [toast]);

  const handleNewNotification = useCallback((message: IMessage) => {
    const newNotif: Notification = JSON.parse(message.body);
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show Real-time Toast
    toast(newNotif.ntfcSj || '새로운 알림이 도착했습니다.', 'success');
  }, [toast]);

  // Initial load and WebSocket subscription
  useEffect(() => {
    if (user) {
      fetchNotifications();
    }

    if (wsClient && isConnected) {
      // Subscribe to public notifications
      const publicSub = wsClient.subscribe('/topic/public', handleNewNotification);

      // Subscribe to user-specific notifications
      let userSub: StompSubscription | null = null;
      if (user?.id) {
        userSub = wsClient.subscribe(`/user/${user.id}/queue/notifications`, handleNewNotification);
      }

      return () => {
        publicSub.unsubscribe();
        if (userSub) userSub.unsubscribe();
      };
    } else {
      // Fallback: Poll every 60 seconds if WS is not available
      const interval = setInterval(() => {
        if (user) fetchNotifications();
      }, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, wsClient, isConnected, user, handleNewNotification]);

  const markAsRead = async (id: string) => {
    try {
      await client.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch {
      console.error('Failed to mark notification as read:', error);
      toast('알림 읽음 처리에 실패했습니다.', 'error');
    }
  };

  return { notifications, unreadCount, markAsRead, refresh: fetchNotifications };
}
