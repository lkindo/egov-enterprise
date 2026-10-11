import { act, fireEvent, render, renderHook, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import MailSendHubClient from '../MailSendHubClient';
import { useRecipientAddressBook } from '@/app/components/ui/recipient-picker-sources';
import { inProjection } from '@/test-utils/projection';

const mocks = vi.hoisted(() => ({
  back: vi.fn(),
  push: vi.fn(),
  sendMail: vi.fn(),
  getDeliveryStatus: vi.fn(),
  toast: vi.fn(),
  /** 피커 stub 이 마지막으로 받은 주소록 출처. 조합 지점이 무엇을 주입했는지 동일성으로 본다. */
  pickerProps: { addressBook: undefined as unknown },
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ back: mocks.back, push: mocks.push }),
}));

vi.mock('@/services/business/mail/MailService', () => ({
  mailService: { sendMail: mocks.sendMail, getDeliveryStatus: mocks.getDeliveryStatus },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

// 발송 버튼은 발송 권한(MAIL_SEND)으로, 주소록 출처는 주소록 조회 권한(ADBK_READ)으로 보인다 — 기본은 둘 다 가진 사용자이고,
// 표시 판정 테스트만 권한을 줄인다. 두 훅은 실제처럼 같은 사용자를 돌려준다. 부서 탭(DEPT_READ·USER_READ)은 이 스펙의 대상이 아니라 주지 않는다.
const auth = vi.hoisted(() => ({ permissions: [] as string[] }));
vi.mock('@/contexts/AuthContext', () => {
  const current = () => ({ user: { permissions: auth.permissions, authorizationVersion: 'v1' } });
  return { useAuth: current, useOptionalAuth: current };
});

// 피커 자체의 계약은 recipient-picker.test.tsx 가 본다. 여기서는 "피커가 돌려준 선택을 화면이 어떻게 싣는가" 만 본다.
vi.mock('@/app/components/ui/recipient-picker', async () => {
  const actual = await vi.importActual<typeof import('@/app/components/ui/recipient-picker')>('@/app/components/ui/recipient-picker');
  return {
    ...actual,
    RecipientPicker: ({ onConfirm, onClose, addressBook }: { onConfirm: (r: unknown[]) => void; onClose: () => void; addressBook?: unknown }) => {
      mocks.pickerProps.addressBook = addressBook;
      return (
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
      );
    },
  };
});

/** 발송 가능 상태를 조회하므로 QueryClient 가 필요하다(DIP B5 F7). 기본은 SMTP 가 연결된 배포다. */
let lastClient: QueryClient | null = null;
function renderCompose() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  lastClient = client;
  return render(
    <QueryClientProvider client={client}>
      <MailSendHubClient />
    </QueryClientProvider>,
  );
}

beforeEach(() => {
  auth.permissions = ['MAIL_SEND', 'ADBK_READ'];
  mocks.getDeliveryStatus.mockResolvedValue({ deliveryConfigured: true, senderImplementation: 'RealEmailSender' });
});

/*
 * [2026-10-01] 발송 버튼은 발송 권한으로 보인다.
 * 이 화면은 권한 없이도 들어올 수 있어, 종전에는 메일을 다 쓴 뒤에야 403 을 만났다. 작성이 이 화면의 목적이라
 * 폼은 그대로 두고 버튼 자리에 사유를 보인다.
 */
describe('MailSendHubClient 발송 권한 표시', () => {
  it('발송 권한이 없으면 발송 버튼 대신 사유를 보인다 — 폼은 그대로 있다', async () => {
    auth.permissions = [];
    renderCompose();

    await waitFor(() => expect(screen.queryByText(/메일 발송 설정/)).not.toBeInTheDocument());
    expect(screen.queryByTestId('mail-send-btn')).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('메일을 보낼 권한이 없습니다.');
    expect(screen.getByTestId('mail-subject-input')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '취소' })).toBeInTheDocument();
  });

  it('발송 권한이 있으면 발송 버튼이 보이고 사유는 없다', async () => {
    renderCompose();

    expect(screen.getByTestId('mail-send-btn')).toBeInTheDocument();
    expect(screen.queryByText('메일을 보낼 권한이 없습니다.')).not.toBeInTheDocument();
  });
});

