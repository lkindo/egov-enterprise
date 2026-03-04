import { vi, describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import React from 'react';

vi.mock('next/navigation', () => ({
    useRouter: () => ({ push: vi.fn() }),
    usePathname: () => '/cop/adb/selectAddressBookList',
    useSearchParams: () => ({ get: vi.fn() }),
}));

vi.mock('@/lib/api/client', () => ({
    default: { get: vi.fn().mockResolvedValue({ resultList: [], totalCount: 0 }), interceptors: { request: { use: vi.fn() }, response: { use: vi.fn() } } }
}));

import AddressBookListPage from '../adb/selectAddressBookList/page';

describe('AddressBookListPage', () => {
    it('renders address book list page structure', () => {
        render(<AddressBookListPage />);
        expect(screen.getByText(/주소록 목록/)).toBeInTheDocument();
    });
});
