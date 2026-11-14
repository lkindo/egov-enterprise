
import React, { createContext, useContext, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import type { Client } from '@stomp/stompjs';
import { useAuth } from './AuthContext';
import { loadTransport } from './websocket-transport';

/**
 * 연결 라이브러리를 불러오지 못했을 때 다시 불러오기까지의 간격(ms). 마지막 값으로 계속 시도한다 — 일시 장애가 끝나면 연결이 돌아오고,
 * 계속 실패해도 1분에 한 번이다. 공급자가 정리되면(로그아웃·사용자 전환·언마운트) 기다리던 재시도도 취소한다.
 */
const TRANSPORT_RETRY_DELAYS_MS = [5_000, 15_000, 30_000, 60_000] as const;

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
    let opened: Client | null = null;
    let retryTimer: ReturnType<typeof setTimeout> | undefined;
    let failures = 0;

    // 불러오는 사이에 로그아웃·사용자 전환·언마운트가 끝났으면(disposed) 연결을 만들지 않는다 — 이전 사용자의 소켓이 남지 않게.
    //   불러오지 못하면 잠시 뒤 다시 불러온다. 연결 객체가 없으면 stompjs 의 재연결(reconnectDelay)도 돌지 않아, 다시 부르지 않으면
    //   같은 사용자·권한 버전인 동안 연결이 영영 돌아오지 않는다(알림은 폴링으로 보정되지만 실시간 대시보드는 연결 중에 머문다).
    //   기다리는 동안 소비자는 연결 없음으로 동작한다.
    const load = () => void loadTransport().then(([{ Client: StompClient }, { default: SockJS }]) => {
      if (disposed) return;
      const client = new StompClient({
        // 동일 출처(same-origin) 상대 경로 → next.config rewrites('/ws/:path*')가 백엔드 WebSocket으로 프록시
        // HttpOnly same-origin cookie authenticates the handshake; no token enters JS or the URL.
        webSocketFactory: () => new SockJS('/ws', undefined, { transports: ['websocket', 'xhr-streaming', 'xhr-polling'] }),
        reconnectDelay: 5000,
        heartbeatIncoming: 4000,
        heartbeatOutgoing: 4000,
      });
      opened = client;

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

      // 서버가 소켓을 닫으면(권한이 바뀐 세션을 정책 위반으로 끊는 경우 등) stompjs 는 onDisconnect 가 아니라 이것만 부른다 — onDisconnect 는
      // DISCONNECT 응답을 받을 때만 온다. 연결됨으로 남기면 소비자의 subscribe 가 'There is no underlying STOMP connection' 으로 던지고,
      // 재연결 뒤에도 같은 클라이언트라 소비자가 다시 구독하지 않는다(2026-11-07 CUBRID 대표 E2E 에서 재현).
      client.onWebSocketClose = () => {
        if (store.get()?.client === client) store.set(null);
      };

      client.activate();
    }, () => {
      if (disposed) return;
      const delay = TRANSPORT_RETRY_DELAYS_MS[Math.min(failures, TRANSPORT_RETRY_DELAYS_MS.length - 1)];
      failures += 1;
      retryTimer = setTimeout(load, delay);
    });
    load();

    return () => {
      disposed = true;
      if (retryTimer !== undefined) clearTimeout(retryTimer);
      if (opened) void opened.deactivate();
    };
  }, [store, userId, identityId, authorizationVersion]);

  return (
    <WebSocketContext.Provider value={store}>
      {children}
    </WebSocketContext.Provider>
  );
}
