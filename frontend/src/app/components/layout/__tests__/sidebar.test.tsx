import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { Sidebar } from '../sidebar';
import { vi, type Mock } from 'vitest';
import { menuService } from '@/services/menuService';
import * as navigation from 'next/navigation';
import { useLayout } from '@/contexts/LayoutContext';

// Mock dependencies
vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useSearchParams: vi.fn(),
}));

vi.mock('@/contexts/LayoutContext', () => ({
    useLayout: vi.fn(),
}));

vi.mock('@/services/menuService', () => ({
    menuService: {
        getHeadMenus: vi.fn(),
        getLeftMenus: vi.fn(),
    },
}));

describe('Sidebar (App Layout)', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks
        (navigation.usePathname as Mock).mockReturnValue('/cop/cmy/selectCommunityList');
        (navigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams());
        (useLayout as Mock).mockReturnValue({
            isSidebarOpen: true,
            setSidebarOpen: vi.fn(),
        });
    });

    it('renders navigation with menu items', async () => {
        // Mock API response for head menus
        (menuService.getHeadMenus as Mock).mockResolvedValue({
            success: true,
            list: [
                { menuNo: 1, menuNm: 'Menu 1', chkURL: '/cop/cmy/EgovCmmntyList.do' },
            ]
        });

        // Mock API response for left menus
        (menuService.getLeftMenus as Mock).mockResolvedValue({
            success: true,
            list: [
                { menuNo: 101, menuNm: 'SubMenu 1', chkURL: '/cop/cmy/EgovCmmntyList.do', upperMenuId: 1 }
            ]
        });

        render(<Sidebar />);

        await waitFor(() => {
            // Menu 1 should be present
            expect(screen.getByText('Menu 1')).toBeInTheDocument();
        });

        // Since pathname matches Menu 1 (mapped), it should be active and expanded
        await waitFor(() => {
             // SubMenu 1 should be visible if expanded
             // Note: Depending on implementation, checking for SubMenu 1 might require checking if parent is expanded
             // But if mappedUrl is correct, it should match pathname.
             expect(screen.getByText('SubMenu 1')).toBeInTheDocument();
        });
    });

    it('handles legacy URL mapping correctly', async () => {
         (menuService.getHeadMenus as Mock).mockResolvedValue({
            success: true,
            list: [
                { menuNo: 2, menuNm: 'Legacy Menu', chkURL: '/cop/bbs/selectBoardList.do?bbsId=BBSMSTR_000000000001' },
            ]
        });
        (menuService.getLeftMenus as Mock).mockResolvedValue({
            success: true,
            list: []
        });

        render(<Sidebar />);

        await waitFor(() => {
            // Check if link exists and has correct href
            const link = screen.getByRole('link', { name: /Legacy Menu/i });
            expect(link).toHaveAttribute('href', '/cop/bbs/selectBoardList?bbsId=BBSMSTR_000000000001');
        });
    });
});
