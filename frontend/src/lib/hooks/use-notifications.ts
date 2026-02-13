'use client';

import { useState, useEffect, useCallback } from 'react';
import client from '@/lib/api/client';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/AuthContext';

export function useNotifications() {
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const { client: wsClient, isConnected } = useWebSocket();
  const { user } = useAuth();

  const fetchNotifications = useCallback(async () => {
    try {
      const [listRes, countRes] = await Promise.all([
        client.get('/notifications'),
        client.get('/notifications/unread-count')
      ]);
      setNotifications(listRes.data.data || []);
      setUnreadCount(countRes.data.data || 0);
    } catch (e) {
      // Quietly ignore
    }
  }, []);

  // Initial load and WebSocket subscription
  useEffect(() => {
    fetchNotifications();

    if (wsClient && isConnected) {
      // Subscribe to public notifications
      const publicSub = wsClient.subscribe('/topic/public', (message) => {
        const newNotif = JSON.parse(message.body);
        setNotifications(prev => [newNotif, ...prev]);
        setUnreadCount(prev => prev + 1);
      });

      // Subscribe to user-specific notifications
      let userSub: any = null;
      if (user?.userId) {
        userSub = wsClient.subscribe(`/user/${user.userId}/queue/notifications`, (message) => {
          const newNotif = JSON.parse(message.body);
          setNotifications(prev => [newNotif, ...prev]);
          setUnreadCount(prev => prev + 1);
        });
      }

      return () => {
        publicSub.unsubscribe();
        if (userSub) userSub.unsubscribe();
      };
    } else {
      // Fallback: Poll every 60 seconds if WS is not available
      const interval = setInterval(fetchNotifications, 60000);
      return () => clearInterval(interval);
    }
  }, [fetchNotifications, wsClient, isConnected, user]);

  const markAsRead = async (id: string) => {
    try {
      await client.put(`/notifications/${id}/read`);
      fetchNotifications();
    } catch (e) {
      console.error('Failed to mark notification as read');
    }
  };

  return { notifications, unreadCount, markAsRead, refresh: fetchNotifications };
}
