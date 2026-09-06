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

// 피커 자체의 계약은 recipient-picker.test.tsx 가 본다. 여기서는 "피커가 돌려준 선택을 화면이 어떻게 싣는가" 만 본다.
vi.mock('@/app/components/ui/recipient-picker', async () => {
  const actual = await vi.importActual<typeof import('@/app/components/ui/recipient-picker')>('@/app/components/ui/recipient-picker');
  return {
    ...actual,
    RecipientPicker: ({ onConfirm, onClose }: { onConfirm: (r: unknown[]) => void; onClose: () => void }) => (
      <div role="dialog" aria-label="수신자 찾기">
        <button
          type="button"
          onClick={() => {
            onConfirm([
              { kind: 'user', esntlId: 'USR_A', name: '김갑', deptNm: '총무과' },
              { kind: 'contact', name: '박외부', email: 'park@partner.example' },
              // 이미 직접 입력한 주소와 같은 명함 — 한 번만 담겨야 한다.
              { kind: 'contact', name: 'receiver', email: 'receiver@example.com' },
            ]);
            onClose();
          }}
        >
          피커 선택 확정
        </button>
      </div>
    ),
  };
});

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
   * [2026-08-29 → 2026-09-05] 직접 입력은 여전히 이메일 주소만 받는다.
   *
   * 직접 입력 값은 서버가 그대로 SMTP 수신 주소로 쓴다(MailRecipientDto.emlAddr). ID 로 사람을 찾는
   * 경로는 이제 '수신자 찾기'(사용자 검색·주소록)이며 그쪽은 esntlId 를 실어 서버가 주소를 해석한다.
   * 종전 화면은 아무 문자열이나 받아 원시 ID 를 주소로 실어 보냈고, 발송이 @Async 라 화면에는
   * '발송 요청되었습니다' 만 남았다 — 그 결함이 되살아나지 않게 형식 강제를 유지한다.
   */
  it('이메일이 아닌 값을 직접 입력하면 추가하지 않고, 이름으로 찾는 경로를 안내한다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);

    const recipient = screen.getByRole('textbox', { name: '수신자 선택' });
    await user.type(recipient, 'kim01');
    await user.click(screen.getByRole('button', { name: /추가/ }));

    expect(await screen.findAllByText(/이메일 주소 형식이 아닙니다.*수신자 찾기/)).not.toHaveLength(0);
    expect(screen.queryByText('1명 선택됨')).toBeNull();
  });

  it('직접 입력한 주소는 recipients[].emlAddr 로 싣고, 종전 recptnPerson 은 보내지 않는다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    await enterValidMail(user);

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    await waitFor(() => expect(mocks.sendMail).toHaveBeenCalledTimes(1));
    const payload = mocks.sendMail.mock.calls[0][0];
    expect(payload.recipients).toEqual([{ emlAddr: 'receiver@example.com' }]);
    expect(payload).not.toHaveProperty('recptnPerson');
  });

  /**
   * [2026-09-05 DEC-OPS-035] 수신자 찾기 — 사용자는 esntlId 만, 명함은 주소만 싣는다. 같은 주소는 한 번만.
   * 사용자의 주소는 화면이 알지 못하므로 payload 어디에도 이메일이 아닌 식별자 외의 값이 실리면 안 된다.
   */
  it('수신자 찾기로 고른 사용자는 esntlId 만, 명함은 주소만 싣고 중복 주소는 한 번만 담는다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    await enterValidMail(user);

    await user.click(screen.getByRole('button', { name: '수신자 찾기' }));
    await user.click(await screen.findByRole('button', { name: '피커 선택 확정' }));

    expect(screen.getByText('3명 선택됨')).toBeInTheDocument();
    const badges = screen.getAllByTestId('selected-recipient-badge');
    expect(badges.map((badge) => badge.getAttribute('data-recipient-kind'))).toEqual(['contact', 'user', 'contact']);
    expect(screen.getByText('김갑')).toBeInTheDocument();
    // 사용자 항목은 소속만 보이고 이메일은 어디에도 보이지 않는다.
    expect(screen.getByText('총무과')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    await waitFor(() => expect(mocks.sendMail).toHaveBeenCalledTimes(1));
    expect(mocks.sendMail.mock.calls[0][0].recipients).toEqual([
      { emlAddr: 'receiver@example.com' },
      { esntlId: 'USR_A' },
      { emlAddr: 'park@partner.example' },
    ]);
  });

  it('선택한 사용자를 제외하면 payload 에서도 빠진다', async () => {
    const user = userEvent.setup();
    render(<MailSendHubClient />);
    await enterValidMail(user);
    await user.click(screen.getByRole('button', { name: '수신자 찾기' }));
    await user.click(await screen.findByRole('button', { name: '피커 선택 확정' }));

    await user.click(screen.getByRole('button', { name: '김갑 수신자 제외' }));
    expect(screen.getByText('2명 선택됨')).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));
    await waitFor(() => expect(mocks.sendMail).toHaveBeenCalledTimes(1));
    expect(mocks.sendMail.mock.calls[0][0].recipients).toEqual([
      { emlAddr: 'receiver@example.com' },
      { emlAddr: 'park@partner.example' },
    ]);
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
