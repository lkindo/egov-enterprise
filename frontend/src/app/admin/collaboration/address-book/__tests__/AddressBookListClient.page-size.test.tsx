import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AddressBookListClient from '../select-address-book-list/AddressBookListClient';

const mocks = vi.hoisted(() => ({ getAddressBooks: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: ['ADBK_READ'], authorizationVersion: 'v1' } }) }));

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
// 페이지당 건수 변경만 흉내 낸다 — 이 계약은 크기를 바꾸면 어떤 크기·쪽·검색어로 다시 조회하는가를 본다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ pagination }: { pagination: { onPageSizeChange: (size: number) => void } }) => (
    <button type="button" onClick={() => pagination.onPageSizeChange(50)}>50개씩</button>
  ),
}));

/**
 * 페이지당 건수 — 이 화면은 React Query 가 아니라 조회 함수를 직접 다시 부른다(페이지 크기 census 의 수동 조회 목록).
 * census 는 크기 변경 콜백이 있는지만 보므로, 그 콜백이 새 크기로 다시 조회한다는 사유 문장은 이 시험이 지킨다.
 * 조회 함수의 크기 인자는 기본값이 렌더 시점의 크기라, 콜백이 새 크기를 넘기지 않으면 선택기는 50 을 보이는데 10 건으로
 * 다시 조회한다(컨트롤이 조용히 죽는다).
 */
describe('AddressBookListClient 페이지당 건수', () => {
  beforeEach(() => {
    mocks.getAddressBooks.mockReset();
    mocks.getAddressBooks.mockResolvedValue({ list: [], total: 0, totalPage: 3 });
  });

  it('크기를 바꾸면 새 크기로 1쪽부터, 조회한 검색어로 다시 조회한다', async () => {
    const initialData = { list: [], total: 30, totalPage: 3 };
    const dataPromise = Object.assign(Promise.resolve(initialData), { status: 'fulfilled' as const, value: initialData });
    render(
      <Suspense fallback={null}>
        <AddressBookListClient dataPromise={dataPromise} initialParams={{ pageNo: 3, searchWrd: '회계' }} />
      </Suspense>,
    );

    // 입력만 하고 조회하지 않은 검색어는 크기 변경 조회에도 쓰지 않는다.
    fireEvent.change(await screen.findByRole('textbox', { name: '주소록 검색' }), { target: { value: '인사' } });
    fireEvent.click(screen.getByRole('button', { name: '50개씩' }));

    await waitFor(() => expect(mocks.getAddressBooks).toHaveBeenCalledTimes(1));
    expect(mocks.getAddressBooks).toHaveBeenLastCalledWith({ page: 1, size: 50, searchWrd: '회계' });
  });
});
