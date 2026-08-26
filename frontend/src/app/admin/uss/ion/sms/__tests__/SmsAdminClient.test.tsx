import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  refetch: vi.fn(),
  replace: vi.fn(),
  sendSms: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/uss/ion/sms',
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { list: [], total: 0, totalPage: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mocks.refetch,
    isFetching: false,
  }),
}));

vi.mock('@/services/foundation/operation/SmsAdminService', () => ({
  smsAdminService: {
    getSmsList: vi.fn(),
    sendSms: mocks.sendSms,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/patterns/empty-result-message', () => ({ emptyResultMessage: (_value: string, fallback: string) => fallback }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, filter, children }: React.PropsWithChildren<{ actions?: React.ReactNode; filter?: React.ReactNode }>) => (
    <main>{actions}{filter}{children}</main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

import SmsAdminClient from '../SmsAdminClient';

async function openSmsForm(user: ReturnType<typeof userEvent.setup>) {
  render(<SmsAdminClient initialSmsList={null} />);
  await user.click(screen.getByRole('button', { name: /새 메시지 구성/ }));
  const dialog = await screen.findByRole('dialog');
  const scope = within(dialog);
  const recipient = scope.getByPlaceholderText('010-0000-0000');
  const content = scope.getByPlaceholderText('메시지 내용을 입력하세요...');
  const submit = scope.getByRole('button', { name: /발송/ });
  return { recipient, content, submit, form: submit.closest('form')! };
}

describe('SmsAdminClient send validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendSms.mockResolvedValue(1);
  });

  it('라벨을 실제 입력 컨트롤의 접근 가능한 이름으로 연결한다', async () => {
    const fields = await openSmsForm(userEvent.setup());

    expect(fields.recipient).toHaveAccessibleName(/수신 번호.*필수/);
    expect(fields.content).toHaveAccessibleName(/메시지 내용.*필수/);
  });

  it('공백 수신 번호를 write sink로 보내지 않고 summary와 첫 오류 이동을 제공한다', async () => {
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '   ');
    await user.type(fields.content, '전송할 문자');

    fireEvent.submit(fields.form);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/수신 번호.*입력/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('숫자와 하이픈 외 문자가 포함된 수신 번호를 차단한다', async () => {
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-ABCD-1234');
    await user.type(fields.content, '전송할 문자');

    fireEvent.submit(fields.form);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/숫자와 하이픈/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('80자를 넘는 메시지는 write sink로 보내지 않는다', async () => {
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    fireEvent.change(fields.content, { target: { value: '가'.repeat(81) } });

    fireEvent.submit(fields.form);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 80자/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
  });

  it('서버 필드 오류를 수신 번호에 연결하고 입력값을 보존한다', async () => {
    mocks.sendSms.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'rcptnTelno', message: '발송할 수 없는 수신 번호입니다.' }] } },
    });
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    fireEvent.submit(fields.form);

    expect(await screen.findAllByText('발송할 수 없는 수신 번호입니다.')).not.toHaveLength(0);
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('보존할 문자 내용');
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('일반 서버 오류는 실제 메시지를 안내하고 입력값을 보존한다', async () => {
    mocks.sendSms.mockRejectedValueOnce(new Error('문자 게이트웨이에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('문자 게이트웨이에 연결할 수 없습니다.', 'error'));
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('보존할 문자 내용');
  });

  it('발송 pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveSend!: (value: number) => void;
    mocks.sendSms.mockReturnValueOnce(new Promise<number>((resolve) => { resolveSend = resolve; }));
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '중복 방지 문자');

    act(() => {
      fireEvent.submit(fields.form);
      fireEvent.submit(fields.form);
    });

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveSend(1);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('문자 메시지를 발송했습니다.', 'success'));
  });

  it('발송 중 취소·Escape를 막고 서버 필드 오류 뒤에도 입력 위치를 보존한다', async () => {
    let rejectSend!: (reason?: unknown) => void;
    mocks.sendSms.mockReturnValueOnce(new Promise<number>((_resolve, reject) => { rejectSend = reject; }));
    const user = userEvent.setup();
    const fields = await openSmsForm(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '오류 뒤에도 보존할 문자');

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    await user.keyboard('{Escape}');
    expect(screen.getByRole('dialog')).toBeVisible();

    await act(async () => rejectSend({
      response: { data: { errors: [{ field: 'rcptnTelno', message: '발송 대상을 다시 확인하세요.' }] } },
    }));
    expect(await screen.findAllByText('발송 대상을 다시 확인하세요.')).not.toHaveLength(0);
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('오류 뒤에도 보존할 문자');
    expect(cancel).toBeEnabled();
  });
});
