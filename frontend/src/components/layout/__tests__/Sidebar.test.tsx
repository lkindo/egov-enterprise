import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { vi, type Mock } from 'vitest';
import client from '@/lib/api/client';
import * as navigation from 'next/navigation';

// Mock dependencies
vi.mock('next/navigation', () => ({
    usePathname: vi.fn(),
    useSearchParams: vi.fn(),
}));

// Mock the API client
vi.mock('@/lib/api/client', () => {
    const mockClient = {
        get: vi.fn(),
        interceptors: {
            response: { use: vi.fn() }
        }
    };
    return { default: mockClient };
});

describe('Sidebar', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        // Default mocks
        (navigation.usePathname as Mock).mockReturnValue('/cop/cmy/selectCommunityList');
        (navigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams());
    });

    it('renders navigation with aria-label', async () => {
        // Mock API response for menu
        (client.get as Mock).mockResolvedValue({
            data: {
                success: true,
                list: [
                    { menuNo: 1, menuNm: 'Menu 1', chkURL: '/cop/cmy/EgovCmmntyList.do' },
                    { menuNo: 2, menuNm: 'Menu 2', chkURL: '/cop/bbs/other.do' }
                ]
            }
        });

        render(<Sidebar />);

        await waitFor(() => {
            // This assertion expects <nav aria-label="서브 메뉴">
            expect(screen.getByRole('navigation', { name: '서브 메뉴' })).toBeInTheDocument();
        });
    });

    it('sets aria-current="page" on the active link', async () => {
        // Set pathname to match the first menu item
        (navigation.usePathname as Mock).mockReturnValue('/cop/cmy/selectCommunityList');

        (client.get as Mock).mockResolvedValue({
            data: {
                success: true,
                list: [
                    { menuNo: 1, menuNm: 'Active Menu', chkURL: '/cop/cmy/EgovCmmntyList.do' },
                    { menuNo: 2, menuNm: 'Inactive Menu', chkURL: '/cop/bbs/other.do' }
                ]
            }
        });

        render(<Sidebar />);

        await waitFor(() => {
            const activeLink = screen.getByRole('link', { name: 'Active Menu' });
            expect(activeLink).toHaveAttribute('aria-current', 'page');
            expect(activeLink).toHaveClass('on');
            // Verify mapped URL is used
            expect(activeLink).toHaveAttribute('href', '/cop/cmy/selectCommunityList');

            const inactiveLink = screen.getByRole('link', { name: 'Inactive Menu' });
            expect(inactiveLink).not.toHaveAttribute('aria-current');
            expect(inactiveLink).not.toHaveClass('on');
            // Verify mapped URL is used (default mapping)
            expect(inactiveLink).toHaveAttribute('href', '/cop/bbs/other.do');
        });
    });
});
