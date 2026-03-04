import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/cop/bbs',
    useSearchParams: () => new URLSearchParams({ bbsId: 'BBSMSTR_AAAAAAAAAAAA' }),
}));

vi.mock('@/lib/api/client', () => ({
    default: { get: vi.fn().mockResolvedValue({ content: [], totalElements: 0 }), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
}));

import BoardListPage from '../bbs/page';

describe('BoardListPage', () => {
    it('renders board list page structure', () => {
        render(<BoardListPage />);
        expect(screen.getByText(/통합 게시판/)).toBeInTheDocument();
    });
});