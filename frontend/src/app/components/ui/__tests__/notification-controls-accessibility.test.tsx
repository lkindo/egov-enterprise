import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { SmartNotificationHub } from '../smart-notification-hub';
import { AppNotificationDrawer } from '../app-notification-drawer';

const notificationsMock = vi.hoisted(() => ({
  refresh: vi.fn(),
  notifications: [
    {
      notiSn: 1,
      notiTtlNm: '보안 알림',
      notiCn: '확인이 필요합니다.',
      notiDt: '2026-08-21',
      type: 'SECURITY',
      readYn: 'N',
    },
  ],
}));

vi.mock('@/lib/hooks/use-notifications', () => ({
  useNotifications: () => ({
    notifications: notificationsMock.notifications,
    error: null,
    refresh: notificationsMock.refresh,
  }),
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data }: { data: unknown[] }) => <div>알림 {data.length}건</div>,
}));

describe('notification controls accessibility', () => {
  it('알림 필터가 현재 선택 상태를 보조기술에 전달한다', () => {
    render(<SmartNotificationHub />);

    const all = screen.getByRole('button', { name: '전체 알림 필터' });
    const unread = screen.getByRole('button', { name: '읽지 않은 알림 필터' });
    expect(all).toHaveAttribute('aria-pressed', 'true');
    expect(unread).toHaveAttribute('aria-pressed', 'false');

    fireEvent.click(unread);
    expect(all).toHaveAttribute('aria-pressed', 'false');
    expect(unread).toHaveAttribute('aria-pressed', 'true');
  });

  /*
    [2026-09-08] 삭제 버튼은 카드 **바깥**에 둔다.

    미읽음 카드는 카드 전체가 button(클릭 = 읽음 처리)이라, 그 안에 삭제 버튼을 넣으면
    중첩 button 이 되고 보조기술이 두 동작을 구분하지 못한다.
  */
  it('삭제 버튼은 알림 카드 안에 중첩되지 않고 대상을 이름으로 밝힌다', () => {
    const onDelete = vi.fn();
    const onMarkRead = vi.fn();
    render(
      <AppNotificationDrawer
        isOpen
        onClose={vi.fn()}
        onMarkRead={onMarkRead}
        onMarkAllRead={vi.fn()}
        onDelete={onDelete}
        notifications={[{
          id: 21,
          title: '보안 경고',
          message: '확인이 필요합니다.',
          time: '방금 전',
          isRead: false,
          type: 'SECURITY',
        }]}
      />,
    );

    const deleteButton = screen.getByRole('button', { name: '보안 경고 삭제' });
    expect(deleteButton.closest('button:not([aria-label="보안 경고 삭제"])')).toBeNull();

    fireEvent.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith(21);
    // 삭제를 눌렀는데 읽음 처리까지 나가면 두 동작이 겹친다.
    expect(onMarkRead).not.toHaveBeenCalled();
  });

  // [2026-09-06 DEC-OPS-038] 발송 미리보기 데모(NotificationSender)와 알림 페이지 히어로 블록을 걷었다 — 두 스펙도 함께 제거.
  it('업무 링크가 있는 알림은 중첩 button이 아니며 Enter 탐색을 가로막지 않는다', () => {
    const onClose = vi.fn();
    const onMarkRead = vi.fn();
    render(
      <AppNotificationDrawer
        isOpen
        onClose={onClose}
        onMarkRead={onMarkRead}
        onMarkAllRead={vi.fn()}
        onDelete={vi.fn()}
        notifications={[
          {
            id: 7,
            title: '새 쪽지',
            message: '확인할 쪽지가 있습니다.',
            time: '방금 전',
            isRead: false,
            type: 'ACTIVITY',
            linkUrl: '/note',
          },
          {
            id: 9,
            title: '결재 요청',
            message: '확인할 결재가 있습니다.',
            time: '방금 전',
            isRead: false,
            type: 'ACTIVITY',
            linkUrl: '/approvals',
          },
        ]}
      />,
    );

    const link = screen.getByRole('link', { name: '새 쪽지 업무로 이동' });
    expect(screen.getByRole('link', { name: '결재 요청 업무로 이동' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: '알림: 새 쪽지' })).not.toBeInTheDocument();

    const enter = createEvent.keyDown(link, { key: 'Enter', bubbles: true, cancelable: true });
    fireEvent(link, enter);
    expect(enter.defaultPrevented).toBe(false);

    fireEvent.click(link);
    expect(onMarkRead).toHaveBeenCalledWith(7);
    expect(onClose).toHaveBeenCalledOnce();
  });

  it('업무 링크가 없는 알림 카드는 키보드로 읽음 처리할 수 있다', async () => {
    const onMarkRead = vi.fn();
    const user = userEvent.setup();
    render(
      <AppNotificationDrawer
        isOpen
        onClose={vi.fn()}
        onMarkRead={onMarkRead}
        onMarkAllRead={vi.fn()}
        onDelete={vi.fn()}
        notifications={[{
          id: 8,
          title: '시스템 공지',
          message: '점검 안내입니다.',
          time: '방금 전',
          isRead: false,
          type: 'SYSTEM',
        }]}
      />,
    );

    screen.getByRole('button', { name: '알림: 시스템 공지' }).focus();
    await user.keyboard('{Enter}');
    expect(onMarkRead).toHaveBeenCalledWith(8);
  });

  it('이미 읽은 업무 링크 없는 알림은 무동작 버튼이나 포커스 대상으로 노출하지 않는다', () => {
    const onMarkRead = vi.fn();
    render(
      <AppNotificationDrawer
        isOpen
        onClose={vi.fn()}
        onMarkRead={onMarkRead}
        onMarkAllRead={vi.fn()}
        onDelete={vi.fn()}
        notifications={[{
          id: 10,
          title: '확인 완료 공지',
          message: '이미 확인한 알림입니다.',
          time: '조금 전',
          isRead: true,
          type: 'SYSTEM',
        }]}
      />,
    );

    const title = screen.getByRole('heading', { name: '확인 완료 공지' });
    expect(screen.queryByRole('button', { name: '알림: 확인 완료 공지' })).not.toBeInTheDocument();
    expect(title.closest('[tabindex="0"]')).toBeNull();
    fireEvent.click(title);
    expect(onMarkRead).not.toHaveBeenCalled();
  });

  it('일괄 읽음 버튼은 불러온 범위를 말하고 처리 대상이 없으면 비활성화한다', () => {
    const onMarkAllRead = vi.fn();
    const baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      onMarkRead: vi.fn(),
      onMarkAllRead,
      onDelete: vi.fn(),
    };
    const { rerender } = render(
      <AppNotificationDrawer
        {...baseProps}
        notifications={[{
          id: 11,
          title: '미확인 공지',
          message: '확인이 필요합니다.',
          time: '방금 전',
          isRead: false,
          type: 'SYSTEM',
        }]}
      />,
    );

    const action = screen.getByTestId('read-all-broadcasts-btn');
    expect(action).toHaveAccessibleName('불러온 알림 읽음 처리');
    expect(action).toBeEnabled();
    expect(screen.queryByRole('button', { name: '모든 알림 읽음 처리' })).not.toBeInTheDocument();
    fireEvent.click(action);
    expect(onMarkAllRead).toHaveBeenCalledOnce();

    rerender(
      <AppNotificationDrawer
        {...baseProps}
        notifications={[{
          id: 11,
          title: '확인 완료 공지',
          message: '이미 확인했습니다.',
          time: '방금 전',
          isRead: true,
          type: 'SYSTEM',
        }]}
      />,
    );

    expect(screen.getByTestId('read-all-broadcasts-btn')).toBeDisabled();
  });
});
