
import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { useAuth } from './AuthContext';

interface WebSocketContextType {
  client: Client | null;
  isConnected: boolean;
}

type Connection = { userId: string; identityId?: string; authorizationVersion?: string; client: Client };

/**
 * 연결은 context 값이 아니라 구독 저장소로 넘긴다(2026-10-21). 연결이 열리는 때는 첫 화면 직후라, context 값을 바꾸면
 * 스트리밍 공개를 기다리는 셸 경계를 React 가 브라우저에서 다시 그리고 서버 사본이 잠시 숨은 채 남는다. 구독은 연결을 읽는
 * 소비자만 다시 그린다.
 */
function createConnectionStore() {
  let connection: Connection | null = null;
  const listeners = new Set<() => void>();
  return {
    subscribe(listener: () => void) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
    get: () => connection,
    set(next: Connection | null) {
      if (next === connection) return;
      connection = next;
      listeners.forEach(listener => listener());
    },
  };
}

type ConnectionStore = ReturnType<typeof createConnectionStore>;

export const WebSocketContext = createContext<ConnectionStore | null>(null);
const noSubscription = () => () => {};
const noConnection = () => null;

export function useWebSocket(): WebSocketContextType {
  const store = useContext(WebSocketContext);
  const { user } = useAuth();
  const connection = useSyncExternalStore(store?.subscribe ?? noSubscription, store?.get ?? noConnection, noConnection);
  // 연결은 소유 사용자 ID와 함께 보관한다. 로그아웃·사용자 교체 렌더에서는 effect를
  // 기다리지 않고 즉시 null을 내려 이전 사용자의 Client가 새 소비자에게 노출되지 않는다.
  const client = connection && user?.id && connection.userId === user.id
    && connection.identityId === user.esntlId && connection.authorizationVersion === user.authorizationVersion
    ? connection.client
    : null;
  return useMemo(() => ({ client, isConnected: client !== null }), [client]);
}

export function WebSocketProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const userId = user?.id;
  const identityId = user?.esntlId;
  const authorizationVersion = user?.authorizationVersion;
  const [store] = useState(createConnectionStore);

  useEffect(() => {
    if (!userId) return;
    let disposed = false;

    const client = new Client({
      // 동일 출처(same-origin) 상대 경로 → next.config rewrites('/ws/:path*')가 백엔드 WebSocket으로 프록시
      // HttpOnly same-origin cookie authenticates the handshake; no token enters JS or the URL.
      webSocketFactory: () => new SockJS('/ws', undefined, { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }),
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      if (disposed) return;
      store.set({ userId, identityId, authorizationVersion, client });
      // Provider는 연결 수명만 소유한다. 여기서도 개인 큐를 구독하면 useNotifications 소비자의
      // 구독과 중복되어 알림 하나당 토스트가 두 번 뜬다. 목적별 구독·payload 검증은 소비자가 맡는다.
    };

    client.onStompError = () => {
      if (store.get()?.client === client) store.set(null);
    };

    client.onDisconnect = () => {
      if (store.get()?.client === client) store.set(null);
    };

    client.activate();

    return () => {
      disposed = true;
      void client.deactivate();
    };
  }, [store, userId, identityId, authorizationVersion]);

  return (
    <WebSocketContext.Provider value={store}>
      {children}
    </WebSocketContext.Provider>
  );
}
