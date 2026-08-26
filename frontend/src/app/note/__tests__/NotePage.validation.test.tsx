import * as React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotePage from '../page';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  getReceivedNotes: vi.fn(),
  getSentNotes: vi.fn(),
  sendNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockModal({ isOpen, title, footer, children }: any) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, children }: { actions: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{children}</main>
  ),
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: any) => (
    <div>
      {data.map((item: any, rowIndex: number) => (
        <div key={item.noteRcptnSn ?? item.noteSndngSn ?? rowIndex}>
          {columns.map((column: any, columnIndex: number) => (
            <React.Fragment key={columnIndex}>{column.accessor(item, rowIndex)}</React.Fragment>
          ))}
        </div>
      ))}
    </div>
  ),
}));

vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect }: any) => isOpen ? (
    <button type="button" onClick={() => onSelect({ esntlId: 'USER_1', userNm: '홍길동' })}>
      홍길동 선택
    </button>
  ) : null,
}));

vi.mock('@/services/business/user/NoteService', () => ({
  noteService: {
    getReceivedNotes: mocks.getReceivedNotes,
    getSentNotes: mocks.getSentNotes,
    sendNote: mocks.sendNote,
    deleteNote: mocks.deleteNote,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({
  useToast: () => ({ toast: mocks.toast }),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({
  useConfirm: () => mocks.confirm,
}));

describe('NotePage validation contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getReceivedNotes.mockResolvedValue({ list: [] });
    mocks.getSentNotes.mockResolvedValue({ list: [] });
    mocks.sendNote.mockResolvedValue(undefined);
    mocks.deleteNote.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  function openComposer() {
    render(<NotePage />);
    fireEvent.click(screen.getByRole('button', { name: '새 쪽지 쓰기' }));
  }

  function selectRecipient() {
    fireEvent.click(screen.getByRole('button', { name: /타겟 검색/ }));
    fireEvent.click(screen.getByRole('button', { name: '홍길동 선택' }));
  }

  it('필수 수신자가 없으면 write 없이 검색 버튼으로 이동해 수정 방법을 안내한다', async () => {
    openComposer();

    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }));

    expect(mocks.sendNote).not.toHaveBeenCalled();
    expect(await screen.findByText('수신자를 선택해 주세요.')).toBeInTheDocument();
    expect(screen.getByTestId('note-form-error-summary')).toHaveTextContent('입력 오류');
    const pickerButton = screen.getByRole('button', { name: /타겟 검색/ });
    expect(pickerButton).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(pickerButton).toHaveFocus());
  });

  it('제목 100자·본문 4000자 한계를 넘으면 입력을 보존하고 첫 오류 필드로 이동한다', async () => {
    openComposer();
    selectRecipient();
    const title = screen.getByRole('textbox', { name: '시스템 제목' });
    const body = screen.getByRole('textbox', { name: '데이터 바디 (내용)' });
    fireEvent.change(title, { target: { value: '제'.repeat(101) } });
    fireEvent.change(body, { target: { value: '본'.repeat(4001) } });

    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }));

    expect(mocks.sendNote).not.toHaveBeenCalled();
    expect(await screen.findByText('제목: 최대 100자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('내용: 최대 4000자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(title).toHaveValue('제'.repeat(101));
    expect(title).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(title).toHaveFocus());
  });

  it('서버 필드 오류를 해당 입력란에 연결하고 일반 오류 toast 없이 값을 유지한다', async () => {
    mocks.sendNote.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'noteSj', message: '사용할 수 없는 제목입니다.' }] } },
    });
    openComposer();
    selectRecipient();
    const title = screen.getByRole('textbox', { name: '시스템 제목' });
    fireEvent.change(title, { target: { value: '보존할 제목' } });

    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }));

    expect(await screen.findByText('사용할 수 없는 제목입니다.')).toBeInTheDocument();
    expect(title).toHaveValue('보존할 제목');
    await waitFor(() => expect(title).toHaveFocus());
    expect(mocks.toast).not.toHaveBeenCalledWith('전송 중 오류가 발생했습니다.', 'error');
  });

  it('전송 중 연속 클릭을 동기적으로 차단한다', async () => {
    let finishSend: (() => void) | undefined;
    mocks.sendNote.mockImplementationOnce(() => new Promise<void>((resolve) => { finishSend = resolve; }));
    openComposer();
    selectRecipient();
    fireEvent.change(screen.getByRole('textbox', { name: '시스템 제목' }), {
      target: { value: '정상 제목' },
    });
    const send = screen.getByRole('button', { name: '메시지 전송' });

    fireEvent.click(send);
    fireEvent.click(send);

    expect(mocks.sendNote).toHaveBeenCalledTimes(1);
    expect(send).toBeDisabled();
    expect(send).toHaveAttribute('aria-busy', 'true');
    expect(send).toHaveAccessibleName('메시지 전송 중…');
    finishSend?.();
    await waitFor(() => expect(screen.queryByRole('region', { name: '새 쪽지 기안' })).not.toBeInTheDocument());
  });

  it('쪽지 삭제는 같은 tick의 재요청을 막고 실패 후 행을 보존한다', async () => {
    mocks.getReceivedNotes.mockResolvedValue({
      list: [{
        noteSn: 1,
        noteRcptnSn: 11,
        noteSj: '보존할 쪽지',
        noteCn: '본문',
        dsptchUserId: 'sender',
        rcverId: 'receiver',
        openYn: 'N',
        crtDt: '2026-08-26',
      }],
    });
    let rejectDelete!: (reason?: unknown) => void;
    const pendingDelete = new Promise<void>((_, reject) => {
      rejectDelete = reject;
    });
    mocks.deleteNote.mockReturnValue(pendingDelete);
    render(<NotePage />);
    const remove = await screen.findByRole('button', { name: '보존할 쪽지 삭제' });

    act(() => {
      fireEvent.click(remove);
      fireEvent.click(remove);
    });

    await waitFor(() => expect(mocks.deleteNote).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(remove).toBeDisabled();
    expect(remove).toHaveAttribute('aria-busy', 'true');
    expect(remove).toHaveAccessibleName('보존할 쪽지 삭제 중');

    rejectDelete(new Error('삭제 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 중 오류가 발생했습니다.', 'error'));
    expect(screen.getByText('보존할 쪽지')).toBeInTheDocument();
    expect(remove).not.toBeDisabled();
  });
});
