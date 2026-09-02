import * as React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import NotePage from '../page';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  getReceivedNotes: vi.fn(),
  getSentNotes: vi.fn(),
  getNote: vi.fn(),
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
  StandardDataTable: ({ columns, data, loading, error, onRetry, onRowClick, rowActionLabel, emptyMessage }: any) => {
    if (loading) return <div role="status">쪽지 목록을 불러오는 중입니다.</div>;
    if (error) return (
      <div role="alert">
        쪽지 목록을 불러오지 못했습니다.
        <button type="button" onClick={onRetry}>목록 다시 시도</button>
      </div>
    );
    if (data.length === 0) return <div>{emptyMessage}</div>;

    return (
      <div>
        {data.map((item: any, rowIndex: number) => (
          <div key={item.noteRcptnSn ?? item.noteSndngSn ?? rowIndex}>
            {columns.map((column: any, columnIndex: number) => (
              <React.Fragment key={columnIndex}>{column.accessor(item, rowIndex)}</React.Fragment>
            ))}
            {onRowClick && (
              <button type="button" onClick={() => onRowClick(item)}>
                {typeof rowActionLabel === 'function' ? rowActionLabel(item, rowIndex) : rowActionLabel}
              </button>
            )}
          </div>
        ))}
      </div>
    );
  },
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
    getNote: mocks.getNote,
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
    mocks.getNote.mockResolvedValue({
      noteSn: 1,
      noteRcptnSn: 11,
      noteSj: '기본 쪽지',
      noteCn: '기본 본문',
      dsptchUserId: 'sender',
      rcverId: 'receiver',
      openYn: 'Y',
      crtDt: '2026-08-26',
    });
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

  it('받은 쪽지 삭제 완료가 뒤늦게 와도 전환한 보낸함 조회를 덮어쓰지 않는다', async () => {
    mocks.getReceivedNotes.mockResolvedValueOnce({
      list: [{
        noteSn: 2,
        noteRcptnSn: 21,
        noteSj: '삭제할 받은 쪽지',
        noteCn: '본문',
        dsptchUserId: 'sender',
        rcverId: 'receiver',
        openYn: 'N',
        crtDt: '2026-09-02',
      }],
    });
    mocks.getSentNotes.mockResolvedValueOnce({
      list: [{
        noteSn: 3,
        noteSndngSn: 31,
        noteSj: '현재 보낸 쪽지',
        noteCn: '본문',
        dsptchUserId: 'sender',
        rcverId: 'receiver',
        crtDt: '2026-09-02',
      }],
    });
    let resolveDelete!: () => void;
    mocks.deleteNote.mockImplementationOnce(() => new Promise<void>((resolve) => {
      resolveDelete = resolve;
    }));
    render(<NotePage />);

    fireEvent.click(await screen.findByRole('button', { name: '삭제할 받은 쪽지 삭제' }));
    await waitFor(() => expect(mocks.deleteNote).toHaveBeenCalledWith(21, { type: 'received' }));
    fireEvent.click(screen.getByRole('tab', { name: '보낸 쪽지함' }));
    expect(await screen.findByText('현재 보낸 쪽지')).toBeInTheDocument();

    resolveDelete();

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제되었습니다.', 'success'));
    expect(screen.getByText('현재 보낸 쪽지')).toBeInTheDocument();
    expect(screen.queryByText('삭제할 받은 쪽지')).not.toBeInTheDocument();
    expect(mocks.getReceivedNotes).toHaveBeenCalledTimes(1);
    expect(mocks.getSentNotes).toHaveBeenCalledTimes(1);
  });

  it('받은 쪽지 행을 열면 관계 식별자로 상세를 조회하고 읽음 상태와 답장 수신자를 갱신한다', async () => {
    const listNote = {
      noteSn: 7,
      noteRcptnSn: 71,
      noteSj: '읽지 않은 쪽지',
      noteCn: '목록 본문',
      dsptchUserId: 'sender-7',
      rcverId: 'receiver',
      openYn: 'N',
      crtDt: '2026-09-02',
    };
    let resolveDetail!: (note: typeof listNote & { trnsmiterNm: string }) => void;
    mocks.getReceivedNotes.mockResolvedValueOnce({ list: [listNote] });
    mocks.getNote.mockImplementationOnce(() => new Promise((resolve) => { resolveDetail = resolve; }));
    render(<NotePage />);

    fireEvent.click(await screen.findByRole('button', { name: '읽지 않은 쪽지 쪽지 열기' }));

    expect(mocks.getNote).toHaveBeenCalledWith(7, { type: 'received', relationSn: 71 });
    const detail = screen.getByRole('region', { name: '쪽지 데이터 상세 정보' });
    expect(within(detail).getByRole('status')).toHaveTextContent('쪽지 상세 정보를 불러오는 중입니다.');

    resolveDetail({
      ...listNote,
      noteCn: '서버가 반환한 상세 본문',
      trnsmiterNm: '발신자 이름',
      openYn: 'Y',
    });

    expect(await within(detail).findByText('서버가 반환한 상세 본문')).toBeInTheDocument();
    expect(screen.getAllByText('읽음').length).toBeGreaterThan(0);
    expect(screen.queryByText('읽지 않음')).not.toBeInTheDocument();

    fireEvent.click(within(detail).getByRole('button', { name: '실시간 답장 전송' }));
    expect(screen.getByRole('textbox', { name: '수신 대상자' })).toHaveValue('발신자 이름 (sender-7)');
  });

  it('상세 조회가 실패하면 이전 행 본문을 상세처럼 보이지 않고 재시도할 수 있다', async () => {
    const listNote = {
      noteSn: 8,
      noteRcptnSn: 81,
      noteSj: '상세 실패 쪽지',
      noteCn: '목록에 있던 축약 본문',
      dsptchUserId: 'sender-8',
      rcverId: 'receiver',
      openYn: 'N',
      crtDt: '2026-09-02',
    };
    mocks.getReceivedNotes.mockResolvedValueOnce({ list: [listNote] });
    mocks.getNote
      .mockRejectedValueOnce(new Error('상세 서버 오류'))
      .mockResolvedValueOnce({ ...listNote, noteCn: '재시도로 받은 본문', openYn: 'Y' });
    render(<NotePage />);

    fireEvent.click(await screen.findByRole('button', { name: '상세 실패 쪽지 쪽지 열기' }));

    const detail = screen.getByRole('region', { name: '쪽지 데이터 상세 정보' });
    expect(await within(detail).findByRole('alert')).toHaveTextContent('쪽지 상세 정보를 불러오지 못했습니다.');
    expect(within(detail).queryByText('목록에 있던 축약 본문')).not.toBeInTheDocument();

    fireEvent.click(within(detail).getByRole('button', { name: '쪽지 상세 다시 시도' }));

    expect(await within(detail).findByText('재시도로 받은 본문')).toBeInTheDocument();
    expect(mocks.getNote).toHaveBeenCalledTimes(2);
  });

  it('첫 목록 조회 실패를 빈 받은 쪽지함으로 위장하지 않고 재시도한다', async () => {
    mocks.getReceivedNotes.mockRejectedValueOnce(new Error('목록 서버 오류'));
    render(<NotePage />);

    const error = await screen.findByRole('alert');
    expect(error).toHaveTextContent('쪽지 목록을 불러오지 못했습니다.');
    expect(screen.queryByText('받은 쪽지가 없습니다.')).not.toBeInTheDocument();

    fireEvent.click(within(error).getByRole('button', { name: '목록 다시 시도' }));

    await waitFor(() => expect(mocks.getReceivedNotes).toHaveBeenCalledTimes(2));
    expect(await screen.findByText('받은 쪽지가 없습니다.')).toBeInTheDocument();
  });

  it('탭 전환 조회 실패 시 이전 탭 행과 빈 상태를 모두 숨기고 오류를 표시한다', async () => {
    mocks.getReceivedNotes.mockResolvedValueOnce({
      list: [{
        noteSn: 9,
        noteRcptnSn: 91,
        noteSj: '받은 쪽지 잔상',
        noteCn: '본문',
        dsptchUserId: 'sender-9',
        rcverId: 'receiver',
        openYn: 'N',
        crtDt: '2026-09-02',
      }],
    });
    mocks.getSentNotes.mockRejectedValueOnce(new Error('보낸함 서버 오류'));
    render(<NotePage />);
    expect(await screen.findByText('받은 쪽지 잔상')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: '보낸 쪽지함' }));

    expect(await screen.findByRole('alert')).toHaveTextContent('쪽지 목록을 불러오지 못했습니다.');
    expect(screen.queryByText('받은 쪽지 잔상')).not.toBeInTheDocument();
    expect(screen.queryByText('보낸 쪽지가 없습니다.')).not.toBeInTheDocument();
  });
});
