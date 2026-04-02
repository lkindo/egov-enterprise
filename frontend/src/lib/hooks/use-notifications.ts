
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
      // client.ts ?명꽣?됲꽣媛 ?대? data.data 瑜님댁꽌 二쇰濡諛붾줈 ъ슜합니다
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
      // ?먮윭 로그 異쒕젰 (?꾨줈?뺤뀡?먯꽌님console.error 님?먮윭 紐⑤땲?곕쭅 ?쒕퉬님ъ슜 沅뚯옣)
      console.error('Failed to fetch notifications:', error);
      // ъ슜?먯뿉寃님좎뒪님硫붿떆吏 ?쒖떆
      toast('?뚮┝님遺덈윭ㅻ뒗님ㅽ뙣있습니다.', 'error');
    }
  }, [toast]);

  const handleNewNotification = useCallback((message: IMessage) => {
    const newNotif: Notification = JSON.parse(message.body);
    setNotifications(prev => [newNotif, ...prev]);
    setUnreadCount(prev => prev + 1);

    // Show Real-time Toast
    toast(newNotif.ntfcSj || '새로운?뚮┝님?꾩갑있습니다.', 'success');
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
      toast('?뚮┝ ?쎌쓬 泥섎━님ㅽ뙣있습니다.', 'error');
    }
  };

  return { notifications, unreadCount, markAsRead, refresh: fetchNotifications };
}
