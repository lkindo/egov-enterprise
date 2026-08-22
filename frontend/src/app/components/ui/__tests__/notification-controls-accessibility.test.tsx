import { fireEvent, render, screen } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { SmartNotificationHub } from '../smart-notification-hub';
import { NotificationSender } from '../notification-sender';

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

  it('발송 채널을 이름이 있는 native radio group으로 제공한다', () => {
    render(<NotificationSender />);

    const group = screen.getByRole('group', { name: '발송 채널 선택' });
    const system = screen.getByRole('radio', { name: '시스템' });
    const email = screen.getByRole('radio', { name: '이메일' });
    expect(group).toContainElement(system);
    expect(system).toBeChecked();

    fireEvent.click(email);
    expect(email).toBeChecked();
    expect(system).not.toBeChecked();
  });

  it('알림 페이지의 hero heading은 h1 다음의 h2이다', () => {
    const source = readFileSync(
      path.resolve(process.cwd(), 'src/app/admin/notifications/NotificationsClient.tsx'),
      'utf8',
    );
    expect(source).toMatch(/<h2[^>]*>[\s\S]*?통합 알림 모니터링/);
    expect(source).not.toMatch(/<h3[^>]*>[\s\S]*?통합 알림 모니터링/);
  });
});
