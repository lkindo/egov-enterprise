import React from 'react';
import { render, screen } from '@testing-library/react';
import { Header } from '../header';
import { vi } from 'vitest';

// Mocks
vi.mock('next-themes', () => ({
  useTheme: () => ({ theme: 'light', setTheme: vi.fn() }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { name: 'Test User', userSe: 'USR' }, logout: vi.fn() }),
}));

vi.mock('@/contexts/LayoutContext', () => ({
  useLayout: () => ({ isSidebarOpen: true, toggleSidebar: vi.fn() }),
}));

vi.mock('@/lib/hooks/use-notifications', () => ({
  useNotifications: () => ({ notifications: [], unreadCount: 0 }),
}));

// Mock Link
vi.mock('next/link', () => {
  return {
    __esModule: true,
    default: ({ children, href, ...props }: any) => {
      return (
        <a href={href} {...props}>
          {children}
        </a>
      );
    },
  };
});

// Mock Popover
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children }: any) => <div>{children}</div>,
  PopoverContent: ({ children }: any) => <div>{children}</div>,
  PopoverTrigger: ({ children, asChild }: any) => asChild ? children : <button>{children}</button>,
}));

// Mock Badge
vi.mock('@/components/ui/badge', () => ({
  Badge: ({ children }: any) => <span>{children}</span>,
}));

// Mock AppNotificationDrawer
vi.mock('../../ui/app-notification-drawer', () => ({
  AppNotificationDrawer: () => <div data-testid="notification-drawer">Notification Drawer</div>,
}));

describe('Header', () => {
  it('renders accessible buttons', () => {
    render(<Header />);

    // These should fail initially
    expect(screen.getByLabelText('메뉴 열기/닫기')).toBeInTheDocument();
    expect(screen.getByLabelText('도움말')).toBeInTheDocument();
    expect(screen.getByLabelText('다크 모드로 변경')).toBeInTheDocument(); // Since default is light
    expect(screen.getByLabelText('알림')).toBeInTheDocument();
  });
});
