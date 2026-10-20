import { act, render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealTimeDashboard } from '../RealTimeDashboard';

const handlers = new Map<string, (message: { body: string }) => void>();
const unsubscribe = vi.fn();
const subscribe = vi.fn((destination: string, handler: (message: { body: string }) => void) => {
  handlers.set(destination, handler);
  return { id: destination, unsubscribe };
});

const connection = vi.hoisted(() => ({ isConnected: true }));

vi.mock('@/contexts/websocket-context', () => ({
  useWebSocket: () => ({ client: { subscribe }, isConnected: connection.isConnected }),
}));

describe('RealTimeDashboard', () => {
  const requestPermission = vi.fn(async () => 'denied' as NotificationPermission);
  const BrowserNotification = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    connection.isConnected = true;
    vi.stubGlobal('Notification', Object.assign(BrowserNotification, { permission: 'granted', requestPermission }));
  });

  afterEach(() => vi.unstubAllGlobals());

  // [2026-10-20 DEC-OPS-153 원칙] 개인 알림 큐는 머리글(use-notifications.ts) 한 곳만 구독한다. 종전에는 이 구역이 같은 큐를
  //   한 번 더 구독하고 브라우저 알림까지 띄웠다 — 같은 알림이 두 곳에 두 번 들어왔다.
  it('통계 방송 하나만 구독하고 개인 알림 큐는 구독하지 않으며, 언마운트 시 해제한다', () => {
    const view = render(<RealTimeDashboard />);

    expect(subscribe.mock.calls.map((call) => call[0])).toEqual(['/topic/dashboard/stats']);

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(1);
  });

  it('브라우저 알림을 띄우거나 권한을 묻지 않고, 알림 목록 단추를 두지 않는다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    act(() => statsHandler({ body: JSON.stringify({ activeUsers: 1, visitsPerMinute: 1, newPosts: 0 }) }));

    expect(BrowserNotification).not.toHaveBeenCalled();
    expect(requestPermission).not.toHaveBeenCalled();
    expect(screen.queryByRole('button')).toBeNull();
    expect(screen.queryByRole('region', { name: '실시간 알림 목록' })).toBeNull();
  });

  it('통계 계약을 위반한 프레임은 무시하고 정상 프레임만 반영한다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;

    act(() => statsHandler({ body: JSON.stringify({ activeUsers: -1 }) }));
    expect(screen.getByText('실시간 연결 세션(이 서버)').previousElementSibling).toHaveTextContent('—');

    act(() => statsHandler({ body: JSON.stringify({ activeUsers: 7, visitsPerMinute: 3, newPosts: 2 }) }));
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('새 연결(이 서버, 1분마다 초기화)').previousElementSibling).toHaveTextContent('3');
  });

  // [2026-10-20] 모든 사용자의 읽지 않은 알림 합계 카드를 걷었다 — 보는 사람이 처리할 수 있는 숫자가 아니었다. 이전 서버가 그 키를
  //   실은 프레임을 보내도 카드는 되살아나지 않는다.
  it('전체 미읽음 알림 카드를 그리지 않고, 이전 서버 프레임의 알림 합계도 읽지 않는다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;

    act(() => statsHandler({ body: JSON.stringify({
      activeUsers: 1, visitsPerMinute: 1, newPosts: 0, alerts: 37, alertsAvailable: true, alertsProvided: true,
    }) }));

    expect(screen.queryByText('전체 미읽음 알림')).toBeNull();
    expect(screen.queryByText('전체 사용자')).toBeNull();
    expect(screen.queryByText('37')).toBeNull();
    expect(screen.getByText('실시간 연결 세션(이 서버)').previousElementSibling).toHaveTextContent('1');
  });

  it('🚨 집계 구현이 없는 기능(provided=false)의 카드는 그리지 않고, provided 키가 없는 구서버 프레임은 종전대로 그린다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    // 첫 프레임 전에는 알 수 없으므로 카드를 '—' 로 둔다.
    expect(screen.getByText('신규 게시글')).toBeInTheDocument();

    act(() => statsHandler({ body: JSON.stringify({
      activeUsers: 7, visitsPerMinute: 3, newPosts: 0, newPostsAvailable: true, newPostsProvided: false,
    }) }));
    expect(screen.queryByText('신규 게시글')).not.toBeInTheDocument();

    act(() => statsHandler({ body: JSON.stringify({ activeUsers: 7, visitsPerMinute: 3, newPosts: 2 }) }));
    expect(screen.getByText('신규 게시글').previousElementSibling).toHaveTextContent('2');
  });

  it('서버 초기화 전후의 새 연결 횟수를 누적으로 설명하지 않는다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    for (const visitsPerMinute of [3, 0, 1]) {
      act(() => statsHandler({ body: JSON.stringify({ activeUsers: 7, visitsPerMinute, newPosts: 2 }) }));
      expect(screen.getByText('새 연결(이 서버, 1분마다 초기화)').previousElementSibling)
        .toHaveTextContent(String(visitsPerMinute));
      expect(screen.getByText('실시간 연결 세션(이 서버)').previousElementSibling).toHaveTextContent('7');
    }
    expect(screen.getByText('마지막 초기화 이후 연결 횟수이며, 활성 세션 수나 고유 사용자 수가 아닙니다.')).toBeInTheDocument();
    expect(screen.queryByText(/재기동 이후/)).not.toBeInTheDocument();
  });

  // [2026-10-19] 연결 수는 각 서버 인스턴스의 메모리 값이고 단순 브로커가 이 화면이 연결된 서버의 값만 보낸다. 서버를 여러 대
  //   두면 전체 접속자 수가 아니므로 카드가 그 범위를 말한다(공유 저장소를 들이지 않는다).
  it('연결 세션 수가 이 화면이 연결된 서버의 값이며 전체 접속자·고유 사용자 수가 아님을 말한다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    act(() => statsHandler({ body: JSON.stringify({ activeUsers: 7, visitsPerMinute: 3, newPosts: 2 }) }));

    const title = screen.getByText('실시간 연결 세션(이 서버)');
    expect(title.previousElementSibling).toHaveTextContent('7');
    expect(title.nextElementSibling).toHaveTextContent(
      '이 화면이 연결된 서버의 연결 수입니다. 서버를 여러 대 두면 전체 접속자 수가 아니며, 고유 사용자 수도 아닙니다.');
    // 배지도 시점('현재')이 아니라 범위를 말한다 — '현재' 는 전 서버의 지금 접속자로 읽혔다.
    expect(within(title.closest('div.p-6') as HTMLElement).getByText('이 서버', { exact: true })).toBeInTheDocument();
    expect(screen.queryByText('현재', { exact: true })).toBeNull();
    expect(screen.queryByText(/접속자 수$/)).toBeNull();
  });

  it('유효한 통계를 한 번도 수신하지 않은 상태를 실제 0으로 표시하지 않는다', () => {
    render(<RealTimeDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('실시간 연결됨');
    expect(screen.getByText('· 통계 수신 대기 중')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(3);
  });

  it('연결이 끊기면 연결 상태만 말하고 대기 문구를 덧붙이지 않는다', () => {
    connection.isConnected = false;
    render(<RealTimeDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('연결 끊김');
    expect(screen.queryByText('· 통계 수신 대기 중')).not.toBeInTheDocument();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('게시글 집계 실패를 다른 정상 집계와 구분하고 복구된 실제 0건을 표시한다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    const counts = { activeUsers: 7, visitsPerMinute: 3, newPosts: 0 };

    act(() => statsHandler({ body: JSON.stringify({ ...counts, newPostsAvailable: false }) }));
    expect(screen.getByText('신규 게시글').previousElementSibling).toHaveTextContent('—');
    expect(screen.getByText('게시글 수 확인 불가')).toBeInTheDocument();
    expect(screen.getByText('실시간 연결 세션(이 서버)').previousElementSibling).toHaveTextContent('7');
    // 집계 실패는 해당 카드가 말한다. 연결 상태 문구(live region)는 연결만 말한다.
    expect(screen.getByRole('status')).toHaveTextContent(/^실시간 연결됨$/);

    act(() => statsHandler({ body: JSON.stringify({ ...counts, newPostsAvailable: true }) }));
    expect(screen.getByText('신규 게시글').previousElementSibling).toHaveTextContent('0');
    expect(screen.queryByText('게시글 수 확인 불가')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('실시간 연결됨');
  });

  it('집계 가용 상태가 boolean이 아닌 프레임은 마지막 정상 통계를 덮어쓰지 않는다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    const counts = { activeUsers: 7, visitsPerMinute: 3, newPosts: 4 };

    act(() => statsHandler({ body: JSON.stringify(counts) }));
    act(() => statsHandler({ body: JSON.stringify({ ...counts, newPosts: 0, newPostsAvailable: 'false' }) }));

    expect(screen.getByText('신규 게시글').previousElementSibling).toHaveTextContent('4');
    expect(screen.getByRole('status')).toHaveTextContent('실시간 연결됨');
  });
});
