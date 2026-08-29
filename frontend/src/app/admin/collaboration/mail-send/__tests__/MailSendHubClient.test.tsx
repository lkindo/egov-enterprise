import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import MailSendHubClient from '../MailSendHubClient';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  sendMail: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock('@/services/business/mail/MailService', () => ({
  mailService: { sendMail: mocks.sendMail },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

async function enterValidMail(user: ReturnType<typeof userEvent.setup>) {
  const recipient = screen.getByRole('textbox', { name: '수신자 선택' });
  await user.type(recipient, 'receiver@example.com');
  await user.click(screen.getByRole('button', { name: /추가/ }));

  const subject = screen.getByRole('textbox', { name: '메일 제목' });
  const content = screen.getByRole('textbox', { name: '메일 본문' });
  await user.type(subject, '정상 메일 제목');
  await user.type(content, '정상 메일 본문');
  return { recipient, subject, content };
}

describe('MailSendHubClient validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.sendMail.mockResolvedValue(1);
  });

  /**
   * [2026-08-29] 이메일이 아닌 값을 수신자로 받지 않는다.
   *
   * 서버에는 ID 를 메일 주소로 바꿔 주는 경로가 없다 — MailService 가 recptnPerson 을 손대지
   * 않고 MailAsyncProcessor 가 `emailSender.send(..., recptnPerson)` 의 수신 주소로 그대로
   * 쓴다. 종전 화면은 아무 문자열이나 받아 `recipient.email || recipient.id` 로 원시 ID 를
   * 실어 보냈고, 발송이 @Async 라 화면에는 '발송 요청되었습니다' 만 남았다. 사용자는 갔다고
   * 믿는데 그 주소로는 갈 수 없다.
   */
  it('이메일이 아닌 수신자를 추가하지 않고, 주소를 찾아 주지 못한다고 알린다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);

    const recipient = screen.getByRole('textbox', { name: '수신자 선택' });
    await user.type(recipient, 'kim01');
    await user.click(screen.getByRole('button', { name: /추가/ }));

    expect(await screen.findAllByText(/ID 로 주소를 찾지 못합니다/)).not.toHaveLength(0);
    expect(screen.queryByText('1명 선택됨')).toBeNull();
  });

  it('발송 payload 에 이메일 주소만 싣는다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    await enterValidMail(user);

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    await waitFor(() => expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({ recptnPerson: 'receiver@example.com' }),
    ));
  });

  it('제목 max+1을 write sink로 보내지 않고 제목 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    const fields = await enterValidMail(user);
    fireEvent.change(fields.subject, { target: { value: '가'.repeat(101) } });

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 100자/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.subject).toHaveFocus());
  });

  it('수신자가 없으면 summary와 inline 오류를 보이고 수신자 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    await user.type(screen.getByRole('textbox', { name: '메일 제목' }), '제목');
    await user.type(screen.getByRole('textbox', { name: '메일 본문' }), '본문');

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    expect(mocks.sendMail).not.toHaveBeenCalled();
    await waitFor(() => expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument());
    expect(await screen.findAllByText(/수신자.*선택/)).not.toHaveLength(0);
    await waitFor(() => expect(screen.getByRole('textbox', { name: '수신자 선택' })).toHaveFocus());
  });

  it('서버 필드 오류를 제목에 연결하고 입력값을 보존한다', async () => {
    mocks.sendMail.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'sj', message: '발송할 수 없는 제목입니다.' }] } },
    });
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    const fields = await enterValidMail(user);

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    expect(await screen.findAllByText('발송할 수 없는 제목입니다.')).not.toHaveLength(0);
    expect(fields.subject).toHaveValue('정상 메일 제목');
    expect(fields.content).toHaveValue('정상 메일 본문');
    await waitFor(() => expect(fields.subject).toHaveFocus());
  });

  it('일반 서버 오류는 토스트로 안내하고 입력값을 보존한다', async () => {
    mocks.sendMail.mockRejectedValueOnce(new Error('메일 서버에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    const fields = await enterValidMail(user);

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('메일 서버에 연결할 수 없습니다.', 'error'));
    expect(fields.subject).toHaveValue('정상 메일 제목');
    expect(fields.content).toHaveValue('정상 메일 본문');
    expect(screen.getByTestId('selected-recipient-badge')).toBeInTheDocument();
  });

  it('발송 pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveSend!: (value: number) => void;
    mocks.sendMail.mockReturnValueOnce(new Promise<number>((resolve) => {
      resolveSend = resolve;
    }));
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    await enterValidMail(user);
    const submit = screen.getByRole('button', { name: /메일 발송/ });
    const form = submit.closest('form');
    expect(form).not.toBeNull();

    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });

    await waitFor(() => expect(mocks.sendMail).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    resolveSend(1);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/collaboration/mail-history'));
  });
});
