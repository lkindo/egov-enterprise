import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MailHistoryHubClient from '../MailHistoryHubClient';

const mocks = vi.hoisted(() => ({
  push: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
  getSentMails: vi.fn(),
  deleteMail: vi.fn(),
  resendMail: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: mocks.push }),
  usePathname: () => '/admin/collaboration/mail-history',
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({
  DynamicBreadcrumb: () => <nav aria-label="현재 위치">메일 발신 이력</nav>,
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

vi.mock('@/lib/hooks/use-debounced-value', () => ({
  useDebouncedValue: (value: string) => value,
}));

vi.mock('@/services/business/mail/MailService', () => ({
  MAIL_SEND_RESULT: { SUCCESS: 'S', FAILURE: 'F', PENDING: 'P' },
  mailService: {
    getSentMails: mocks.getSentMails,
    deleteMail: mocks.deleteMail,
    resendMail: mocks.resendMail,
  },
}));

const sentMails = [
  {
    emlDsptchSn: 101,
    sj: '월간 운영 보고',
    recptnPerson: 'admin@example.com',
    sndngResultCode: 'S',
    sndngDe: '2026-08-24 09:00',
    emailCn: '화면에 표시하면 안 되는 메일 본문',
  },
  {
    emlDsptchSn: 102,
    sj: '장애 알림',
    recptnPerson: 'operator@example.com',
    sndngResultCode: 'F',
    sndngDe: '2026-08-24 10:00',
  },
  {
    emlDsptchSn: 103,
    sj: '예약 발송',
    recptnPerson: 'scheduled@example.com',
    sndngResultCode: 'P',
    sndngDe: '2026-08-24 11:00',
  },
];

function renderClient() {
  const client = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={client}>
      <MailHistoryHubClient />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

describe('MailHistoryHubClient 수신자 표시·다시 보내기 (DIP B5 F7)', () => {
  const failedOwn = {
    emlDsptchSn: 201, sj: '회의 안내', recptnPerson: '김수신', sndngResultCode: 'F', sndngDe: '2026-09-26 09:00',
    dsptchPerson: '관리자', resendable: true,
  };
  const failedLegacy = {
    emlDsptchSn: 202, sj: '회의 안내', recptnPerson: '이수신', sndngResultCode: 'F', sndngDe: '2026-09-26 09:00',
    dsptchPerson: '관리자', resendable: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getSentMails.mockResolvedValue({ list: [failedOwn, failedLegacy], total: 2, totalPage: 1 });
    mocks.resendMail.mockResolvedValue(undefined);
  });

  it('여러 명에게 보낸 같은 메일의 이력 줄마다 받는 사람을 보인다', async () => {
    renderClient();

    expect(await screen.findByText('받는 사람 김수신')).toBeInTheDocument();
    expect(screen.getByText('받는 사람 이수신')).toBeInTheDocument();
  });

  it('다시 보내기는 같은 tick 중복 실행을 막고 busy 상태와 실패 피드백을 제공한다', async () => {
    const pending = deferred<void>();
    mocks.resendMail.mockReturnValueOnce(pending.promise);
    renderClient();

    fireEvent.click(await screen.findByText('받는 사람 김수신'));
    const resend = await screen.findByRole('button', { name: '선택한 메일 회의 안내 다시 보내기' });

    act(() => {
      resend.click();
      resend.click();
    });

    await waitFor(() => expect(mocks.resendMail).toHaveBeenCalledTimes(1));
    expect(mocks.resendMail).toHaveBeenCalledWith(201);
    const pendingButton = screen.getByRole('button', { name: '선택한 메일 회의 안내 다시 보내기 중' });
    expect(pendingButton).toHaveTextContent('다시 보내는 중…');
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    // 다시 보내는 동안 같은 이력을 지우지 못한다.
    expect(screen.getByTestId('mail-detail-delete-btn')).toBeDisabled();

    await act(async () => pending.reject(new Error('Network Error')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메일을 다시 보내지 못했습니다.', 'error'));
    expect(screen.getByRole('button', { name: '선택한 메일 회의 안내 다시 보내기' })).toBeEnabled();
  });

  it('서버가 다시 보낼 수 있다고 한 메일에만 다시 보내기를 두고, 성공하면 결과가 곧 반영된다고 알린다', async () => {
    renderClient();

    fireEvent.click(await screen.findByText('받는 사람 김수신'));
    fireEvent.click(await screen.findByRole('button', { name: '선택한 메일 회의 안내 다시 보내기' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '메일을 다시 보냈습니다. 결과는 잠시 뒤 이 목록에 반영됩니다.', 'success'));
  });

  it('다시 보낼 수 없는 실패 메일은 버튼 대신 조건을 말한다', async () => {
    renderClient();

    fireEvent.click(await screen.findByText('받는 사람 이수신'));
    expect(await screen.findByText('다시 보내기는 보낸 사람 본인이, 실패했거나 10분 넘게 대기 중인 메일에만 할 수 있습니다.')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /다시 보내기/ })).not.toBeInTheDocument();
  });

  it('서버가 거부하면 그 사유를 보인다', async () => {
    mocks.resendMail.mockRejectedValueOnce(Object.assign(new Error('rejected'), {
      response: { status: 409, data: { success: false, message: '발송을 처리하고 있습니다. 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.' } },
    }));
    renderClient();

    fireEvent.click(await screen.findByText('받는 사람 김수신'));
    fireEvent.click(await screen.findByRole('button', { name: '선택한 메일 회의 안내 다시 보내기' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      '발송을 처리하고 있습니다. 잠시 뒤 결과를 확인한 다음 다시 시도해 주세요.', 'error'));
  });
});

describe('MailHistoryHubClient A2 master-detail 계약', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.getSentMails.mockResolvedValue({
      list: sentMails,
      total: sentMails.length,
      totalPage: 1,
    });
    mocks.deleteMail.mockResolvedValue(undefined);
  });

  it('단일 A2 셸에서 메일을 선택하고 방향키와 Tab으로 상세 액션에 진입한다', async () => {
    renderClient();

    expect(screen.getByRole('heading', { level: 1, name: '메일 발신 이력 관리' })).toBeInTheDocument();
    expect(screen.getByTestId('master-detail-page')).toBeInTheDocument();

    const firstMail = await screen.findByRole('button', {
      name: '월간 운영 보고 발신 이력 상세 열기',
    });
    const secondMail = screen.getByRole('button', {
      name: '장애 알림 발신 이력 상세 열기',
    });
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status'))
      .toHaveTextContent('왼쪽 목록에서 확인할 발신 이력을 선택하세요.');
    expect(screen.getAllByTestId('mail-item')).toHaveLength(3);
    expect(screen.getByText('성공')).toHaveClass('bg-success', 'text-success-foreground');
    expect(screen.getByText('대기')).toHaveClass('bg-warning', 'text-warning-foreground');
    expect(screen.getByText('실패')).toHaveClass('bg-destructive', 'text-destructive-foreground');
    for (const label of ['성공', '대기', '실패']) {
      expect(screen.getByText(label).className).not.toMatch(/bg-(?:success|warning|destructive)\//);
    }
    expect(mocks.getSentMails).toHaveBeenCalledWith({
      page: 0,
      size: 20,
      searchKeyword: '',
      searchCondition: '1',
    });

    expect(firstMail).toHaveAttribute('data-a2-master-item');
    expect(firstMail).toHaveAttribute('tabindex', '0');
    expect(secondMail).toHaveAttribute('tabindex', '-1');

    fireEvent.click(firstMail);
    expect(firstMail).toHaveAttribute('aria-current', 'true');
    expect(screen.getByRole('heading', { level: 2, name: '발신 상세' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { level: 3, name: '월간 운영 보고' })).toBeInTheDocument();
    expect(screen.queryByText('화면에 표시하면 안 되는 메일 본문')).toBeNull();

    fireEvent.keyDown(firstMail, { key: 'ArrowDown' });
    expect(secondMail).toHaveFocus();
    expect(secondMail).toHaveAttribute('aria-current', 'true');
    expect(firstMail).not.toHaveAttribute('aria-current');

    fireEvent.keyDown(secondMail, { key: 'Tab' });
    const closeButton = screen.getByRole('button', { name: '상세 패널 닫기' });
    expect(closeButton).toHaveFocus();
    expect(screen.getByTestId('mail-detail-delete-btn')).toHaveAccessibleName(
      '선택한 메일 장애 알림 발송 이력 삭제',
    );

    fireEvent.click(closeButton);
    expect(secondMail).toHaveFocus();
    expect(secondMail).not.toHaveAttribute('aria-current');
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status'))
      .toHaveTextContent('왼쪽 목록에서 확인할 발신 이력을 선택하세요.');
  });

  it('페이지와 검색 조건 변경 시 숨은 상세 선택을 지우고 0-base 조회를 유지한다', async () => {
    mocks.getSentMails.mockResolvedValue({
      list: sentMails,
      total: 21,
      totalPage: 2,
    });
    renderClient();

    const firstMail = await screen.findByRole('button', {
      name: '월간 운영 보고 발신 이력 상세 열기',
    });
    fireEvent.click(firstMail);
    fireEvent.click(screen.getByRole('link', { name: '다음 페이지로 이동' }));
    await waitFor(() => expect(mocks.getSentMails).toHaveBeenLastCalledWith({
      page: 1,
      size: 20,
      searchKeyword: '',
      searchCondition: '1',
    }));
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status'))
      .toHaveTextContent('왼쪽 목록에서 확인할 발신 이력을 선택하세요.');

    fireEvent.change(screen.getByRole('textbox', { name: '메일 검색' }), {
      target: { value: '장애' },
    });
    expect(within(screen.getByTestId('master-detail-detail')).getByRole('status'))
      .toHaveTextContent('왼쪽 목록에서 확인할 발신 이력을 선택하세요.');
    expect(screen.queryByRole('heading', { level: 3, name: '월간 운영 보고' })).toBeNull();
    await waitFor(() => expect(mocks.getSentMails).toHaveBeenLastCalledWith({
      page: 0,
      size: 20,
      searchKeyword: '장애',
      searchCondition: '1',
    }));
  });

  it('🚨 발신자를 목록과 상세에 보이고 발신자로도 검색한다 (DIP V4)', async () => {
    mocks.getSentMails.mockResolvedValue({
      list: [{ ...sentMails[0], dsptchPerson: '홍발신' }],
      total: 1,
      totalPage: 1,
    });
    renderClient();

    const mail = await screen.findByRole('button', { name: '월간 운영 보고 발신 이력 상세 열기' });
    expect(mail).toHaveTextContent('홍발신');
    fireEvent.click(mail);
    const detail = screen.getByTestId('master-detail-detail');
    expect(within(detail).getByText('발신자').nextElementSibling).toHaveTextContent('홍발신');

    fireEvent.change(screen.getByRole('combobox', { name: '검색 대상' }), { target: { value: '3' } });
    fireEvent.change(screen.getByRole('textbox', { name: '메일 검색' }), { target: { value: '홍' } });
    await waitFor(() => expect(mocks.getSentMails).toHaveBeenLastCalledWith({
      page: 0,
      size: 20,
      searchKeyword: '홍',
      searchCondition: '3',
    }));
    expect(screen.getByRole('textbox', { name: '메일 검색' })).toHaveAttribute('placeholder', '발신자 이름 검색');
  });

  it('삭제 확인을 취소하면 보존하고 승인하면 선택한 이력만 삭제한다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', {
      name: '월간 운영 보고 발신 이력 상세 열기',
    }));
    const deleteButton = screen.getByTestId('mail-detail-delete-btn');

    mocks.confirm.mockResolvedValueOnce(false);
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledWith({
      title: '메일 이력 삭제',
      message: "'월간 운영 보고' 발송 이력을 삭제합니다. 삭제한 이력은 복구할 수 없습니다.",
      confirmText: '삭제',
      variant: 'destructive',
    }));
    expect(mocks.deleteMail).not.toHaveBeenCalled();

    mocks.confirm.mockResolvedValueOnce(true);
    fireEvent.click(deleteButton);
    await waitFor(() => expect(mocks.deleteMail).toHaveBeenCalledWith(101));
    await waitFor(() => expect(screen.getByRole('textbox', { name: '메일 검색' })).toHaveFocus());
  });

  it('삭제는 같은 tick 중복 실행을 막고 busy 상태와 실패 피드백을 제공한다', async () => {
    const pending = deferred<void>();
    mocks.deleteMail.mockReturnValueOnce(pending.promise);
    renderClient();

    fireEvent.click(await screen.findByRole('button', {
      name: '월간 운영 보고 발신 이력 상세 열기',
    }));
    const deleteButton = screen.getByRole('button', {
      name: '선택한 메일 월간 운영 보고 발송 이력 삭제',
    });

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteMail).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', {
      name: '선택한 메일 월간 운영 보고 발송 이력 삭제 중',
    });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');

    await act(async () => pending.reject(new Error('삭제 API 장애')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메일 삭제에 실패했습니다.', 'error'));
    expect(screen.getByRole('button', {
      name: '선택한 메일 월간 운영 보고 발송 이력 삭제',
    })).toBeEnabled();
  });

  it('신규 발송과 새로고침을 실제 동작에 연결한다', async () => {
    renderClient();
    await screen.findByRole('button', { name: '월간 운영 보고 발신 이력 상세 열기' });

    fireEvent.click(screen.getByRole('button', { name: '신규 발송' }));
    expect(mocks.push).toHaveBeenCalledWith('/admin/collaboration/mail-send');

    fireEvent.click(screen.getByRole('button', { name: '발신 이력 새로고침' }));
    await waitFor(() => expect(mocks.getSentMails).toHaveBeenCalledTimes(2));
  });
});