describe('MailSendHubClient 발송 가능 상태 (DIP B5 F7)', () => {
  it('SMTP 가 없는 배포면 보내기 전에 메일이 실제로 발송되지 않는다고 알린다', async () => {
    mocks.getDeliveryStatus.mockResolvedValue({ deliveryConfigured: false, senderImplementation: 'LoggingEmailSender' });
    renderCompose();

    expect(await screen.findByText('이 배포에는 메일 발송 설정(SMTP)이 없어 지금은 메일이 실제로 발송되지 않습니다.')).toBeInTheDocument();
  });

  it('SMTP 가 연결돼 있으면 고지를 띄우지 않는다', async () => {
    renderCompose();

    await waitFor(() => expect(mocks.getDeliveryStatus).toHaveBeenCalled());
    await waitFor(() => expect(screen.queryByText(/메일 발송 설정/)).not.toBeInTheDocument());
  });

  it('상태를 확인하지 못하면 안심시키지 않고 확인하지 못했다고 말한다', async () => {
    mocks.getDeliveryStatus.mockRejectedValue(new Error('network'));
    renderCompose();

    expect(await screen.findByText('메일 발송 설정을 확인하지 못했습니다.')).toBeInTheDocument();
  });

  it('1초마다 화면 전체를 다시 그리던 현재 시각 장식을 두지 않는다', () => {
    renderCompose();

    expect(screen.queryByText('현재 시각')).not.toBeInTheDocument();
  });
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

/**
 * [2026-10-11 슬롯 단계 PR-4] 주소록 출처는 주소록 기능의 슬롯 기여(recipient-picker-sources)에서 온다. 화면은 core 도우미
 * useRecipientAddressBook 으로 받아 피커에 넘기고, 입력 안내도 같은 값으로 '주소록' 을 덧붙인다. 주소록이 빠진 구성에서는 투영이
 * 기여 파일을 지우고 레지스트리를 빈 배열로 다시 만든다 — 피커는 사용자·부서 검색만, 안내는 '사용자' 만 말한다. 아래 두 시험은
 * 두 구성 모두에서 등록되고, 기대값을 투영 원장(기여 파일이 빠졌는가)으로 가른다.
 * 권한 축(PR-5): 주소록 조회 권한(ADBK_READ)이 없으면 기여가 있어도 출처와 '·주소록' 이 없다.
 */
const ADDRESS_BOOK_CONTRIBUTION = 'frontend/src/extensions/addressbook/recipient-picker-sources.ts';
const addressBookInProjection = inProjection(ADDRESS_BOOK_CONTRIBUTION);

describe('MailSendHubClient 재사용 base 조합 지점', () => {
  it('입력 안내는 수신자 찾기가 실제로 주는 출처만 말한다', () => {
    renderCompose();
    const placeholder = screen.getByRole('textbox', { name: '수신자 선택' }).getAttribute('placeholder') ?? '';

    // 기대값은 정확한 문자열이다 — 주소록이 빠진 구성에서도 '주소록' 이 없다는 사실을 그대로 단언한다.
    const expectedSources = addressBookInProjection ? '사용자·주소록' : '사용자';
    expect(placeholder).toBe(`이메일 주소를 직접 입력하거나 ‘수신자 찾기’로 ${expectedSources}에서 고르세요`);
  });

  it('메일 수신자 피커에는 주소록 기여가 있을 때만 그 출처를 넘긴다', async () => {
    const user = userEvent.setup();
    const offered = renderHook(() => useRecipientAddressBook('mail')).result.current;
    expect(offered === undefined).toBe(!addressBookInProjection);
    mocks.pickerProps.addressBook = 'not-rendered';
    renderCompose();

    await user.click(screen.getByRole('button', { name: '수신자 찾기' }));
    await screen.findByRole('button', { name: '피커 선택 확정' });

    expect(mocks.pickerProps.addressBook).toBe(offered?.source);
  });

  it('주소록 조회 권한(ADBK_READ)이 없으면 피커에 주소록 출처를 넘기지 않고 안내도 사용자만 말한다', async () => {
    auth.permissions = ['MAIL_SEND']; // 발송은 되지만 주소록 조회 권한이 없는 사용자 정의 그룹
    const user = userEvent.setup();
    mocks.pickerProps.addressBook = 'not-rendered';
    renderCompose();

    const placeholder = screen.getByRole('textbox', { name: '수신자 선택' }).getAttribute('placeholder');
    expect(placeholder).toBe('이메일 주소를 직접 입력하거나 ‘수신자 찾기’로 사용자에서 고르세요');
    await user.click(screen.getByRole('button', { name: '수신자 찾기' }));
    await screen.findByRole('button', { name: '피커 선택 확정' });
    expect(mocks.pickerProps.addressBook).toBeUndefined();
  });
});

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
    renderCompose();

    const recipient = screen.getByRole('textbox', { name: '수신자 선택' });
    await user.type(recipient, 'kim01');
    await user.click(screen.getByRole('button', { name: /추가/ }));

    expect(await screen.findAllByText(/이메일 주소 형식이 아닙니다.*수신자 찾기/)).not.toHaveLength(0);
    expect(screen.queryByText('1명 선택됨')).toBeNull();
  });

  it('직접 입력한 주소는 recipients[].emlAddr 로 싣고, 종전 recptnPerson 은 보내지 않는다', async () => {
    const user = userEvent.setup();
    renderCompose();
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
    renderCompose();
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
    renderCompose();
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
    renderCompose();
    const fields = await enterValidMail(user);
    fireEvent.change(fields.subject, { target: { value: '가'.repeat(257) } });

    await user.click(screen.getByRole('button', { name: /메일 발송/ }));

    expect(mocks.sendMail).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/최대 256자/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.subject).toHaveFocus());
  });

  it('수신자가 없으면 summary와 inline 오류를 보이고 수신자 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    renderCompose();
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
    renderCompose();
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
    renderCompose();
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
    renderCompose();
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
    const invalidate = vi.spyOn(lastClient!, 'invalidateQueries');
    resolveSend(1);
    await waitFor(() => expect(mocks.push).toHaveBeenCalledWith('/admin/collaboration/mail-history'));
    // 이력 화면이 캐시된 목록(방금 보낸 메일이 없는)을 보이지 않게 먼저 비운다.
    expect(invalidate).toHaveBeenCalledWith({ queryKey: ['mail-history'] });
  });
});
