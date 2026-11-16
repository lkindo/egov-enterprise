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
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({
    columns = [],
    data = [],
    pagination,
  }: {
    columns?: { header: string; accessor: (item: unknown) => React.ReactNode }[];
    data?: unknown[];
    pagination?: { currentPage: number; totalPages: number; onPageChange: (page: number) => void };
  }) => (
    <div>
      {columns.map((column, colIdx) => (
        <span key={colIdx}>{column.header}</span>
      ))}
      {data.map((row, rowIdx) => (
        <div key={rowIdx}>
          {columns.map((column, colIdx) => (
            <div key={colIdx}>{column.accessor(row)}</div>
          ))}
        </div>
      ))}
      {pagination && pagination.totalPages > 1 ? (
        <button type="button" onClick={() => pagination.onPageChange(2)}>2페이지로</button>
      ) : null}
    </div>
  ),
}));
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

function renderClient(seed = initialData) {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <SmsHubClient initialData={seed} />
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
    sender: scope.getByPlaceholderText('02-000-0000'),
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

  it('발신 번호·수신 번호·메시지 라벨을 실제 입력 컨트롤에 연결한다', async () => {
    const fields = await openSendDialog(userEvent.setup());

    expect(fields.sender).toHaveAccessibleName('발신 번호');
    expect(fields.sender).toHaveValue('');
    expect(fields.recipient).toHaveAccessibleName('수신 번호');
    expect(fields.content).toHaveAccessibleName('메시지 내용');
  });

  it('공백 발신 번호를 write sink로 보내지 않고 첫 오류 포커스를 발신 번호로 이동한다', async () => {
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.sender, '   ');
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '전송할 문자');

    await user.click(fields.submit);

    expect(mocks.sendSms).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/발신 번호.*입력/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.sender).toHaveFocus());
  });

  it('공백 수신 번호를 write sink로 보내지 않고 summary와 첫 오류 이동을 제공한다', async () => {
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.sender, '02-123-4567');
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
    await user.type(fields.sender, '02-123-4567');
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
    await user.type(fields.sender, '02-123-4567');
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    await user.click(fields.submit);

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    expect(mocks.sendSms).toHaveBeenCalledWith({
      sndngTelno: '02-123-4567',
      sndngCn: '보존할 문자 내용',
      recipients: [{ rcptnTelno: '01012345678' }],
    });
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
    expect(fields.sender).toHaveValue('02-123-4567');
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
    await user.type(fields.sender, '02-123-4567');
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '보존할 문자 내용');

    await user.click(fields.submit);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('문자 게이트웨이에 연결할 수 없습니다.', 'error'));
    expect(fields.sender).toHaveValue('02-123-4567');
    expect(fields.recipient).toHaveValue('010-1234-5678');
    expect(fields.content).toHaveValue('보존할 문자 내용');
  });

  it('pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveSend!: (value: number) => void;
    mocks.sendSms.mockReturnValueOnce(new Promise<number>((resolve) => { resolveSend = resolve; }));
    const user = userEvent.setup();
    const fields = await openSendDialog(user);
    await user.type(fields.sender, '02-123-4567');
    await user.type(fields.recipient, '010-1234-5678');
    await user.type(fields.content, '중복 방지 문자');

    act(() => {
      fireEvent.click(fields.submit);
      fireEvent.click(fields.submit);
    });

    await waitFor(() => expect(mocks.sendSms).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveSend(1);
    /*
      이 테스트의 주제는 중복 제출 차단이므로 토스트는 완료 신호로만 쓴다. 정확한 문구는
      SmsAdminClient.test.tsx 의 '발송 결과 고지' 계약이 두 소비자 모두에 대해 고정한다 —
      여기서 문구를 다시 박으면 같은 사실을 두 곳에서 얼려 드리프트가 생긴다.
    */
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      expect.stringContaining('접수했습니다'), 'info'));
  });

  it('허위 지표·가짜 DELIVERED 배지 없이 실측 건수를 보이고 검색 시 page=1과 searchCondition=1을 넘긴다', async () => {
    renderClient({
      list: [
        {
          smsTrsmSn: 1,
          sndngTelno: '02-555-0000',
          sndngCn: '점검 안내',
          recptnCnt: 2,
          crtDt: '2026-08-28 10:00',
        } as never,
      ],
      total: 15,
      page: 1,
      size: 10,
      totalPage: 2,
    });

    expect(screen.queryByText('99.8%')).not.toBeInTheDocument();
    expect(screen.queryByText('240ms')).not.toBeInTheDocument();
    expect(screen.queryByText('DELIVERED')).not.toBeInTheDocument();
    expect(screen.getByText(/전체 발송 요청/)).toBeInTheDocument();
    expect(screen.getByText(/현재 페이지 건수/)).toBeInTheDocument();
    expect(screen.getByText('15')).toBeInTheDocument();
    expect(screen.getByText('02-555-0000')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '2페이지로' }));
    await waitFor(() => expect(mocks.getSmsList).toHaveBeenCalledWith({ page: 2 }));

    fireEvent.change(screen.getByPlaceholderText('Search packets...'), {
      target: { value: '긴급' },
    });
    await waitFor(() =>
      expect(mocks.getSmsList).toHaveBeenLastCalledWith({
        page: 1,
        searchCondition: '1',
        searchKeyword: '긴급',
      }),
    );
  });

  it('타인 발송 건으로 sndngCn 이 null 이면 발신자 전용 안내 문구를 보인다', () => {
    renderClient({
      list: [
        {
          smsTrsmSn: 7,
          sndngTelno: '010****0000',
          sndngCn: null,
          crtDt: '2026-08-28 10:00',
        } as never,
      ],
      total: 1,
      page: 1,
      size: 10,
      totalPage: 1,
    });

    expect(screen.getByText('발신자 본인만 내용을 볼 수 있습니다.')).toBeInTheDocument();
  });
});
