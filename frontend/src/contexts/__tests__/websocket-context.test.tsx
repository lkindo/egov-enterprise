/**
 * WebSocket 컨텍스트 테스트.
 *
 * [2026-08-09 신설] 커버리지 32% 였다(40줄 미커버).
 *
 * 여기는 실시간 알림의 **연결 계층**이다. 조용히 어긋나면 결과가 심각한 쪽으로 기운다:
 *
 *   ① 로그아웃 시 끊지 않으면 → **이전 사용자의 소켓이 살아남아** 알림을 계속 받는다.
 *      화면은 로그아웃됐는데 브라우저는 아직 그 사람의 큐를 구독 중이다.
 *   ② 중복 연결 가드가 풀리면 → 렌더마다 소켓이 늘어 서버 연결이 고갈된다.
 *   ③ 언마운트 정리가 빠지면 → 같은 누수가 화면 전환마다 쌓인다.
 *
 * 셋 다 예외가 나지 않는다. 개발 중에는 연결이 하나 더 있어도 동작하므로 보이지 않고,
 * 부하가 걸린 뒤에야 드러난다.
 */

vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, act } from '@testing-library/react';
import { WebSocketProvider, useWebSocket } from '../websocket-context';

let authUser: { id: string } | null = { id: 'U1' };

/** 마지막으로 생성된 Client 스텁 — 콜백을 직접 발화시키기 위해 붙잡는다. */
type ClientStub = {
  active: boolean;
  activate: ReturnType<typeof vi.fn>;
  deactivate: ReturnType<typeof vi.fn>;
  subscribe: ReturnType<typeof vi.fn>;
  onConnect?: () => void;
  onStompError?: (f: unknown) => void;
  onDisconnect?: () => void;
  config: Record<string, unknown>;
};
const created: ClientStub[] = [];

vi.mock('@stomp/stompjs', () => ({
  Client: vi.fn(function (this: ClientStub, config: Record<string, unknown>) {
    this.config = config;
    this.active = false;
    this.subscribe = vi.fn();
    this.activate = vi.fn(() => { this.active = true; });
    this.deactivate = vi.fn(() => { this.active = false; });
    created.push(this);
  }),
}));
vi.mock('sockjs-client', () => ({ default: vi.fn(() => ({})) }));
vi.mock('../AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));

/** 컨텍스트 값을 밖으로 노출시키는 소비자. */
function Probe({ onValue }: { onValue: (v: ReturnType<typeof useWebSocket>) => void }) {
  onValue(useWebSocket());
  return null;
}

function renderProvider() {
  let latest: ReturnType<typeof useWebSocket> = { client: null, isConnected: false };
  const utils = render(
    <WebSocketProvider>
      <Probe onValue={(v) => { latest = v; }} />
    </WebSocketProvider>
  );
  return { ...utils, get value() { return latest; } };
}

describe('WebSocketProvider', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    created.length = 0;
    authUser = { id: 'U1' };
  });

  describe('연결 수명', () => {
    it('로그인 사용자가 있으면 연결을 시작한다', () => {
      renderProvider();

      expect(created).toHaveLength(1);
      expect(created[0].activate).toHaveBeenCalledTimes(1);
    });

    it('로그인 사용자가 없으면 연결하지 않는다', () => {
      authUser = null;

      renderProvider();

      // 비로그인 상태에서 소켓을 열면 인증 없는 연결이 서버에 쌓인다.
      expect(created).toHaveLength(0);
    });

    it('로그아웃하면 기존 연결을 끊는다 — 이전 사용자의 큐를 계속 듣고 있으면 안 된다', () => {
      const { rerender } = render(
        <WebSocketProvider><Probe onValue={() => {}} /></WebSocketProvider>
      );
      expect(created).toHaveLength(1);
      const first = created[0];

      authUser = null;
      act(() => {
        rerender(<WebSocketProvider><Probe onValue={() => {}} /></WebSocketProvider>);
      });

      // 끊지 않으면 화면은 로그아웃됐는데 브라우저는 아직 그 사람의 알림을 받는다.
      expect(first.deactivate).toHaveBeenCalled();
    });

    it('리렌더가 반복돼도 소켓을 하나만 만든다', () => {
      const { rerender } = render(
        <WebSocketProvider><Probe onValue={() => {}} /></WebSocketProvider>
      );

      act(() => {
        rerender(<WebSocketProvider><Probe onValue={() => {}} /></WebSocketProvider>);
        rerender(<WebSocketProvider><Probe onValue={() => {}} /></WebSocketProvider>);
      });

      // 중복 연결 가드가 풀리면 렌더마다 소켓이 늘어 서버 연결이 고갈된다.
      expect(created).toHaveLength(1);
    });

    it('언마운트하면 연결을 정리한다', () => {
      const { unmount } = renderProvider();
      const client = created[0];
      client.active = true;

      unmount();

      expect(client.deactivate).toHaveBeenCalled();
    });
  });

  describe('연결 상태 전이', () => {
    it('연결되면 isConnected를 켜되 Provider 자체는 사용자 큐를 중복 구독하지 않는다', () => {
      const view = renderProvider();
      expect(view.value.isConnected).toBe(false);

      act(() => { created[0].onConnect?.(); });

      // 실제 알림 구독은 useNotifications가 소유한다. Provider까지 구독하면 같은 알림 토스트가 중복된다.
      expect(created[0].subscribe).not.toHaveBeenCalled();
      expect(view.value.isConnected).toBe(true);
      expect(view.value.client).toBe(created[0]);
    });

    it('STOMP 오류가 나면 연결 해제 상태로 되돌린다', () => {
      const view = renderProvider();
      act(() => { created[0].onConnect?.(); });
      expect(view.value.isConnected).toBe(true);

      act(() => { created[0].onStompError?.({ headers: {} }); });

      // 연결됨으로 남아 있으면 알림 훅이 폴백 폴링으로 넘어가지 않아 알림이 끊긴다.
      expect(view.value.isConnected).toBe(false);
      expect(view.value.client).toBeNull();
    });

    it('끊기면 연결 해제 상태로 되돌린다', () => {
      const view = renderProvider();
      act(() => { created[0].onConnect?.(); });

      act(() => { created[0].onDisconnect?.(); });

      expect(view.value.isConnected).toBe(false);
      expect(view.value.client).toBeNull();
    });

    it('재연결 간격과 하트비트를 설정한다', () => {
      renderProvider();

      // 재연결이 없으면 일시적 단절 후 알림이 영구히 멈춘다.
      expect(created[0].config.reconnectDelay).toBe(5000);
      expect(created[0].config.heartbeatIncoming).toBe(4000);
      expect(created[0].config.heartbeatOutgoing).toBe(4000);
    });
  });

  it('Provider 밖에서 훅을 쓰면 안전한 기본값을 돌려준다', () => {
    let value: ReturnType<typeof useWebSocket> | undefined;
    render(<Probe onValue={(v) => { value = v; }} />);

    // 기본값이 없으면 Provider 밖 컴포넌트가 undefined 접근으로 죽는다.
    expect(value).toEqual({ client: null, isConnected: false });
  });
});
