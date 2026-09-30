import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AddressBookListClient from '../select-address-book-list/AddressBookListClient';

const mocks = vi.hoisted(() => ({ getAddressBooks: vi.fn() }));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));
vi.mock('@/services/business/user/addressbook/AddressbookUserService', () => ({
  addressbookUserService: { getAddressBooks: mocks.getAddressBooks, deleteAddressBook: vi.fn() },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ filter, children }: { filter?: ReactNode; children?: ReactNode }) => <main>{filter}{children}</main>,
}));
vi.mock('@/app/components/ui/data-export-excel', () => ({ DataExportExcel: () => null }));
// 페이지 이동만 흉내 낸다 — 이 계약은 이동이 어떤 검색어로 조회하는가를 본다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ pagination }: { pagination: { onPageChange: (page: number) => void } }) => (
    <button type="button" onClick={() => pagination.onPageChange(2)}>2 페이지로</button>
  ),
}));

/**
 * [2026-10-01] 입력만 하고 조회하지 않은 검색어는 페이지 이동에 쓰이지 않는다. 종전에는 입력칸 값이 곧 조회
 * 조건이라, '회계' 를 입력만 해 둔 채 2 페이지를 누르면 화면의 결과(전체)와 다른 조건('회계')으로 조회됐다.
 */
describe('AddressBookListClient 적용된 검색어', () => {
  beforeEach(() => {
    mocks.getAddressBooks.mockReset();
    mocks.getAddressBooks.mockResolvedValue({ list: [], total: 0, totalPage: 3 });
  });

  it('조회하지 않은 입력은 페이지 이동에 쓰지 않고, 조회한 검색어만 쓴다', async () => {
    const initialData = { list: [], total: 30, totalPage: 3 };
    const dataPromise = Object.assign(Promise.resolve(initialData), { status: 'fulfilled' as const, value: initialData });
    render(
      <Suspense fallback={null}>
        <AddressBookListClient dataPromise={dataPromise} initialParams={{ pageNo: 1, searchWrd: '' }} />
      </Suspense>,
    );

    fireEvent.change(await screen.findByRole('textbox', { name: '주소록 검색' }), { target: { value: '회계' } });
    fireEvent.click(screen.getByRole('button', { name: '2 페이지로' }));
    await waitFor(() => expect(mocks.getAddressBooks).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, searchWrd: '' })));

    fireEvent.click(screen.getByRole('button', { name: '검색' }));
    await waitFor(() => expect(mocks.getAddressBooks).toHaveBeenLastCalledWith(expect.objectContaining({ page: 0, searchWrd: '회계' })));
    fireEvent.click(screen.getByRole('button', { name: '2 페이지로' }));
    await waitFor(() => expect(mocks.getAddressBooks).toHaveBeenLastCalledWith(expect.objectContaining({ page: 1, searchWrd: '회계' })));
  });
});
