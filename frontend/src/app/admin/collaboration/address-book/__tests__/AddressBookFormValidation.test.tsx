import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  addressBookCreateFormSchema,
  addressBookEditFormSchema,
} from '../address-book-form-validation';
import { AddressBookCreateDialog } from '../AddressBookCreateDialog';
import { AddressBookMemberDialog } from '../AddressBookMemberDialog';
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
      // [2026-08-28] 구성원 성명은 이제 별도 입력이다 — 종전에는 주소록 명칭을 복제했다.
      nm: '홍길동',
      telNo: '010-1234-5678',
      email: 'owner@example.com',
    };

    const parsed = addressBookCreateFormSchema.safeParse(validCreate);
    expect(parsed.success).toBe(true);
    if (parsed.success) expect(parsed.data.telNo).toBe('01012345678');
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, adbkNm: '가'.repeat(101) }).success).toBe(false);
    // 성명을 비우면 등록을 막는다 — 비면 상세 표의 '성명' 열이 다시 빈칸이 된다.
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, nm: '' }).success).toBe(false);
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, telNo: '010-12AB-5678' }).success).toBe(false);
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, telNo: '1'.repeat(12) }).success).toBe(false);
    expect(addressBookCreateFormSchema.safeParse({ ...validCreate, email: 'invalid-email' }).success).toBe(false);
    expect(addressBookEditFormSchema.safeParse({ adbkNm: '팀 주소록', rlsScopeCd: '' }).success).toBe(false);
  });

  it('등록 길이 오류는 write 없이 인라인으로 연결하고 첫 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    render(<AddressBookCreateDialog isOpen onClose={() => {}} onCreated={() => {}} />);
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
    render(<AddressBookCreateDialog isOpen onClose={() => {}} onCreated={() => {}} />);
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
      })],
    }));
    // [DIP B5 F8] 작성자 ID 를 구성원에 넣지 않는다 — 서버가 그 값으로 구성원을 대조해 서로를 덮었다.
    expect(mocks.createAddressBook.mock.calls[0][0].adbkMan[0]).not.toHaveProperty('userId');
    expect(email).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(email).toHaveFocus());
  });

  it('등록 pending 시작 전 동기 잠금으로 같은 submit을 한 번만 보낸다', async () => {
    let resolveCreate!: () => void;
    mocks.createAddressBook.mockReturnValueOnce(new Promise((resolve) => {
      resolveCreate = () => resolve({ adbkSn: 8 });
    }));
    const onCreated = vi.fn();
    render(<AddressBookCreateDialog isOpen onClose={() => {}} onCreated={onCreated} />);
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
    // [2026-09-12 §A3-1] 모달은 라우터로 이동하지 않는다 — 목록을 다시 읽는 것이 이행의 실질이다.
    await waitFor(() => expect(onCreated).toHaveBeenCalled());
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

describe('주소록 구성원 추가·수정·삭제 (DIP B5 F8)', () => {
  const members = [
    { adbkMbrSn: 31, nm: '갑', emlAddr: 'gap@example.com', mblTelno: '01011112222', homeTelno: '0212345678', userId: 'AUTHOR' },
    { adbkMbrSn: 32, nm: '을', emlAddr: 'eul@example.com', mblTelno: '01033334444', faxNo: '0299998888', userId: 'AUTHOR' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getAddressBook.mockResolvedValue({ adbkSn: 7, adbkNm: '팀 주소록', rlsScopeCd: 'G', adbkMan: members });
    mocks.updateAddressBook.mockResolvedValue(undefined);
    mocks.invalidateQueries.mockResolvedValue(undefined);
  });

  it('구성원을 추가하면 기존 구성원을 번호·집 전화·팩스까지 그대로 함께 보내고 새 구성원은 번호 없이 보낸다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText('갑');

    await user.click(screen.getByRole('button', { name: '구성원 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '구성원 추가' });
    await user.type(within(dialog).getByRole('textbox', { name: /성명/ }), '병');
    await user.type(within(dialog).getByRole('textbox', { name: '휴대전화' }), '010-5555-6666');
    await user.click(within(dialog).getByRole('button', { name: '구성원 추가' }));

    await waitFor(() => expect(mocks.updateAddressBook).toHaveBeenCalledTimes(1));
    const [adbkSn, body] = mocks.updateAddressBook.mock.calls[0];
    expect(adbkSn).toBe(7);
    expect(body.adbkNm).toBe('팀 주소록');
    expect(body.rlsScopeCd).toBe('G');
    expect(body.adbkMan).toEqual([
      { adbkMbrSn: 31, nm: '갑', emlAddr: 'gap@example.com', homeTelno: '0212345678', mblTelno: '01011112222', ofcTelno: undefined, faxNo: undefined },
      { adbkMbrSn: 32, nm: '을', emlAddr: 'eul@example.com', homeTelno: undefined, mblTelno: '01033334444', ofcTelno: undefined, faxNo: '0299998888' },
      { nm: '병', emlAddr: '', mblTelno: '01055556666' },
    ]);
    // 연결된 사용자는 서버 소유다 — 요청에 싣지 않는다.
    for (const member of body.adbkMan) expect(member).not.toHaveProperty('userId');
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('구성원을 추가했습니다.', 'success'));
  });

  it('구성원을 고치면 그 구성원만 바뀌고 이 화면이 묻지 않는 집 전화는 그대로 남는다', async () => {
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText('갑');

    await user.click(screen.getByRole('button', { name: '갑 수정' }));
    const dialog = await screen.findByRole('dialog', { name: '구성원 수정' });
    const name = within(dialog).getByRole('textbox', { name: /성명/ });
    expect(name).toHaveValue('갑');
    await user.clear(name);
    await user.type(name, '갑돌');
    await user.click(within(dialog).getByRole('button', { name: '구성원 저장' }));

    await waitFor(() => expect(mocks.updateAddressBook).toHaveBeenCalledTimes(1));
    const body = mocks.updateAddressBook.mock.calls[0][1];
    expect(body.adbkMan[0]).toMatchObject({ adbkMbrSn: 31, nm: '갑돌', homeTelno: '0212345678' });
    expect(body.adbkMan[1]).toMatchObject({ adbkMbrSn: 32, nm: '을', faxNo: '0299998888' });
  });

  it('성명이 비면 저장하지 않고 서버의 번호 붙은 오류는 편집 중인 입력에 붙인다', async () => {
    mocks.updateAddressBook.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'adbkMan[2].emlAddr', message: '이메일 형식이 아닙니다.' }] } },
    });
    const user = userEvent.setup();
    renderDetail();
    await screen.findByText('갑');

    await user.click(screen.getByRole('button', { name: '구성원 추가' }));
    const dialog = await screen.findByRole('dialog', { name: '구성원 추가' });
    await user.click(within(dialog).getByRole('button', { name: '구성원 추가' }));
    expect(mocks.updateAddressBook).not.toHaveBeenCalled();
    expect(within(dialog).getByRole('textbox', { name: /성명/ })).toHaveAttribute('aria-invalid', 'true');

    await user.type(within(dialog).getByRole('textbox', { name: /성명/ }), '병');
    await user.type(within(dialog).getByRole('textbox', { name: '이메일' }), 'byeong@example.com');
    await user.click(within(dialog).getByRole('button', { name: '구성원 추가' }));

    expect(await within(dialog).findByText('이메일 형식이 아닙니다.')).toBeVisible();
    expect(within(dialog).getByRole('textbox', { name: '이메일' })).toHaveAttribute('aria-invalid', 'true');
  });

  it('구성원 삭제는 같은 tick 중복 실행을 막고 busy 상태와 실패 피드백을 제공한다', async () => {
    let rejectUpdate!: (reason?: unknown) => void;
    mocks.updateAddressBook.mockReturnValueOnce(new Promise<void>((_, reject) => { rejectUpdate = reject; }));
    renderDetail();
    await screen.findByText('갑');
    const remove = screen.getByRole('button', { name: '을 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocks.updateAddressBook).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(mocks.updateAddressBook.mock.calls[0][1].adbkMan).toEqual([
      expect.objectContaining({ adbkMbrSn: 31, nm: '갑' }),
    ]);
    const pending = screen.getByRole('button', { name: '을 삭제 중' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');

    await act(async () => rejectUpdate(new Error('Network Error')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('구성원을 빼지 못했습니다.', 'error'));
    expect(screen.getByRole('button', { name: '을 삭제' })).toBeEnabled();
  });
});

describe('AddressBookMemberDialog 제출 계약 (DIP B5 F8)', () => {
  const book = { adbkSn: 7, adbkNm: '팀 주소록', rlsScopeCd: 'G', wrterId: 'w', crtDt: '', adbkMan: [{ adbkMbrSn: 41, nm: '갑', emlAddr: '' }] };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('구성원 저장은 pending 시작 전 동기 잠금으로 한 번만 보내고 실패하면 입력을 보존한다', async () => {
    let rejectUpdate!: (reason?: unknown) => void;
    mocks.updateAddressBook.mockReturnValueOnce(new Promise<void>((_, reject) => { rejectUpdate = reject; }));
    const onSaved = vi.fn();
    render(<AddressBookMemberDialog book={book} member={null} onClose={() => {}} onSaved={onSaved} />);
    const name = screen.getByRole('textbox', { name: /성명/ });
    fireEvent.change(name, { target: { value: '정' } });
    const submit = screen.getByRole('button', { name: '구성원 추가' });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    fireEvent.submit(form!);
    fireEvent.submit(form!);

    await waitFor(() => expect(mocks.updateAddressBook).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');

    await act(async () => rejectUpdate(new Error('Network Error')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('구성원을 저장하지 못했습니다.', 'error'));
    expect(name).toHaveValue('정');
    expect(onSaved).not.toHaveBeenCalled();
  });
});
