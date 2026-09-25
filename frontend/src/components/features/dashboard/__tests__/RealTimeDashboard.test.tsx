import { act, fireEvent, render, screen } from '@testing-library/react';
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

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
    connection.isConnected = true;
    vi.stubGlobal('Notification', { permission: 'default', requestPermission });
  });

  afterEach(() => vi.unstubAllGlobals());

  it('허용된 통계·개인 큐만 구독하고 언마운트 시 모두 해제한다', () => {
    const view = render(<RealTimeDashboard />);

    expect(subscribe.mock.calls.map((call) => call[0])).toEqual([
      '/topic/dashboard/stats',
      '/user/queue/notifications',
    ]);

    view.unmount();
    expect(unsubscribe).toHaveBeenCalledTimes(2);
  });

  it('통계 계약을 위반한 프레임은 무시하고 정상 프레임만 반영한다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;

    act(() => statsHandler({ body: JSON.stringify({ activeUsers: -1 }) }));
    expect(screen.getByText('현재 접속자').previousElementSibling).toHaveTextContent('—');

    act(() => statsHandler({ body: JSON.stringify({ activeUsers: 7, visitsPerMinute: 3, newPosts: 2, alerts: 1 }) }));
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('3명/분')).toBeInTheDocument();
  });

  it('유효한 통계를 한 번도 수신하지 않은 상태를 실제 0으로 표시하지 않는다', () => {
    render(<RealTimeDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('실시간 연결됨');
    expect(screen.getByText('· 통계 수신 대기 중')).toBeInTheDocument();
    expect(screen.getAllByText('—')).toHaveLength(4);
  });

  it('연결이 끊기면 연결 상태만 말하고 대기 문구를 덧붙이지 않는다', () => {
    connection.isConnected = false;
    render(<RealTimeDashboard />);

    expect(screen.getByRole('status')).toHaveTextContent('연결 끊김');
    expect(screen.queryByText('· 통계 수신 대기 중')).not.toBeInTheDocument();
    expect(subscribe).not.toHaveBeenCalled();
  });

  it('알림 조회 실패는 0건 대신 확인 불가로 표시하고 나머지 통계는 유지한다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;

    act(() => statsHandler({ body: JSON.stringify({
      activeUsers: 7, visitsPerMinute: 3, newPosts: 2, alerts: 0,
      newPostsAvailable: true, alertsAvailable: false,
    }) }));

    expect(screen.getByText('전체 미읽음 알림').previousElementSibling).toHaveTextContent('—');
    expect(screen.getByText('알림 수 확인 불가')).toBeInTheDocument();
    expect(screen.getByText('현재 접속자').previousElementSibling).toHaveTextContent('7');
    // 집계 실패는 해당 카드가 말한다. 연결 상태 문구(live region)는 연결만 말한다.
    expect(screen.getByRole('status')).toHaveTextContent(/^실시간 연결됨$/);
    expect(screen.queryByText('· 통계 수신 대기 중')).not.toBeInTheDocument();
  });

  it('게시글 집계 실패를 다른 정상 집계와 구분하고 복구된 실제 0건을 표시한다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    const counts = { activeUsers: 7, visitsPerMinute: 3, newPosts: 0, alerts: 4, alertsAvailable: true };

    act(() => statsHandler({ body: JSON.stringify({ ...counts, newPostsAvailable: false }) }));
    expect(screen.getByText('신규 게시글').previousElementSibling).toHaveTextContent('—');
    expect(screen.getByText('게시글 수 확인 불가')).toBeInTheDocument();
    expect(screen.getByText('전체 미읽음 알림').previousElementSibling).toHaveTextContent('4');

    act(() => statsHandler({ body: JSON.stringify({ ...counts, newPostsAvailable: true }) }));
    expect(screen.getByText('신규 게시글').previousElementSibling).toHaveTextContent('0');
    expect(screen.queryByText('게시글 수 확인 불가')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('실시간 연결됨');
  });

  it('집계 가용 상태가 boolean이 아닌 프레임은 마지막 정상 통계를 덮어쓰지 않는다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;
    const counts = { activeUsers: 7, visitsPerMinute: 3, newPosts: 2, alerts: 4 };

    act(() => statsHandler({ body: JSON.stringify(counts) }));
    act(() => statsHandler({ body: JSON.stringify({ ...counts, alerts: 0, alertsAvailable: 'false' }) }));

    expect(screen.getByText('전체 미읽음 알림').previousElementSibling).toHaveTextContent('4');
    expect(screen.getByRole('status')).toHaveTextContent('실시간 연결됨');
  });

  it('모든 사용자의 미읽음 합계 카드는 범위를 이름에 싣고 급한 일처럼 강조하지 않는다', () => {
    render(<RealTimeDashboard />);
    const statsHandler = handlers.get('/topic/dashboard/stats')!;

    act(() => statsHandler({ body: JSON.stringify({ activeUsers: 1, visitsPerMinute: 1, newPosts: 0, alerts: 37 }) }));

    const value = screen.getByText('전체 미읽음 알림').previousElementSibling!;
    expect(value).toHaveTextContent('37');
    expect(screen.getByText('전체 사용자')).toBeInTheDocument();
    expect(value.closest('[class*="bg-destructive/5"]')).toBeNull();
    expect(screen.queryByText('알림', { exact: true })).not.toBeInTheDocument();
  });

  it('브라우저 알림 권한은 진입 즉시가 아니라 사용자가 알림을 열 때만 요청한다', () => {
    render(<RealTimeDashboard />);
    expect(requestPermission).not.toHaveBeenCalled();

    const button = screen.getByRole('button', { name: '알림 열기' });
    expect(button).toHaveAttribute('aria-expanded', 'false');
    expect(button).not.toHaveAttribute('aria-haspopup');
    fireEvent.click(button);

    expect(requestPermission).toHaveBeenCalledTimes(1);
    expect(button).toHaveAttribute('aria-expanded', 'true');
    expect(screen.getByRole('region', { name: '실시간 알림 목록' })).toBeInTheDocument();
  });

  // [2026-09-25] 종전 테스트는 깨진 프레임만 보내 "버린다" 만 확인했고, 서버가 실제로 보내는 알림이
  //   표시되는지는 한 번도 보지 않았다 — 그래서 모든 알림을 버리는 결함이 통과했다. NotificationService 가
  //   /user/queue/notifications 로 보내는 NotificationDto 형태 그대로 넣는다.
  it('서버가 보내는 NotificationDto 프레임을 목록과 미읽음 수에 반영한다', () => {
    render(<RealTimeDashboard />);
    const notificationHandler = handlers.get('/user/queue/notifications')!;

    act(() => notificationHandler({
      body: JSON.stringify({
        notiSn: 42,
        notiTtlNm: '결재 요청',
        notiCn: '새 결재 문서가 도착했습니다.',
        notiDt: '2026-09-25T10:15:30',
        notiIvlVal: null,
        rcvrId: 'USRCNFRM_00000000001',
        readYn: 'N',
        linkUrl: '/approvals',
        crtDt: '2026-09-25T10:15:30',
      }),
    }));
    fireEvent.click(screen.getByRole('button', { name: '알림 열기, 읽지 않음 1개' }));

    const region = screen.getByRole('region', { name: '실시간 알림 목록' });
    expect(region).toHaveTextContent('결재 요청');
    expect(region).toHaveTextContent('새 결재 문서가 도착했습니다.');
    expect(region).toHaveTextContent('2026-09-25 10:15:30');
    expect(screen.queryByText('새로운 알림이 없습니다.')).not.toBeInTheDocument();
  });

  it('형식이 깨진 개인 알림은 목록과 미읽음 수를 오염시키지 않는다', () => {
    render(<RealTimeDashboard />);
    const notificationHandler = handlers.get('/user/queue/notifications')!;

    act(() => notificationHandler({ body: '{broken' }));
    act(() => notificationHandler({ body: JSON.stringify({ id: '1', title: '필드 부족' }) }));
    fireEvent.click(screen.getByRole('button', { name: '알림 열기' }));

    expect(screen.getByText('새로운 알림이 없습니다.')).toBeInTheDocument();
  });
});
