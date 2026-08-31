/**
 * 알림 훅 테스트.
 *
 * [2026-08-09 신설] 커버리지 0% 였다(65줄 전량 미커버).
 *
 * 이 훅의 소스에는 **과거 사고 기록**이 그대로 남아 있다(2026-08-04):
 *
 * > 내부 `.catch` 가 오류를 먹어 버려서 바깥 try/catch 가 애초에 발화하지 못했다.
 * > 500 이든 네트워크 단절이든 화면에는 빈 목록 + 미읽음 0 이 표시됐다.
 * > 드로어는 그 상태를 '활성화된 알림이 없습니다' 로 렌더한다 —
 * > **보안 알림이 오고 있는데 사용자는 조용하다고 믿는** 상황이 만들어진다.
 *
 * 그 수정은 적용됐는데 **회귀 탐지기가 없었다.** 이 파일이 그것이다.
 *
 * 핵심은 셋 다 "조용한 거짓말" 을 막는 것이다:
 *   ① 조회 실패를 '알림 없음' 으로 번역하지 않는다 — 기존 목록도 지우지 않는다(지우는 것도 거짓말이다)
 *   ② 카운트만 실패하면 배지를 0 으로 덮지 않는다 — '미읽음 없음' 과 조회 실패는 다르다
 *   ③ 60초 폴링이라 매 실패마다 토스트를 띄우면 화면이 잠긴다 — 오류 '전이' 에서만 알린다
 */

vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useNotifications } from '../use-notifications';
import client from '@/lib/api/client';

const toast = vi.fn();
let wsState: { client: unknown; isConnected: boolean } = { client: null, isConnected: false };
let authUser: { id: string } | null = { id: 'U1' };

vi.mock('@/lib/api/client', () => ({ default: { getRaw: vi.fn(), requestRaw: vi.fn() } }));
vi.mock('@/contexts/websocket-context', () => ({ useWebSocket: () => wsState }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: authUser }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast }) }));

const NOTIF = {
  notiSn: 1, notiTtlNm: '보안 경고', notiCn: '내용', notiDt: '2026-08-09T00:00:00Z', readYn: 'N',
};

/** 목록·카운트 응답을 지정한다. Error 를 주면 그 호출만 실패한다. */
function mockFetch(list: unknown, count: unknown) {
  vi.mocked(client.getRaw).mockImplementation((url: string) => {
    const value = url.includes('unread-count') ? count : list;
    const data = !url.includes('unread-count') && Array.isArray(value)
      ? { list: value, total: value.length, page: 0, size: 10, totalPage: value.length ? 1 : 0 }
      : value;
    return value instanceof Error
      ? Promise.reject(value)
      : Promise.resolve({ success: true, code: 'S000', message: 'success', data } as never);
  });
}

