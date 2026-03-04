import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/api/client';
import CommunityListPage from '../cmy/selectCommunityList/page';

vi.mock('@/lib/api/client');
vi.mock('next/link', () => ({
    default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));

describe('CommunityListPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders list of communities', async () => {
        const mockData = {
            data: {
                resultList: [
                    {
                        cmmntyId: 'CMM_0001',
                        cmmntyNm: '개발팀 커뮤니티',
                        cmmntyIntrcn: '개발 관련 논의',
                        frstRegisterNm: '테스터',
                        frstRegisterPnttm: '2024-05-01'
                    }
                ],
                totalCount: 1,
                totalPages: 1
            }
        };
        (axios.get as any).mockResolvedValue(mockData);

        render(<CommunityListPage />);

        await waitFor(() => {
            expect(screen.getByText('개발팀 커뮤니티')).toBeDefined();
            expect(screen.getByText('"개발 관련 논의"')).toBeDefined();
        });
    });
});
