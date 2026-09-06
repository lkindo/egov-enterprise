import type { ReactNode } from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { NotificationDispatchDialog } from '../NotificationDispatchDialog';

/**
 * 🔔 관리자 알림 발송 다이얼로그 계약 (DEC-OPS-042, 감사 D09-05 후속).
 *
 * 판정은 "어느 식별자로 어떤 sink 를 부르는가" 다 — 수신자는 피커가 준 esntlId 만 싣고, 수신자가 없으면 서버를
 * 부르지 않으며, 제출은 동기 잠금으로 한 번만 가고, 서버 필드 오류는 입력에 귀속되고 값은 보존된다.
 */
const mocks = vi.hoisted(() => ({
  dispatch: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function TestModal({
    children, footer, isOpen, onClose, title,
  }: { children: ReactNode; footer?: ReactNode; isOpen: boolean; onClose?: () => void; title: string }) {
    return isOpen ? (
      <section aria-label={title}>
        <button type="button" onClick={onClose}>모달 닫기 요청</button>
        {children}{footer}
      </section>
    ) : null;
  },
}));
vi.mock('@/app/components/ui/recipient-picker', async () => {
  const actual = await vi.importActual<typeof import('@/app/components/ui/recipient-picker')>('@/app/components/ui/recipient-picker');
  return {
    ...actual,
    RecipientPicker: ({ isOpen, onConfirm, onClose, channel }: {
      isOpen: boolean; channel: string; onClose: () => void;
      onConfirm: (recipients: Array<{ kind: 'user'; esntlId: string; name: string; deptNm?: string }>) => void;
    }) => isOpen ? (
      <div data-testid="picker" data-channel={channel}>
        <button type="button" onClick={() => { onConfirm([{ kind: 'user', esntlId: 'USER_1', name: '홍길동', deptNm: '기획부' }]); onClose(); }}>
          홍길동 선택
        </button>
        <button type="button" onClick={() => { onConfirm([{ kind: 'user', esntlId: 'USER_1', name: '홍길동' }, { kind: 'user', esntlId: 'USER_2', name: '김철수' }]); onClose(); }}>
          두 명 선택
        </button>
      </div>
    ) : null,
  };
});
vi.mock('@/services/foundation/system/NotificationAdminService', () => ({
  notificationAdminService: { dispatch: mocks.dispatch },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

function renderDialog(onClose = vi.fn()) {
  return { onClose, ...render(<NotificationDispatchDialog isOpen onClose={onClose} />) };
}

function fillMessage(title = '점검 안내', content = '9월 7일 02:00 시스템 점검') {
  fireEvent.change(screen.getByRole('textbox', { name: /^제목/ }), { target: { value: title } });
  fireEvent.change(screen.getByRole('textbox', { name: /^내용/ }), { target: { value: content } });
}

describe('NotificationDispatchDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.dispatch.mockResolvedValue(1);
  });

  it('수신자 없이 보내면 안내만 하고 서버를 부르지 않는다', async () => {
    renderDialog();
    fillMessage();
    fireEvent.click(screen.getByRole('button', { name: /알림 보내기/ }));

    // 폼 오류 요약도 role=alert 이라 문구로 특정한다 — 수신자 오류는 폼 밖 선택 상태의 안내다.
    expect(await screen.findByText('수신자를 한 명 이상 선택하세요.')).toHaveAttribute('role', 'alert');
    expect(mocks.dispatch).not.toHaveBeenCalled();
  });

  it('피커로 고른 사용자의 esntlId 만 싣고 제목·내용을 보내며, 성공하면 건수를 알리고 닫는다', async () => {
    const { onClose } = renderDialog();
    fireEvent.click(screen.getByRole('button', { name: '수신자 찾기' }));
    expect(screen.getByTestId('picker')).toHaveAttribute('data-channel', 'notification');
    fireEvent.click(screen.getByRole('button', { name: '홍길동 선택' }));
    expect(screen.getByRole('list', { name: '선택된 수신자' })).toHaveTextContent('홍길동');

    fillMessage();
    fireEvent.click(screen.getByRole('button', { name: /알림 보내기 \(1명\)/ }));

    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(1));
    expect(mocks.dispatch).toHaveBeenCalledWith({
      recipients: [{ esntlId: 'USER_1' }],
      notiTtlNm: '점검 안내',
      notiCn: '9월 7일 02:00 시스템 점검',
    });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('1명에게 알림을 보냈습니다.', 'success'));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it('같은 사람은 한 번만 세고 제외 버튼으로 뺄 수 있다', async () => {
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: '수신자 찾기' }));
    fireEvent.click(screen.getByRole('button', { name: '두 명 선택' }));
    fireEvent.click(screen.getByRole('button', { name: '수신자 찾기' }));
    fireEvent.click(screen.getByRole('button', { name: '홍길동 선택' }));

    expect(screen.getByRole('button', { name: /알림 보내기 \(2명\)/ })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '김철수 수신자 제외' }));
    expect(screen.getByRole('button', { name: /알림 보내기 \(1명\)/ })).toBeInTheDocument();
  });

  it('전송 중 연속 클릭은 한 번만 보내고 pending 을 표시한다', async () => {
    let resolveDispatch: (value: number) => void = () => {};
    mocks.dispatch.mockReturnValue(new Promise<number>((resolve) => { resolveDispatch = resolve; }));
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: '수신자 찾기' }));
    fireEvent.click(screen.getByRole('button', { name: '홍길동 선택' }));
    fillMessage();

    const send = screen.getByRole('button', { name: /알림 보내기 \(1명\)/ });
    fireEvent.click(send);
    fireEvent.click(send);
    await waitFor(() => expect(mocks.dispatch).toHaveBeenCalledTimes(1));
    expect(await screen.findByRole('button', { name: /보내는 중/ })).toHaveAttribute('aria-busy', 'true');

    await act(async () => { resolveDispatch(1); });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('1명에게 알림을 보냈습니다.', 'success'));
  });

  it('서버 필드 오류는 입력에 귀속되고 값이 보존되며, 일반 오류는 토스트로 드러난다', async () => {
    mocks.dispatch.mockRejectedValueOnce({
      response: { status: 400, data: { success: false, message: '입력 오류', errors: [{ field: 'notiTtlNm', message: '사용할 수 없는 제목입니다.' }] } },
    });
    renderDialog();
    fireEvent.click(screen.getByRole('button', { name: '수신자 찾기' }));
    fireEvent.click(screen.getByRole('button', { name: '홍길동 선택' }));
    fillMessage('금지어 제목');
    fireEvent.click(screen.getByRole('button', { name: /알림 보내기 \(1명\)/ }));

    expect(await screen.findByText('사용할 수 없는 제목입니다.')).toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: /^제목/ })).toHaveValue('금지어 제목');
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.anything(), 'error');

    mocks.dispatch.mockRejectedValueOnce(new Error('수신자로 지정한 사용자를 찾을 수 없습니다.'));
    fireEvent.click(screen.getByRole('button', { name: /알림 보내기 \(1명\)/ }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('수신자로 지정한 사용자를 찾을 수 없습니다.', 'error'));
    expect(screen.getByRole('list', { name: '선택된 수신자' })).toHaveTextContent('홍길동');
  });
});
