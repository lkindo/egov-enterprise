import React from 'react';
import { render, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import Sidebar from './Sidebar';
import client from '@/lib/api/client';

// Mock Next.js router
const usePathnameMock = vi.fn();
const useSearchParamsMock = vi.fn();

vi.mock('next/navigation', () => ({
    usePathname: () => usePathnameMock(),
    useSearchParams: () => useSearchParamsMock(),
}));

// Mock axios client
vi.mock('@/lib/api/client', () => ({
    default: {
        get: vi.fn(),
    },
}));

// Mock Link
vi.mock('next/link', () => {
    return {
        default: ({ children, href, className }: any) => {
            return <a href={href} className={className}>{children}</a>;
        }
    };
});

describe('Sidebar Component', () => {
    beforeEach(() => {
        vi.clearAllMocks();
        useSearchParamsMock.mockReturnValue(new URLSearchParams());
        // Mock successful API response
        (client.get as any).mockResolvedValue({
            data: {
                success: true,
                list: [
                    { menuNo: 1, menuNm: 'Menu 1', chkURL: '/cop/menu1.do' },
                ],
            },
        });
    });

    it('fetches menu only once when navigating within same group (Optimization Test)', async () => {
        // 1. Initial render at /cop/list
        usePathnameMock.mockReturnValue('/cop/bbs/selectBoardList');
        const { rerender } = render(<Sidebar />);

        // Should fetch for menuNo 2000000 (Collaboration)
        await waitFor(() => {
            expect(client.get).toHaveBeenCalledWith(expect.stringContaining('menuNo=2000000'));
        });

        expect(client.get).toHaveBeenCalledTimes(1);

        // 2. Navigation to detail (same group)
        usePathnameMock.mockReturnValue('/cop/bbs/selectBoardArticle/1');
        rerender(<Sidebar />);

        // Wait for potential re-fetch (give it a moment)
        // In unoptimized version, useEffect runs again because pathname changed.
        // In optimized version, menuNo (2000000) is same, so useEffect should NOT run.

        // We simulate a small delay to allow useEffect to fire if it was going to
        await new Promise(resolve => setTimeout(resolve, 50));

        // If optimized, call count remains 1. If not, it becomes 2.
        // This test assertion depends on whether I want it to fail initially (TDD) or pass after fix.
        // For TDD, I expect 1, but currently it will be 2.
        expect(client.get).toHaveBeenCalledTimes(1);
    });
});
