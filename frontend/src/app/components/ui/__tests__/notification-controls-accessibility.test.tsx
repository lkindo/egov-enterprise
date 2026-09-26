import { createEvent, fireEvent, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it, vi } from 'vitest';
import { AppNotificationDrawer } from '../app-notification-drawer';

describe('notification controls accessibility', () => {
  // [2026-09-26 DIP B4 P2] 알림 센터 목록의 계약은 smart-notification-hub.test.tsx 로 옮겼다(서버 페이지 조회로 바뀌었다).
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

  it('일괄 읽음 버튼은 받은 알림 전체를 말하고 처리 대상이 없으면 비활성화한다', () => {
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
    expect(action).toHaveAccessibleName('받은 알림 모두 읽음 처리');
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

    // [DIP B4 P2] 불러온 알림이 모두 읽음이어도 서버에 미읽음이 남아 있으면 모두 읽음을 누를 수 있다.
    rerender(
      <AppNotificationDrawer
        {...baseProps}
        unreadCount={4}
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
    expect(screen.getByTestId('read-all-broadcasts-btn')).toBeEnabled();
  });

  it('알림 센터로 가는 길은 넘겨받았을 때만 보인다', () => {
    const baseProps = {
      isOpen: true,
      onClose: vi.fn(),
      onMarkRead: vi.fn(),
      onMarkAllRead: vi.fn(),
      onDelete: vi.fn(),
      notifications: [],
    };
    const { rerender } = render(<AppNotificationDrawer {...baseProps} />);
    expect(screen.queryByRole('link', { name: '알림 센터에서 전체 보기' })).not.toBeInTheDocument();

    rerender(<AppNotificationDrawer {...baseProps} centerHref="/admin/notifications" />);
    expect(screen.getByRole('link', { name: '알림 센터에서 전체 보기' })).toHaveAttribute('href', '/admin/notifications');
  });
});
