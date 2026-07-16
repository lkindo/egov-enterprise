
import React, { createContext, useContext, useEffect, useRef, useState, useCallback } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';
import { useToast } from '@/app/components/ui/toast';

interface WebSocketContextType {
  client: Client | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ client: null, isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const { toast, success } = useToast();
  const [isConnected, setIsConnected] = useState(false);
  const stompClient = useRef<Client | null>(null);
  const isConnecting = useRef(false);

  const handleNotice = useCallback((message: any) => {
    try {
      const payload = JSON.parse(message.body);
      toast(payload.message || '새로운 공지사항이 등록되었습니다.', 'info');
    } catch (e) {
      console.error('Failed to parse notice message:', e);
    }
  }, [toast]);

  const handleNotification = useCallback((message: any) => {
    try {
      const payload = JSON.parse(message.body);
      if (payload.type === 'APPROVAL') {
        success(`[결재 알림] ${payload.message}`);
      } else {
        toast(payload.message, 'info');
      }
    } catch (e) {
      console.error('Failed to parse notification message:', e);
    }
  }, [toast, success]);

  const handleNoticeRef = useRef(handleNotice);
  const handleNotificationRef = useRef(handleNotification);

  useEffect(() => {
    handleNoticeRef.current = handleNotice;
    handleNotificationRef.current = handleNotification;
  }, [handleNotice, handleNotification]);

  useEffect(() => {
    if (!user) {
      if (stompClient.current?.active) {
        stompClient.current.deactivate();
        setIsConnected(false);
      }
      return;
    }

    if (isConnecting.current || stompClient.current?.active) {
      return;
    }

    isConnecting.current = true;

    const client = new Client({
      // 동일 출처(same-origin) 상대 경로 → next.config rewrites('/ws/:path*')가 백엔드 WebSocket으로 프록시
      webSocketFactory: () => new SockJS('/ws'),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
      debug: (str) => {
        if (process.env.NODE_ENV === 'development') {
          console.debug('[WebSocket]', str);
        }
      },
    });

    client.onConnect = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      isConnecting.current = false;
      // '/topic/notices'는 백엔드에 발행자(publisher)가 없어 구독 제거 (BE는 /topic/public, /topic/dashboard/stats만 발행)
      client.subscribe('/user/queue/notifications', (msg) => handleNotificationRef.current(msg));
    };

    client.onStompError = (frame) => {
      console.error('STOMP error', frame);
      setIsConnected(false);
      isConnecting.current = false;
    };

    client.onDisconnect = () => {
      console.log('Disconnected from WebSocket');
      setIsConnected(false);
      isConnecting.current = false;
    };

    client.activate();
    stompClient.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
      stompClient.current = null;
      setIsConnected(false);
      isConnecting.current = false;
    };
  }, [user]);

  return (
    <WebSocketContext.Provider value={{ client: stompClient.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
