import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/api/client';
import ScrapListPage from '../scp/selectScrapList/page';

vi.mock('@/lib/api/client');
vi.mock('next/link', () => ({
    default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => ({ get: vi.fn() }),
}));

describe('ScrapListPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders list of scraps', async () => {
        const mockData = {
            data: {
                resultList: [
                    {
                        scrapId: 'SCRP_0001',
                        scrapNm: '참고 자료',
                        scrapUrl: 'http://example.com',
                        frstRegisterNm: '사용자1',
                        frstRegisterPnttm: '2024-03-01'
                    }
                ],
                totalCount: 1,
                totalPages: 1
            }
        };
        (axios.get as any).mockResolvedValue(mockData);

        render(<ScrapListPage />);

        await waitFor(() => {
            expect(screen.getByText('참고 자료')).toBeDefined();
            expect(screen.getByText('http://example.com')).toBeDefined();
        });
    });
});