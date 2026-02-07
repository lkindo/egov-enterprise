import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/api/client';
import BoardListPage from '../bbs/selectBoardList/page';

vi.mock('@/lib/api/client');
vi.mock('next/link', () => ({
    default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => ({ get: vi.fn() }),
}));

// Components that use useSearchParams need Suspense usually, 
// but in unit tests with mocked next/navigation, it might render directly if not wrapped in Suspense in the export.
// The BoardListPage component exports a Suspense wrapper, so we test that or the inner component if exported.
// The default export is BoardListPage which wraps BBSListContent in Suspense.

describe('BoardListPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders list of boards', async () => {
        const mockData = {
            data: {
                resultList: [
                    {
                        nttId: 'BBS_0000000000001',
                        nttSj: '공지사항',
                        frstRegisterNm: '관리자',
                        frstRegisterPnttm: '2024-04-01',
                        inqireCo: 10
                    }
                ],
                totalCount: 1,
                totalPages: 1
            }
        };
        (axios.get as any).mockResolvedValue(mockData);

        render(<BoardListPage />);

        await waitFor(() => {
            expect(screen.getByText('공지사항')).toBeDefined();
            expect(screen.getByText('관리자')).toBeDefined();
        });
    });
});
