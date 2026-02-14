import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar';
import client from '@/lib/api/client';
import { usePathname, useSearchParams } from 'next/navigation';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  usePathname: vi.fn(),
  useSearchParams: vi.fn(() => new URLSearchParams()),
}));

// Mock axios client
vi.mock('@/lib/api/client', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('Sidebar Component Optimization', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('does not re-fetch menu data when navigating within the same section', async () => {
    // 1. Initial render: /cop/bbs/selectBoardList
    (usePathname as any).mockReturnValue('/cop/bbs/selectBoardList');
    (client.get as any).mockResolvedValue({
      data: {
        success: true,
        list: [{ menuNo: 1, menuNm: 'Test Menu', chkURL: '/cop/bbs/selectBoardList.do' }]
      }
    });

    const { rerender } = render(<Sidebar />);

    // Expect initial fetch for menuNo=2000000
    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/menu/left?menuNo=2000000');
    });

    // Clear mock calls to focus on the next step
    (client.get as any).mockClear();

    // 2. Navigate to /cop/bbs/selectBoardArticle/123 (same section)
    (usePathname as any).mockReturnValue('/cop/bbs/selectBoardArticle/123');

    // Trigger re-render with new pathname
    rerender(<Sidebar />);

    // With optimization, this should NOT trigger another fetch
    // because menuNo (2000000) hasn't changed.
    await waitFor(() => {
      expect(client.get).not.toHaveBeenCalled();
    });
  });

  it('fetches menu data when navigating to a different section', async () => {
    // 1. Initial render: /cop/bbs/selectBoardList
    (usePathname as any).mockReturnValue('/cop/bbs/selectBoardList');
    (client.get as any).mockResolvedValue({
      data: { success: true, list: [] }
    });

    const { rerender } = render(<Sidebar />);

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/menu/left?menuNo=2000000');
    });

    (client.get as any).mockClear();

    // 2. Navigate to /survey (different section)
    (usePathname as any).mockReturnValue('/survey');

    rerender(<Sidebar />);

    await waitFor(() => {
      expect(client.get).toHaveBeenCalledWith('/menu/left?menuNo=3000000');
    });
  });

  it('shows loading skeleton while fetching data', async () => {
    (usePathname as any).mockReturnValue('/cop/bbs/selectBoardList');
    // Mock response
    (client.get as any).mockResolvedValue({
      data: { success: true, list: [] }
    });

    const { getByLabelText, queryByLabelText } = render(<Sidebar />);

    // Should show skeleton initially because menuNo > 0 and loading starts immediately
    expect(getByLabelText('Loading menu')).toBeDefined();

    // Eventually finishes
    await waitFor(() => {
      // Skeleton should be gone if list is empty (returns null)
      // or if list has items (returns nav with '서브 메뉴')
      expect(queryByLabelText('Loading menu')).toBeNull();
    });
  });
});
