
import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  client: Client | null;
  isConnected: boolean;
}

const WebSocketContext = createContext<WebSocketContextType>({ client: null, isConnected: false });

export const useWebSocket = () => useContext(WebSocketContext);

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [connection, setConnection] = useState<{ userId: string; client: Client } | null>(null);
  const stompClient = useRef<Client | null>(null);
  const isConnecting = useRef(false);

  useEffect(() => {
    if (!user) {
      if (stompClient.current?.active) {
        stompClient.current.deactivate();
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
      setConnection({ userId: user.id, client });
      isConnecting.current = false;
      // Provider는 연결 수명만 소유한다. 여기서도 개인 큐를 구독하면 useNotifications 소비자의
      // 구독과 중복되어 알림 하나당 토스트가 두 번 뜬다. 목적별 구독·payload 검증은 소비자가 맡는다.
    };

    client.onStompError = (frame) => {
      console.error('STOMP error', frame);
      setConnection(current => current?.client === client ? null : current);
      isConnecting.current = false;
    };

    client.onDisconnect = () => {
      setConnection(current => current?.client === client ? null : current);
      isConnecting.current = false;
    };

    client.activate();
    stompClient.current = client;

    return () => {
      if (client.active) {
        client.deactivate();
      }
      stompClient.current = null;
      isConnecting.current = false;
    };
  }, [user]);

  // 연결은 소유 사용자 ID와 함께 상태로 보관한다. 로그아웃·사용자 교체 렌더에서는 effect를
  // 기다리지 않고 즉시 null을 내려 이전 사용자의 Client가 새 소비자에게 노출되지 않는다.
  const connectedClient = connection && user && connection.userId === user.id
    ? connection.client
    : null;
  const contextValue = useMemo<WebSocketContextType>(() => ({
    client: connectedClient,
    isConnected: connectedClient !== null,
  }), [connectedClient]);

  return (
    <WebSocketContext.Provider value={contextValue}>
      {children}
    </WebSocketContext.Provider>
  );
}
