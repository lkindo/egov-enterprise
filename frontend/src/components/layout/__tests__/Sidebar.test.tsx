import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import Sidebar from '../Sidebar';
import { vi, type Mock } from 'vitest';
import client from '@/lib/api/client';
import * as navigation from 'next/navigation';
import { LayoutContext } from '@/contexts/LayoutContext';

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
    const mockLayoutContext = {
        activeMenuNo: 1,
        setActiveMenuNo: vi.fn(),
        isSidebarOpen: true,
        toggleSidebar: vi.fn(),
    };

    beforeEach(() => {
        vi.clearAllMocks();
        (navigation.usePathname as Mock).mockReturnValue('/cop/bbs/selectBoardList');
        (navigation.useSearchParams as Mock).mockReturnValue(new URLSearchParams());
    });

    const renderSidebar = () => {
        return render(
            <LayoutContext.Provider value={mockLayoutContext}>
                <Sidebar />
            </LayoutContext.Provider>
        );
    };

    it('renders navigation with aria-label', async () => {
        (client.get as Mock).mockImplementation((url: string) => {
            if (url === '/menu/head') {
                return Promise.resolve({ list: [{ menuNo: 1, menuNm: 'Root Category' }] });
            }
            if (url.startsWith('/menu/left')) {
                return Promise.resolve({
                    list: [
                        { 
                            menuNo: 10, 
                            menuNm: 'Group 1', 
                            children: [{ menuNo: 101, menuNm: 'Sub Menu 1', chkURL: '/cop/bbs/selectBoardList' }] 
                        }
                    ]
                });
            }
            return Promise.resolve({ list: [] });
        });

        renderSidebar();

        await waitFor(() => {
            expect(screen.getByRole('navigation', { name: '서브 메뉴' })).toBeInTheDocument();
            expect(screen.getByText('Group 1')).toBeInTheDocument();
        });
    });

    it('sets active styles on the current link', async () => {
        (navigation.usePathname as Mock).mockReturnValue('/cop/bbs/selectBoardList');

        (client.get as Mock).mockImplementation((url: string) => {
            if (url === '/menu/head') return Promise.resolve({ list: [{ menuNo: 1, menuNm: 'Root' }] });
            if (url.startsWith('/menu/left')) {
                return Promise.resolve({
                    list: [{ 
                        menuNo: 10, 
                        menuNm: 'Group', 
                        children: [{ menuNo: 101, menuNm: 'Active Menu', chkURL: '/cop/bbs/selectBoardList' }] 
                    }]
                });
            }
            return Promise.resolve({ list: [] });
        });

        renderSidebar();

        await waitFor(() => {
            const activeLink = screen.getByRole('link', { name: 'Active Menu' });
            // The active class is dynamic, check for the presence of the link
            expect(activeLink).toBeInTheDocument();
            expect(activeLink).toHaveClass('bg-primary');
        });
    });
});
