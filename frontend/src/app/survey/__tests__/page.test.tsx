import { render, screen, waitFor, act } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import SurveyListPage from '../page';
import * as pollService from '@/services/poll/pollService';

// Mock dependencies
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
}));

// Mock the service
vi.mock('@/services/poll/pollService', () => ({
    getPollList: vi.fn(),
}));

describe('SurveyListPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading skeletons initially', async () => {
        // Mock getPollList to return a promise that never resolves immediately
        (pollService.getPollList as any).mockReturnValue(new Promise(() => { }));

        render(<SurveyListPage />);

        expect(screen.queryByText('진행 중인 설문조사')).toBeInTheDocument();
        // Check for skeletons using a selector matching the data-slot attribute used in Skeleton component
        // Note: document is available in jsdom environment
        const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
        expect(skeletons.length).toBeGreaterThan(0);
    });

    it('renders list of polls after loading', async () => {
        const today = new Date().toISOString().slice(0, 10);
        const mockData = {
            resultList: [
                {
                    pollId: 'POLL_001',
                    pollNm: 'Test Poll 1',
                    pollBeginDe: today, // Active
                    pollEndDe: today,   // Active
                }
            ]
        };

        (pollService.getPollList as any).mockResolvedValue(mockData);

        await act(async () => {
            render(<SurveyListPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('Test Poll 1')).toBeInTheDocument();
        });
    });

    it('handles empty list', async () => {
        const mockData = {
            resultList: []
        };
        (pollService.getPollList as any).mockResolvedValue(mockData);

        await act(async () => {
            render(<SurveyListPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('현재 진행 중인 설문조사가 없습니다.')).toBeInTheDocument();
        });
    });
});
