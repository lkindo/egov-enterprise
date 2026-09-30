import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppNotificationDrawer } from '../app-notification-drawer';

/**
 * [2026-10-01] 드로어 필터는 사실(읽음 여부)로만 거른다. 종전의 '보안·시스템·활동' 은 제목 글자로 추측한 분류를
 * 불러온 최근 알림 안에서만 적용해, '보안' 탭이 비면 보안 알림이 전혀 없는 것처럼 읽혔다.
 */
describe('AppNotificationDrawer 필터', () => {
  const handlers = { onClose: vi.fn(), onMarkRead: vi.fn(), onMarkAllRead: vi.fn(), onDelete: vi.fn() };
  const notifications = [
    { id: 1, title: '비밀번호가 변경되었습니다', message: '', time: '', isRead: true, type: 'SECURITY' as const },
    { id: 2, title: '새 쪽지', message: '', time: '', isRead: false, type: 'ACTIVITY' as const },
  ];

  it('추측 분류 탭 없이 전체·읽지 않음만 두고, 범위가 최근 알림임을 말한다', async () => {
    render(<AppNotificationDrawer isOpen notifications={notifications} {...handlers} />);
    expect(screen.queryByRole('button', { name: '보안' })).toBeNull();
    expect(screen.queryByRole('button', { name: '시스템' })).toBeNull();
    expect(screen.getByText('최근 알림')).toBeInTheDocument();

    const unread = screen.getByRole('button', { name: '읽지 않음' });
    await userEvent.click(unread);
    expect(unread).toHaveAttribute('aria-pressed', 'true');
    const dialog = screen.getByRole('dialog');
    expect(within(dialog).getByText('새 쪽지')).toBeInTheDocument();
    expect(within(dialog).queryByText('비밀번호가 변경되었습니다')).toBeNull();
  });

  it('읽지 않은 최근 알림이 없으면 전체가 아니라 최근 알림 범위라고 말한다', async () => {
    render(<AppNotificationDrawer isOpen notifications={[notifications[0]]} {...handlers} />);
    await userEvent.click(screen.getByRole('button', { name: '읽지 않음' }));
    expect(screen.getByText('최근 알림 가운데 읽지 않은 알림이 없습니다')).toBeInTheDocument();
  });
});
