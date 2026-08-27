import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addressBookCreateFormSchema,
  addressBookEditFormSchema,
} from '../address-book-form-validation';
import AddressBookInsertHubClient from '../insert-address-book/AddressBookInsertHubClient';
import SelectAddressBookDetailClient from '../select-address-book-detail/[id]/SelectAddressBookDetailClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  createAddressBook: vi.fn(),
  confirm: vi.fn(),
  deleteAddressBook: vi.fn(),
  getAddressBook: vi.fn(),
  invalidateQueries: vi.fn(),
  push: vi.fn(),
  toast: vi.fn(),
  updateAddressBook: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: '7' }),
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'user-1', name: '테스트 사용자' }, loading: false }),
}));

vi.mock('@/services/business/user/addressbook/AddressbookUserService', () => ({
  addressbookUserService: {
    createAddressBook: mocks.createAddressBook,
    deleteAddressBook: mocks.deleteAddressBook,
    getAddressBook: mocks.getAddressBook,
    updateAddressBook: mocks.updateAddressBook,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));

function renderDetail() {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  vi.spyOn(queryClient, 'invalidateQueries').mockImplementation(mocks.invalidateQueries);
  return render(
    <QueryClientProvider client={queryClient}>
      <SelectAddressBookDetailClient />
    </QueryClientProvider>,
  );
}

describe('address-book form validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.createAddressBook.mockResolvedValue({ adbkSn: 8 });
    mocks.confirm.mockResolvedValue(true);
    mocks.deleteAddressBook.mockResolvedValue(undefined);
    mocks.getAddressBook.mockResolvedValue({
      adbkSn: 7,
      adbkNm: '팀 주소록',
      rlsScopeCd: 'G',
      adbkMan: [],
    });
    mocks.invalidateQueries.mockResolvedValue(undefined);
    mocks.updateAddressBook.mockResolvedValue(undefined);
  });

  it('generated 주소록/구성원 경계를 유지하며 필수·길이·전화·이메일 형식을 강화한다', () => {
    const validCreate = {
      adbkNm: '파트너 주소록',
      rlsScopeCd: 'G',
      userId: 'user-1',
      // [2026-08-28] 구성원 성명은 이제 별도 입력이다 — 종전에는 주소록 명칭을 복제했다.
      nm: '홍길동',
      telNo: '010-1234-5678',
      email: 'owner@example.com',
    };

    const parsed = addressBookCreateFormSchema.safeParse(validCreate);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.telNo).toBe('01012345678');
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, adbkNm: '가'.repeat(101) }).success).toBe(false);
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, userId: '' }).success).toBe(false);
    // 성명을 비우면 등록을 막는다 — 비면 상세 표의 '성명' 열이 다시 빈칸이 된다.
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, nm: '' }).success).toBe(false);
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, telNo: '010-12AB-5678' }).success).toBe(false);
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, telNo: '1'.repeat(12) }).success).toBe(false);
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, email: 'invalid-email' }).success).toBe(false);
    expect(addressBookEditFormSchema.safeParse({ adbkNm: '팀 주소록', rlsScopeCd: '' }).success).toBe(false);
  });

  it('등록 길이 오류는 write 없이 인라인으로 연결하고 첫 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    render(<AddressBookInsertHubClient />);
    const name = screen.getByRole('textbox', { name: /주소록 명칭/ });
    fireEvent.change(name, { target: { value: '가'.repeat(101) } });

    await user.click(screen.getByRole('button', { name: /주소록 등록$/ }));

    expect(mocks.createAddressBook).not.toHaveBeenCalled();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 100자');
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('등록 서버 구성원 필드 오류를 로컬 입력에 귀속하고 값을 유지한다', async () => {
    mocks.createAddressBook.mockRejectedValueOnce({
      response: {
        data: {
          errors: [{ field: 'adbkMan[0].emlAddr', message: '이미 등록된 이메일입니다.' }],
        },
      },
    });
    const user = userEvent.setup();
    render(<AddressBookInsertHubClient />);
    const name = screen.getByRole('textbox', { name: /주소록 명칭/ });
    const phone = screen.getByRole('textbox', { name: '전화번호' });
    const email = screen.getByRole('textbox', { name: '이메일' });
    await user.type(name, '보존할 주소록');
    await user.type(screen.getByRole('textbox', { name: /구성원 성명/ }), '홍길동');
    await user.type(phone, '010-1234-5678');
    await user.type(email, 'owner@example.com');

    await user.click(screen.getByRole('button', { name: /주소록 등록$/ }));

    expect(await screen.findByText('이미 등록된 이메일입니다.')).toBeVisible();
    expect(name).toHaveValue('보존할 주소록');
    expect(phone).toHaveValue('010-1234-5678');
    expect(email).toHaveValue('owner@example.com');
    expect(mocks.createAddressBook).toHaveBeenCalledWith(expect.objectContaining({
      adbkMan: [expect.objectContaining({
        mblTelno: '01012345678',
        userId: 'user-1',
      })],
    }));
    expect(email).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(email).toHaveFocus());
  });

  it('등록 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolveCreate!: () => void;
    mocks.createAddressBook.mockReturnValueOnce(new Promise((resolve) => {
      resolveCreate = () => resolve({ adbkSn: 8 });
    }));
    render(<AddressBookInsertHubClient />);
    const name = screen.getByRole('textbox', { name: /주소록 명칭/ });
    fireEvent.change(name, { target: { value: '중복 방지 주소록' } });
    fireEvent.change(screen.getByRole('textbox', { name: /구성원 성명/ }), { target: { value: '홍길동' } });
    const submit = screen.getByRole('button', { name: /주소록 등록$/ });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    expect(mocks.createAddressBook).toHaveBeenCalledTimes(1);
    expect(submit).toBeDisabled();
    resolveCreate();
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });

  it('수정 길이 오류는 write 없이 인라인으로 연결하고 첫 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    renderDetail();
    const name = await screen.findByDisplayValue('팀 주소록');
    fireEvent.change(name, { target: { value: '가'.repeat(101) } });

    await user.click(screen.getByRole('button', { name: /저장$/ }));

    expect(mocks.updateAddressBook).not.toHaveBeenCalled();
    expect(name).toHaveAttribute('aria-invalid', 'true');
    expect(await screen.findByRole('alert', { name: /입력 오류/ })).toHaveTextContent('최대 100자');
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('수정 서버 필드 오류를 인라인으로 연결하고 편집값을 유지한다', async () => {
    mocks.updateAddressBook.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'adbkNm', message: '이미 사용 중인 주소록 명칭입니다.' }] } },
    });
    const user = userEvent.setup();
    renderDetail();
    const name = await screen.findByDisplayValue('팀 주소록');
    await user.clear(name);
    await user.type(name, '보존할 수정 명칭');

    await user.click(screen.getByRole('button', { name: /저장$/ }));

    expect(await screen.findByText('이미 사용 중인 주소록 명칭입니다.')).toBeVisible();
    expect(name).toHaveValue('보존할 수정 명칭');
    expect(name).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(name).toHaveFocus());
  });

  it('수정 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolveUpdate!: () => void;
    mocks.updateAddressBook.mockReturnValueOnce(new Promise<void>((resolve) => {
      resolveUpdate = resolve;
    }));
    renderDetail();
    await screen.findByDisplayValue('팀 주소록');
    const submit = screen.getByRole('button', { name: /저장$/ });
    const remove = screen.getByRole('button', { name: '팀 주소록 주소록 삭제' });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.click(remove);
    fireEvent.submit(form!);

    await waitFor(() => expect(mocks.updateAddressBook).toHaveBeenCalledTimes(1));
    expect(mocks.deleteAddressBook).not.toHaveBeenCalled();
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    expect(submit).toHaveAccessibleName('저장 중...');
    resolveUpdate();
    await waitFor(() => expect(mocks.push).toHaveBeenCalled());
  });

  it('상세 삭제는 같은 tick의 재요청을 막고 실패 후 편집값과 화면을 보존한다', async () => {
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    mocks.deleteAddressBook.mockReturnValue(pendingDelete);
    renderDetail();
    const name = await screen.findByDisplayValue('팀 주소록');
    fireEvent.change(name, { target: { value: '보존할 수정 명칭' } });
    const remove = screen.getByRole('button', { name: '팀 주소록 주소록 삭제' });
    const submit = screen.getByRole('button', { name: /저장$/ });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.click(remove);
      fireEvent.submit(form!);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.deleteAddressBook).toHaveBeenCalledTimes(1));
    expect(mocks.updateAddressBook).not.toHaveBeenCalled();
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('팀 주소록 주소록 삭제 중');
    expect(submit).toBeDisabled();
    expect(submit).not.toHaveAttribute('aria-busy');

    rejectDelete(new Error('삭제 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제에 실패했습니다.', 'error'));
    expect(name).toHaveValue('보존할 수정 명칭');
    expect(remove).not.toBeDisabled();
    expect(mocks.push).not.toHaveBeenCalled();
  });
});
