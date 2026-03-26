'use client';

import { useState, useEffect, useCallback } from 'react';
import client from '@/lib/api/client';
import { useWebSocket } from '@/contexts/websocket-context';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/app/components/ui/toast';

export function useNotifications() {
 const [notifications, setNotifications] = useState<any[]>([]);
 const [unreadCount, setUnreadCount] = useState(0);
 const { client: wsClient, isConnected } = useWebSocket();
 const { user } = useAuth();
 const { toast } = useToast();

 const fetchNotifications = useCallback(async () => {
 try {
 // client.ts 인터셉터가 이미 data.data를 풀어서 주므로 바로 사용합니다.
 const [list, count]: any = await Promise.all([
 client.get('/notifications').catch(() => []),
 client.get('/notifications/unread-count').catch(() => 0)
 ]);
  const actualList = Array.isArray(list) ? list : (list?.list || []);
  setNotifications(actualList);
  setUnreadCount(typeof count === 'number' ? count : (count?.count || 0));
 } catch (e) {
 // Quietly ignore
 }
 }, []);

 const handleNewNotification = useCallback((message: any) => {
 const newNotif = JSON.parse(message.body);
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
 let userSub: any = null;
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
 } catch (e) {
 console.error('Failed to mark notification as read');
 }
 };

 return { notifications, unreadCount, markAsRead, refresh: fetchNotifications };
}
