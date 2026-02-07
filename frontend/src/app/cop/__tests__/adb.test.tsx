import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import axios from '@/lib/api/client';
import AddressBookListPage from '../adb/selectAddressBookList/page';
import { act } from 'react';

// Mock dependencies
vi.mock('@/lib/api/client');
vi.mock('next/link', () => ({
    default: ({ children }: { children: React.ReactNode }) => <a>{children}</a>,
}));
vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    useSearchParams: () => ({ get: vi.fn() }),
}));

describe('AddressBookListPage', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders loading state initially', async () => {
        (axios.get as any).mockReturnValue(new Promise(() => { }));

        await act(async () => {
            render(<AddressBookListPage />);
        });
        expect(screen.getByText('주소록 관리')).toBeDefined();
    });

    it('renders list of address books', async () => {
        const mockData = {
            data: {
                resultList: [
                    {
                        adbkId: 'ADBK_00000000000001',
                        adbkNm: '홍길동',
                        adbkEmail: 'test@example.com',
                        adbkTelno: '010-1234-5678',
                        frstRegisterPnttm: '2024-01-01',
                        scope: '개인'
                    }
                ],
                totalCount: 1,
                totalPages: 1
            }
        };

        // Use spyOn or just ensure the mock return value is set before render
        (axios.get as any).mockResolvedValue(mockData);

        await act(async () => {
            render(<AddressBookListPage />);
        });

        await waitFor(() => {
            // Use getByText with exact: false or regex to be robust
            expect(screen.getByText('홍길동')).toBeInTheDocument();
            expect(screen.getByText('test@example.com')).toBeInTheDocument();
        });
    });

    it('handles empty list', async () => {
        const mockData = {
            data: {
                resultList: [],
                totalCount: 0,
                totalPages: 0
            }
        };
        (axios.get as any).mockResolvedValue(mockData);

        await act(async () => {
            render(<AddressBookListPage />);
        });

        await waitFor(() => {
            expect(screen.getByText('등록된 주소록 정보가 없습니다.')).toBeInTheDocument();
        });
    });
});
