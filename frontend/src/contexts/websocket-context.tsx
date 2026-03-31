'use client';

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
  const isConnecting = useRef(false);  // 중복 연결 방지

  // 콜백 함수 메모이제이션으로 불필요한 리렌더링 방지
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

  useEffect(() => {
    // 사용자 없으면 연결 해제
    if (!user) {
      if (stompClient.current?.active) {
        stompClient.current.deactivate();
        setIsConnected(false);
      }
      return;
    }

    // 중복 연결 방지
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
        // 디버그 로그는 개발 환경에서만
        if (process.env.NODE_ENV === 'development') {
          console.debug('[WebSocket]', str);
        }
      },
    });

    client.onConnect = () => {
      console.log('Connected to WebSocket');
      setIsConnected(true);
      isConnecting.current = false;

      // 1. 공통 공지사항 채널 구독
      client.subscribe('/topic/notices', handleNotice);

      // 2. 사용자 개별 알림 채널 구독 (결재, 댓글 등)
      client.subscribe('/user/queue/notifications', handleNotification);
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

    // 정리 함수에서 확실히 해제
    return () => {
      if (client.active) {
        client.deactivate();
      }
      stompClient.current = null;
      setIsConnected(false);
      isConnecting.current = false;
    };
  }, [user, handleNotice, handleNotification]);  // 메모이제이션된 콜백 사용

  return (
    <WebSocketContext.Provider value={{ client: stompClient.current, isConnected }}>
      {children}
    </WebSocketContext.Provider>
  );
}