describe('useNotifications', () => {
  // ⚠ 전역 가짜 타이머를 쓰지 않는다. RTL 의 waitFor 는 내부적으로 타이머로 폴링하는데,
  //   vitest 가짜 타이머가 그것까지 멈춰 세워 **모든 waitFor 가 타임아웃**한다(실측 15s × 전건).
  //   시간을 앞당겨야 하는 폴링 테스트에서만 국소적으로 켠다.
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useRealTimers();
    wsState = { client: null, isConnected: false };
    authUser = { id: 'U1' };
    mockFetch([NOTIF], 3);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  describe('조회 실패를 "알림 없음" 으로 번역하지 않는다', () => {
    it('목록 조회가 실패하면 오류 상태를 올린다', async () => {
      mockFetch(new Error('500'), 3);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => expect(result.current.error).toBe('알림을 불러오지 못했습니다.'));
      // 오류인데 error 가 null 이면 UI 가 '알림 없음' 으로 렌더한다 — 그것이 이 훅이 고친 사고다.
      expect(result.current.notifications).toEqual([]);
    });

    it('목록 조회 실패 시 기존 목록을 지우지 않는다 — 지우는 것도 거짓말이다', async () => {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));

      mockFetch(new Error('네트워크 단절'), 3);
      await act(async () => { await result.current.refresh(); });

      expect(result.current.error).not.toBeNull();
      // 실패했다고 목록을 비우면 "알림이 사라졌다" 는 또 다른 거짓 신호가 된다.
      expect(result.current.notifications).toHaveLength(1);
    });

    it('카운트만 실패하면 배지를 0 으로 덮지 않는다', async () => {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.unreadCount).toBe(3));

      mockFetch([NOTIF], new Error('count 실패'));
      await act(async () => { await result.current.refresh(); });

      // 0 으로 떨어뜨리면 '미읽음 없음' 과 구분되지 않아 사용자가 알림을 놓친다.
      expect(result.current.unreadCount).toBe(3);
      expect(result.current.error).toBeNull();
      expect(result.current.notifications).toHaveLength(1);
    });

    it('오류 토스트는 전이에서만 한 번 뜬다 — 60초 폴링이 화면을 잠그면 안 된다', async () => {
      mockFetch(new Error('500'), 3);
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.error).not.toBeNull());

      const afterFirst = toast.mock.calls.length;
      await act(async () => { await result.current.refresh(); });
      await act(async () => { await result.current.refresh(); });

      // 억제가 없으면 폴링마다 토스트가 쌓여 화면이 잠긴다.
      expect(toast.mock.calls.length).toBe(afterFirst);
      expect(afterFirst).toBe(1);
    });

    it('복구되면 오류가 걷히고 다음 실패에서 다시 알린다', async () => {
      mockFetch(new Error('500'), 3);
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.error).not.toBeNull());

      mockFetch([NOTIF], 3);
      await act(async () => { await result.current.refresh(); });
      expect(result.current.error).toBeNull();

      mockFetch(new Error('다시 실패'), 3);
      await act(async () => { await result.current.refresh(); });

      // 억제 플래그가 리셋되지 않으면 두 번째 장애를 사용자가 영영 모른다.
      expect(toast.mock.calls.length).toBe(2);
    });
  });

  describe('응답 정규화', () => {
    it('배열과 { list } 두 형태를 모두 받는다', async () => {
      mockFetch({ list: [NOTIF, { ...NOTIF, notiSn: 2 }] }, 0);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => expect(result.current.notifications).toHaveLength(2));
    });

    it('제목으로 종류를 추론한다 — 보안/시스템/그 외', async () => {
      mockFetch([
        { ...NOTIF, notiSn: 1, notiTtlNm: '보안 경고' },
        { ...NOTIF, notiSn: 2, notiTtlNm: '시스템 점검' },
        { ...NOTIF, notiSn: 3, notiTtlNm: '댓글이 달렸습니다' },
      ], 0);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => expect(result.current.notifications).toHaveLength(3));
      // 종류가 어긋나면 보안 알림이 일반 알림 색으로 표시돼 눈에 띄지 않는다.
      expect(result.current.notifications.map(n => n.type))
        .toEqual(['SECURITY', 'SYSTEM', 'ACTIVITY']);
    });

    it('서버가 명시한 종류가 추론보다 우선한다', async () => {
      mockFetch([{ ...NOTIF, notiTtlNm: '보안 경고', type: 'INFO' }], 0);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => expect(result.current.notifications[0]?.type).toBe('INFO'));
    });

    it('readYn 이 없으면 미읽음으로 본다', async () => {
      mockFetch([{ notiSn: 1, notiTtlNm: 'T', notiCn: 'C' }], 0);

      const { result } = renderHook(() => useNotifications());

      // 기본값을 'Y' 로 두면 새 알림이 이미 읽은 것으로 표시돼 사용자가 놓친다.
      await waitFor(() => expect(result.current.notifications[0]?.readYn).toBe('N'));
    });

    it('카운트는 generated numeric 응답을 그대로 읽는다', async () => {
      mockFetch([NOTIF], 7);

      const { result } = renderHook(() => useNotifications());

      await waitFor(() => expect(result.current.unreadCount).toBe(7));
    });

    it('OpenAPI에 없는 { count } wrapper는 직전 배지를 덮어쓰지 않는다', async () => {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.unreadCount).toBe(3));

      mockFetch([NOTIF], { count: 7 });
      await act(async () => { await result.current.refresh(); });

      expect(result.current.unreadCount).toBe(3);
    });
  });

  describe('읽음 처리', () => {
    it('단건 읽음은 즉시 반영하고 배지를 하나 줄인다', async () => {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      vi.mocked(client.requestRaw).mockResolvedValue(
        { success: true, code: 'S000', message: 'success', data: null } as never,
      );

      await act(async () => { await result.current.markAsRead(1); });

      expect(client.requestRaw).toHaveBeenCalledWith({
        url: 'notifications/1/read',
        method: 'post',
      });
      expect(result.current.notifications[0]?.readYn).toBe('Y');
      expect(result.current.unreadCount).toBe(2);
    });

    it('배지는 0 아래로 내려가지 않는다', async () => {
      mockFetch([NOTIF], 0);
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));
      vi.mocked(client.requestRaw).mockResolvedValue(
        { success: true, code: 'S000', message: 'success', data: null } as never,
      );

      await act(async () => { await result.current.markAsRead(1); });

      // 음수 배지는 화면에 '-1' 로 뜬다.
      expect(result.current.unreadCount).toBe(0);
    });

    it('읽음 처리 실패는 알리고 상태를 바꾸지 않는다', async () => {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      vi.mocked(client.requestRaw).mockRejectedValue(new Error('500'));

      await act(async () => { await result.current.markAsRead(1); });

      // 실패했는데 읽음으로 바꾸면 서버와 화면이 어긋난 채 남는다.
      expect(result.current.notifications[0]?.readYn).toBe('N');
      expect(result.current.unreadCount).toBe(3);
      expect(toast).toHaveBeenCalledWith('알림 읽음 처리에 실패했습니다.', 'error');
    });

    it('모두 읽음: 미읽음이 없으면 아무것도 하지 않는다', async () => {
      mockFetch([{ ...NOTIF, readYn: 'Y' }], 0);
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));
      vi.mocked(client.requestRaw).mockClear();

      await act(async () => { await result.current.markAllAsRead(); });

      // 불필요한 요청을 보내면 미읽음 0 인 화면에서도 서버가 두들겨 맞는다.
      expect(client.requestRaw).not.toHaveBeenCalled();
    });

    /**
     * [2026-08-29] 종전 이름은 '모두 읽음 성공 시 전부 읽음으로 바꾸고 배지를 비운다' 였고
     * `unreadCount` 가 0 이 되는 것을 **의도된 동작으로 고정**하고 있었다.
     *
     * 그런데 이 픽스처가 정확히 결함 시나리오다 — 서버 전체 미읽음은 3건인데(unread-count)
     * 화면에 불러온 알림은 1건뿐이다. 이 동작은 불러온 1건만 읽음 처리하면서 배지를 0 으로
     * 덮었다. 즉 **미읽음 2건이 남아 있는데 화면은 0 이라고 말했고**, 배지가 사라지므로
     * 사용자는 확인할 방법도 없었다.
     *
     * 처리한 만큼만 빼는 것이 사실이다. 진짜 일괄 읽음은 서버 신설이 선행된다.
     */
    it('불러온 알림만 읽음 처리하고 배지는 처리한 만큼만 뺀다', async () => {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));
      await waitFor(() => expect(result.current.unreadCount).toBe(3));
      vi.mocked(client.requestRaw).mockResolvedValue(
        { success: true, code: 'S000', message: 'success', data: null } as never,
      );

      await act(async () => { await result.current.markAllAsRead(); });

      expect(result.current.notifications.every(n => n.readYn === 'Y')).toBe(true);
      expect(result.current.unreadCount, '불러오지 않은 미읽음까지 0 으로 덮으면 안 된다').toBe(2);
    });

    it('모두 읽음 실패는 알리고 서버 상태로 되맞춘다', async () => {
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));
      vi.mocked(client.requestRaw).mockRejectedValue(new Error('500'));
      const getCallsBefore = vi.mocked(client.getRaw).mock.calls.length;

      await act(async () => { await result.current.markAllAsRead(); });

      // 조용히 재조회만 하면 사용자는 버튼이 고장 난 것으로 읽는다 — 알리고 되맞춘다.
      expect(toast).toHaveBeenCalledWith('일부 알림을 읽음 처리하지 못했습니다.', 'error');
      expect(vi.mocked(client.getRaw).mock.calls.length).toBeGreaterThan(getCallsBefore);
    });
  });

  describe('구독과 정리', () => {
    it('WebSocket 이 없으면 60초 폴링으로 대체한다', async () => {
      // ⚠ 렌더 **전에** 가짜 타이머를 켜야 한다 — 훅이 붙이는 setInterval 이 가짜여야
      //   advanceTimersByTime 으로 앞당길 수 있다. 렌더 뒤에 켜면 이미 실제 타이머라 안 움직인다.
      vi.useFakeTimers();
      renderHook(() => useNotifications());

      // 초기 로드(마이크로태스크)를 흘려보낸다. waitFor 는 가짜 타이머와 충돌하므로 쓰지 않는다.
      await act(async () => { await Promise.resolve(); });
      const before = vi.mocked(client.getRaw).mock.calls.length;
      expect(before).toBeGreaterThan(0);

      await act(async () => { vi.advanceTimersByTime(60000); });

      // 폴백 폴링이 없으면 WebSocket 이 안 붙는 환경에서 알림이 영원히 갱신되지 않는다.
      expect(vi.mocked(client.getRaw).mock.calls.length).toBeGreaterThan(before);
    });

    it('언마운트하면 폴링을 멈춘다', async () => {
      const { result, unmount } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));

      unmount();
      const after = vi.mocked(client.getRaw).mock.calls.length;

      // 언마운트 뒤라 새 타이머는 붙지 않는다 — 실제 타이머로 충분히 기다려 확인한다.
      await new Promise(r => setTimeout(r, 50));

      // clearInterval 이 빠지면 화면을 떠난 뒤에도 60초마다 서버를 두들긴다.
      expect(vi.mocked(client.getRaw).mock.calls.length).toBe(after);
    });

    it('WebSocket 이 연결되면 Principal 전용 큐만 구독하고 언마운트 시 해제한다', async () => {
      const userSub = { unsubscribe: vi.fn() };
      const subscribe = vi.fn((_destination: string, _handler: (message: { body: string }) => void) => userSub);
      wsState = { client: { subscribe }, isConnected: true };

      const { unmount } = renderHook(() => useNotifications());

      await waitFor(() => expect(subscribe).toHaveBeenCalledTimes(1));
      expect(subscribe.mock.calls.map(c => c[0]))
        .toEqual(['/user/queue/notifications']);

      unmount();
      // 해제하지 않으면 화면을 떠난 뒤에도 메시지가 도착해 사라진 상태를 갱신한다.
      expect(userSub.unsubscribe).toHaveBeenCalled();
    });

    it('실시간 알림이 오면 맨 앞에 붙이고 배지를 늘린다', async () => {
      let handler: ((m: { body: string }) => void) | undefined;
      const subscribe = vi.fn((_dest: string, cb: (m: { body: string }) => void) => {
        handler = cb;
        return { unsubscribe: vi.fn() };
      });
      wsState = { client: { subscribe }, isConnected: true };

      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));

      await act(async () => {
        handler!({ body: JSON.stringify({ notiSn: 99, notiTtlNm: '보안 경고', notiCn: 'C' }) });
      });

      // 뒤에 붙이면 새 알림이 스크롤 아래로 밀려 보이지 않는다.
      expect(result.current.notifications[0]?.notiSn).toBe(99);
      expect(result.current.notifications).toHaveLength(2);
      expect(result.current.unreadCount).toBe(4);
      expect(toast).toHaveBeenCalledWith('보안 경고', 'success');
    });

    it('형식이 깨진 WebSocket 프레임은 상태·배지를 오염시키지 않는다', async () => {
      let handler: ((m: { body: string }) => void) | undefined;
      const subscribe = vi.fn((_dest: string, cb: (m: { body: string }) => void) => {
        handler = cb;
        return { unsubscribe: vi.fn() };
      });
      wsState = { client: { subscribe }, isConnected: true };
      const { result } = renderHook(() => useNotifications());
      await waitFor(() => expect(result.current.notifications).toHaveLength(1));
      const beforeCount = result.current.unreadCount;

      await act(async () => {
        handler!({ body: '{invalid-json' });
        handler!({ body: JSON.stringify({ notiTtlNm: 'ID 없는 알림' }) });
      });

      expect(result.current.notifications).toEqual([expect.objectContaining({ notiSn: 1 })]);
      expect(result.current.unreadCount).toBe(beforeCount);
      expect(toast).not.toHaveBeenCalledWith('ID 없는 알림', 'success');
    });

    it('로그인 사용자가 없으면 조회하지 않는다', async () => {
      authUser = null;

      renderHook(() => useNotifications());
      vi.useFakeTimers();
      await act(async () => { vi.advanceTimersByTime(60000); });
      vi.useRealTimers();

      // 비로그인 상태에서 알림 API 를 두들기면 401 이 쌓인다.
      expect(client.getRaw).not.toHaveBeenCalled();
    });
  });
});
