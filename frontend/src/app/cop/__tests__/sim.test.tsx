import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
    usePathname: () => '/smart-toolkit/schedule',
    useSearchParams: () => new URLSearchParams(),
    useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/api/client', () => ({
    default: { get: vi.fn().mockResolvedValue({ resultList: [], totalCount: 0 }), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
}));

import ScheduleListPage from '../../smart-toolkit/schedule/page';

describe('ScheduleListPage', () => {
    it('renders schedule list page structure', () => {
        render(<ScheduleListPage />);
        expect(screen.getByText(/일정 관리/)).toBeInTheDocument();
    });
});