import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/api/client';
import ScheduleListPage from '../smt/sim/selectScheduleList/page';

// Mock dependencies
vi.mock('@/lib/api/client');
vi.mock('next/link', () => ({
    default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => ({ get: vi.fn() }),
}));

describe('ScheduleListPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders list of schedules', async () => {
        const mockData = {
            data: {
                resultList: [
                    {
                        schdulId: 'SCHD_0001',
                        schdulNm: '주간회의',
                        schdulSe: '회의',
                        schdulIpcrCode: '3', // High priority
                        schdulBgnde: '2024-02-01 10:00',
                        frstRegisterNm: '관리자'
                    }
                ],
                totalCount: 1,
                totalPages: 1
            }
        };
        (axios.get as any).mockResolvedValue(mockData);

        render(<ScheduleListPage />);

        await waitFor(() => {
            expect(screen.getByText('주간회의')).toBeDefined();
            // Check for High priority badge text if applicable or just the content
            expect(screen.getByText('관리자')).toBeDefined();
        });
    });
});
