import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RealTimeDashboard } from '../RealTimeDashboard';

const handlers = new Map<string, (message: { body: string }) => void>();
const unsubscribe = vi.fn();
const subscribe = vi.fn((destination: string, handler: (message: { body: string }) => void) => {
  handlers.set(destination, handler);
  return { id: destination, unsubscribe };
});

vi.mock('@/contexts/websocket-context', () => ({
  useWebSocket: () => ({ client: { subscribe }, isConnected: true }),
}));

describe('RealTimeDashboard', () => {
  const requestPermission = vi.fn(async () => 'denied' as NotificationPermission);

  beforeEach(() => {
    vi.clearAllMocks();
    handlers.clear();
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

    expect(screen.getByRole('status')).toHaveTextContent('통계 수신 대기 중');
    expect(screen.getAllByText('—')).toHaveLength(4);
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

  it('형식이 깨진 개인 알림은 목록과 미읽음 수를 오염시키지 않는다', () => {
    render(<RealTimeDashboard />);
    const notificationHandler = handlers.get('/user/queue/notifications')!;

    act(() => notificationHandler({ body: '{broken' }));
    act(() => notificationHandler({ body: JSON.stringify({ id: '1', title: '필드 부족' }) }));
    fireEvent.click(screen.getByRole('button', { name: '알림 열기' }));

    expect(screen.getByText('새로운 알림이 없습니다.')).toBeInTheDocument();
  });
});
