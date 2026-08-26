import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  getSmsList: vi.fn(),
  sendSms: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/services/foundation/operation/SmsAdminService', () => ({
  smsAdminService: {
    getSmsList: mocks.getSmsList,
    sendSms: mocks.sendSms,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/layout/page-header', () => ({ PageHeader: () => null }));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ actions }: { actions?: React.ReactNode }) => <div>{actions}</div>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ children }: React.PropsWithChildren) => <section>{children}</section>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));
vi.mock('framer-motion', () => ({
  AnimatePresence: ({ children }: React.PropsWithChildren) => children,
  motion: { div: ({ children }: React.PropsWithChildren) => <div>{children}</div> },
}));
vi.mock('@/components/ui/dialog', async () => {
  const React = await import('react');
  const DialogContext = React.createContext<{
    open: boolean;
    onOpenChange: (open: boolean) => void;
  }>({ open: false, onOpenChange: () => undefined });
  const Container = ({ children }: React.PropsWithChildren) => <div>{children}</div>;
  return {
    Dialog: ({ open, onOpenChange, children }: React.PropsWithChildren<{
      open: boolean;
      onOpenChange: (open: boolean) => void;
    }>) => <DialogContext.Provider value={{ open, onOpenChange }}>{children}</DialogContext.Provider>,
    DialogTrigger: ({ children }: React.PropsWithChildren) => {
      const context = React.useContext(DialogContext);
      return React.cloneElement(children as React.ReactElement<{ onClick?: () => void }>, {
        onClick: () => context.onOpenChange(true),
      });
    },
    DialogContent: ({ children }: React.PropsWithChildren) => {
      const context = React.useContext(DialogContext);
      return context.open ? (
        <div role="dialog">
          <button type="button" onClick={() => context.onOpenChange(false)}>모달 닫기 요청</button>
          {children}
        </div>
      ) : null;
    },
    DialogHeader: Container,
    DialogTitle: ({ children }: React.PropsWithChildren) => <h2>{children}</h2>,
    DialogDescription: ({ children }: React.PropsWithChildren) => <p>{children}</p>,
  };
});

import SmsHubClient from '../SmsHubClient';

const initialData = { list: [], total: 0, page: 1, size: 10, totalPage: 1 };

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SmsHubClient initialData={initialData} />
    </QueryClientProvider>,
  );
}

async function openSendDialog(user: ReturnType<typeof userEvent.setup>) {
  renderClient();
  await user.click(screen.getByRole('button', { name: /신규 문자 발송/ }));
  const dialog = await screen.findByRole('dialog');
  const scope = within(dialog);
  return {
    dialog,
    recipient: scope.getByPlaceholderText('010-0000-0000'),
    content: scope.getByPlaceholderText('전달할 메시지 내용을 입력하세요...'),
    cancel: scope.getByRole('button', { name: 'ABORT_OPERATION' }),
    closeRequest: scope.getByRole('button', { name: '모달 닫기 요청' }),
    submit: scope.getByRole('button', { name: /EXECUTE_TRANSMISSION/ }),
  };
}

describe('SmsHubClient send validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getSmsList.mockResolvedValue(initialData);
    mocks.sendSms.mockResolvedValue(1);
  });

  it('수신 번호와 메시지 라벨을 실제 입력 컨트롤에 연결한다', async () => {
    const fields = await openSendDialog(userEvent.setup());

    expect(fields.recipient).toHaveAccessibleName('수신 번호');
    expect(fields.content).toHaveAccessibleName('메시지 내용');
  });

  it('공백 수신 번호를 write sink로 보내지 않고 summary와 첫 오류 이동을 제공한다', async () => {
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.recipient, '   ');
    await user.type(fields.content, '전송할 문자');

    await user.click(fields.submit);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/수신 번호.*입력/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('수신 번호 문자와 메시지 max+1을 write sink에서 차단한다', async () => {
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.recipient, '010-ABCD-1234');
    fireEvent.change(fields.content, { target: { value: '가'.repeat(81) } });

    await user.click(fields.submit);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/숫자와 하이픈/)).not.toHaveLength(0);
    expect(await screen.findAllByText(/최대 80자/)).not.toHaveLength(0);
  });

  it('발송 pending 중 닫기를 막고 서버 필드 오류 뒤 modal·입력·summary를 보존한다', async () => {
    let rejectSend!: (reason?: unknown) => void;
    mocks.sendSms.mockReturnValueOnce(new Promise<number>((_, reject) => {
      rejectSend = reject;
    }));
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    await user.click(fields.submit);

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.submit).toHaveAccessibleName('PROCESSING...');
    expect(fields.cancel).toBeDisabled();
    fireEvent.click(fields.cancel);
    fireEvent.click(fields.closeRequest);
    expect(screen.getByRole('dialog')).toBeVisible();

    await act(async () => rejectSend({
      response: { data: { errors: [{ field: 'rcptnTelno', message: '발송할 수 없는 수신 번호입니다.' }] } },
    }));

    expect(await screen.findAllByText('발송할 수 없는 수신 번호입니다.')).not.toHaveLength(0);
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('보존할 문자 내용');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent('발송할 수 없는 수신 번호입니다.');
    expect(screen.getByRole('dialog')).toBeVisible();
    expect(fields.cancel).toBeEnabled();
    await waitFor(() => expect(fields.recipient).toHaveFocus());
  });

  it('일반 서버 오류는 실제 메시지를 안내하고 입력값을 보존한다', async () => {
    mocks.sendSms.mockRejectedValueOnce(new Error('문자 게이트웨이에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    await user.click(fields.submit);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('문자 게이트웨이에 연결할 수 없습니다.', 'error'));
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('보존할 문자 내용');
  });

  it('pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveSend!: (value: number) => void;
    mocks.sendSms.mockReturnValueOnce(new Promise<number>((resolve) => { resolveSend = resolve; }));
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '중복 방지 문자');

    act(() => {
      fireEvent.click(fields.submit);
      fireEvent.click(fields.submit);
    });

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveSend(1);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('SMS가 성공적으로 전송되었습니다.', 'success'));
  });
});
