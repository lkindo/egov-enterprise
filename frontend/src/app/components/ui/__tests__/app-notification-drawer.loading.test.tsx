import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { AppNotificationDrawer } from '../app-notification-drawer';

/**
 * [2026-09-15 DEC-OPS-100] 헤더 알림 서랍은 첫 조회가 끝나기 전의 빈 목록을 "알림 없음"으로 말하지 않는다.
 * 알림 센터 표에만 로딩 상태를 연결했을 때 같은 훅을 쓰는 헤더 서랍은 여전히 없음이라고 말했다.
 */
describe('AppNotificationDrawer 로딩', () => {
  const handlers = { onClose: vi.fn(), onMarkRead: vi.fn(), onMarkAllRead: vi.fn(), onDelete: vi.fn() };

  it('알림 시각은 표준 형식으로 표시하고 누락·손상 시각은 미상으로 남긴다', () => {
    render(<AppNotificationDrawer isOpen notifications={[
      { id: 1, title: '정상 시각', message: '', time: '2026-09-27T09:10:11.123456', isRead: false },
      { id: 2, title: '날짜 없음', message: '', time: '', isRead: false },
      { id: 3, title: '손상 시각', message: '', time: 'broken', isRead: false },
    ]} {...handlers} />);

    expect(screen.getByText('2026-09-27 09:10:11')).toBeInTheDocument();
    expect(screen.getAllByText('-')).toHaveLength(2);
    expect(screen.queryByText('broken')).not.toBeInTheDocument();
  });

  it('첫 조회 중에는 불러오는 중이라고 말하고 알림이 없다고 말하지 않는다', () => {
    render(<AppNotificationDrawer isOpen loading notifications={[]} {...handlers} />);

    expect(screen.getByRole('status')).toHaveTextContent('알림을 불러오는 중…');
    expect(screen.queryByText('활성화된 알림이 없습니다')).toBeNull();
  });

  it('조회가 끝나고 비어 있으면 알림이 없다고 말한다', () => {
    render(<AppNotificationDrawer isOpen notifications={[]} {...handlers} />);

    expect(screen.getByText('활성화된 알림이 없습니다')).toBeInTheDocument();
  });
});
