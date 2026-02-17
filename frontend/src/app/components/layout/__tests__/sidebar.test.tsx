import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Sidebar } from '../sidebar';
import { menuService } from '@/services/menuService';
import { usePathname } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
}));

// Mock menuService
vi.mock('@/services/menuService', () => ({
  menuService: {
    getHeadMenus: vi.fn(),
  },
}));

describe('Sidebar Component', () => {
  const mockMenus = [
    { menuNo: 1, menuNm: '대시보드', chkURL: '/dashboard', progrmFileNm: 'dashboard', upperMenuId: 0, menuOrdr: 1 },
    { menuNo: 2, menuNm: '게시판', chkURL: '/board', progrmFileNm: 'board', upperMenuId: 0, menuOrdr: 2 },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (usePathname as any).mockReturnValue('/dashboard');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (menuService.getHeadMenus as any).mockResolvedValue({
      success: true,
      list: mockMenus,
    });
  });

  it('renders menu items correctly', async () => {
    render(<Sidebar />);

    await waitFor(() => {
      expect(screen.getByText('대시보드')).toBeInTheDocument();
      expect(screen.getByText('게시판')).toBeInTheDocument();
    });
  });

  it('highlights the active menu based on pathname', async () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (usePathname as any).mockReturnValue('/dashboard');
    render(<Sidebar />);

    await waitFor(() => {
      const activeLink = screen.getByText('대시보드').closest('a');
      expect(activeLink).toHaveClass('bg-primary');

      const inactiveLink = screen.getByText('게시판').closest('a');
      expect(inactiveLink).not.toHaveClass('bg-primary');
    });
  });
});
