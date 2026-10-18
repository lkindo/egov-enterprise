import { Suspense } from 'react';
import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import AddressBookListClient from '../select-address-book-list/AddressBookListClient';

const mocks = vi.hoisted(() => ({
  permissions: ['ADBK_CREATE', 'ADBK_DELETE'] as string[],
  confirm: vi.fn(),
  deleteAddressBook: vi.fn(),
  getAddressBooks: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }) }));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: ReactNode; href: string }) => <a href={href}>{children}</a>,
}));

vi.mock('@/services/business/user/addressbook/AddressbookUserService', () => ({
  addressbookUserService: {
    deleteAddressBook: mocks.deleteAddressBook,
    getAddressBooks: mocks.getAddressBooks,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, filter, children }: { actions?: ReactNode; filter?: ReactNode; children?: ReactNode }) => (
    <main>{actions}{filter}{children}</main>
  ),
}));

vi.mock('@/app/components/ui/data-export-excel', () => ({
  DataExportExcel: () => null,
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: any) => (
    <div>
      {data.map((item: any, rowIndex: number) => (
        <div key={item.adbkSn}>
          {columns.map((column: any, columnIndex: number) => (
            <span key={columnIndex}>{column.accessor(item, rowIndex)}</span>
          ))}
        </div>
      ))}
    </div>
  ),
}));

const addressBook = {
  adbkSn: 7,
  adbkNm: '보존할 주소록',
  rlsScopeCd: 'G',
  crtDt: '2026-08-26T00:00:00',
  wrterId: 'user-1',
};

function renderClient() {
  const initialData = { list: [addressBook], total: 1, totalPage: 1 };
  const dataPromise = Object.assign(Promise.resolve(initialData), {
    status: 'fulfilled' as const,
    value: initialData,
  });
  return render(
    <Suspense fallback={<span>주소록 로딩</span>}>
      <AddressBookListClient
        dataPromise={dataPromise}
        initialParams={{ pageNo: 1, searchWrd: '' }}
      />
    </Suspense>,
  );
}

describe('AddressBookListClient delete guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['ADBK_CREATE', 'ADBK_DELETE'];
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteAddressBook.mockResolvedValue(undefined);
    mocks.getAddressBooks.mockResolvedValue({ list: [addressBook], total: 1, totalPage: 1 });
  });

  it.each([
    { permissions: ['ADBK_READ'], create: false, remove: false },
    { permissions: ['ADBK_CREATE'], create: true, remove: false },
    { permissions: ['ADBK_DELETE'], create: false, remove: true },
  ])('목록은 각 행위 권한으로 등록·삭제를 표시한다: $permissions', ({ permissions, create, remove }) => {
    mocks.permissions = permissions;
    renderClient();
    expect(screen.queryByRole('button', { name: '주소록 등록' }) !== null).toBe(create);
    expect(screen.queryByRole('button', { name: '보존할 주소록 주소록 삭제' }) !== null).toBe(remove);
    expect(mocks.deleteAddressBook).not.toHaveBeenCalled();
  });

  it('같은 tick의 삭제 재요청을 막고 실패 후 행과 제어를 복구한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    mocks.deleteAddressBook.mockReturnValue(pendingDelete);
    renderClient();
    const remove = screen.getByRole('button', { name: '보존할 주소록 주소록 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.deleteAddressBook).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('보존할 주소록 주소록 삭제 중');

    rejectDelete(new Error('삭제 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제에 실패했습니다.', 'error'));
    expect(screen.getByText('보존할 주소록')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
  });
});
