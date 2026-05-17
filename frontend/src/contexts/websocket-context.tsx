
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

    const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080/api/v1';
    const socketUrl = API_URL.replace('/api/v1', '/ws');

    const client = new Client({
      webSocketFactory: () => new SockJS(socketUrl),
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
      client.subscribe('/topic/notices', (msg) => handleNoticeRef.current(msg));
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
