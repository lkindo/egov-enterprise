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
  getUnreadReceivedCount: vi.fn(),
  sendNote: vi.fn(),
  deleteNote: vi.fn(),
}));

vi.mock('next/dynamic', () => ({
  default: () => function MockModal({ isOpen, title, footer, children }: any) {
    return isOpen ? <section aria-label={title}>{children}{footer}</section> : null;
  },
}));

vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, filter, children }: { actions: React.ReactNode; filter?: React.ReactNode; children: React.ReactNode }) => (
    <main>{actions}{filter}{children}</main>
  ),
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, loading, error, onRetry, onRowClick, rowActionLabel, emptyMessage, pagination }: any) => {
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
        {pagination && pagination.totalPages > 1 && (
          <nav aria-label="쪽지 페이지">
            <span>{`${pagination.currentPage}/${pagination.totalPages} 페이지`}</span>
            <button type="button" onClick={() => pagination.onPageChange(pagination.currentPage + 1)}>다음 페이지</button>
            <button type="button" onClick={() => pagination.onPageSizeChange(50)}>페이지당 50건</button>
          </nav>
        )}
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

vi.mock('@/app/components/ui/recipient-picker', () => ({
  RecipientPicker: ({ isOpen, onConfirm }: any) => isOpen ? (
    <div>
      <button type="button" onClick={() => onConfirm([{ kind: 'user', esntlId: 'USER_1', name: '홍길동' }])}>
        홍길동 선택
      </button>
      <button type="button" onClick={() => onConfirm([
        { kind: 'user', esntlId: 'USER_LONG_ID_0000001', name: '홍길동' },
        { kind: 'user', esntlId: 'USER_LONG_ID_0000002', name: '이순신' },
      ])}>
        다중 수신자 선택
      </button>
    </div>
  ) : null,
}));

vi.mock('@/services/business/user/NoteService', () => ({
  noteService: {
    getReceivedNotes: mocks.getReceivedNotes,
    getSentNotes: mocks.getSentNotes,
    getNote: mocks.getNote,
    getUnreadReceivedCount: mocks.getUnreadReceivedCount,
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
    mocks.getUnreadReceivedCount.mockResolvedValue(0);
  });

  function openComposer() {
    render(<NotePage />);
    fireEvent.click(screen.getByRole('button', { name: '새 쪽지 쓰기' }));
  }

  function selectRecipient() {
    fireEvent.click(screen.getByRole('button', { name: /타겟 검색/ }));
    fireEvent.click(screen.getByRole('button', { name: '홍길동 선택' }));
  }

  // [2026-09-06 감사 D09-01 후속] 검색어는 서버 searchWrd 로 가고(제목·내용 부분일치), 빈 결과 문구는 검색어를 싣는다(G15).
  it('검색어를 적용하면 1페이지부터 searchWrd 로 조회하고 빈 결과 문구가 검색어를 싣는다', async () => {
    render(<NotePage />);
    await waitFor(() => expect(mocks.getReceivedNotes).toHaveBeenCalledWith({ page: 0, size: 20 }));

    fireEvent.change(screen.getByRole('textbox', { name: '제목·내용' }), { target: { value: ' 회의 ' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => expect(mocks.getReceivedNotes).toHaveBeenLastCalledWith({ page: 0, size: 20, searchWrd: '회의' }));
    expect(await screen.findByText('"회의"에 대한 검색 결과가 없습니다.')).toBeInTheDocument();
    expect(mocks.getSentNotes).not.toHaveBeenCalled();
  });

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

  it('제목 256자·본문 4000자 한계를 넘으면 입력을 보존하고 첫 오류 필드로 이동한다', async () => {
    openComposer();
    selectRecipient();
    const title = screen.getByRole('textbox', { name: '시스템 제목' });
    const body = screen.getByRole('textbox', { name: '데이터 바디 (내용)' });
    fireEvent.change(title, { target: { value: '제'.repeat(257) } });
    fireEvent.change(body, { target: { value: '본'.repeat(4001) } });

    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }));

    expect(mocks.sendNote).not.toHaveBeenCalled();
    expect(await screen.findByText('제목: 최대 256자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('내용: 최대 4000자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(title).toHaveValue('제'.repeat(257));
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

    fireEvent.click(within(detail).getByRole('button', { name: '답장' }));
    expect(screen.getByRole('textbox', { name: '수신 대상자' })).toHaveValue('발신자 이름 (sender-7)');
    // [2026-09-26 DIP V3] 원 발신자가 수신자 칩으로 들어간다 — 제출 값에만 있으면 칩이 비어 보였다.
    expect(screen.getByText('총 1명 선택됨')).toBeInTheDocument();
  });

  it('🚨 받은 쪽지 목록은 발신자 이름을 보이고, 이름을 모르면 내부 식별자 대신 그 사실을 말한다 (DIP V3)', async () => {
    mocks.getReceivedNotes.mockResolvedValueOnce({ list: [
      { noteSn: 1, noteRcptnSn: 11, noteSj: '이름 있는 쪽지', dsptchUserId: 'ESNTL_A', trnsmiterNm: '김발신', openYn: 'N', crtDt: '2026-09-26' },
      { noteSn: 2, noteRcptnSn: 12, noteSj: '이름 없는 쪽지', dsptchUserId: 'ESNTL_B', openYn: 'Y', crtDt: '2026-09-26' },
    ] });
    render(<NotePage />);

    expect(await screen.findByText('김발신')).toBeInTheDocument();
    expect(screen.getByText('알 수 없는 사용자')).toBeInTheDocument();
    expect(screen.queryByText('ESNTL_B')).not.toBeInTheDocument();
  });

  it('받은 쪽지함은 읽지 않은 쪽지 수를 알린다 (DIP V3)', async () => {
    mocks.getUnreadReceivedCount.mockResolvedValue(3);
    render(<NotePage />);

    expect(await screen.findByText('읽지 않음 3건')).toBeInTheDocument();
  });

  it('보낸 쪽지 상세는 수신자별 읽음을 보여 준다 (DIP V3)', async () => {
    const sent = {
      noteSn: 9, noteSndngSn: 91, noteSj: '보낸 쪽지', crtDt: '2026-09-26',
      recipients: [
        { noteRcptnSn: 1, rcverId: 'R1', rcverNm: '김수신', recptnSe: '1', openYn: 'Y' },
        { noteRcptnSn: 2, rcverId: 'R2', rcverNm: '이수신', recptnSe: '1', openYn: 'N' },
      ],
    };
    mocks.getSentNotes.mockResolvedValue({ list: [sent] });
    mocks.getNote.mockResolvedValueOnce({ ...sent, noteCn: '본문' });
    render(<NotePage />);

    fireEvent.click(await screen.findByRole('tab', { name: /보낸 쪽지함/ }));
    expect(await screen.findByText('김수신 외 1명')).toBeInTheDocument();
    fireEvent.click(await screen.findByRole('button', { name: '보낸 쪽지 쪽지 열기' }));

    const readState = await screen.findByRole('region', { name: '수신자별 읽음' });
    expect(within(readState).getByText('김수신').parentElement).toHaveTextContent('읽음');
    expect(within(readState).getByText('이수신').parentElement).toHaveTextContent('읽지 않음');
  });

  it('[DIP B5 F4] 받은 쪽지를 전달하면 받는 사람을 비우고 원문을 보낸 사람과 함께 인용한다', async () => {
    const received = {
      noteSn: 5, noteRcptnSn: 51, noteSj: '회의 자료', noteCn: '원문 본문', dsptchUserId: 'sender-5',
      trnsmiterNm: '김발신', openYn: 'Y', crtDt: '2026-09-25',
    };
    mocks.getReceivedNotes.mockResolvedValueOnce({ list: [received] });
    mocks.getNote.mockResolvedValueOnce(received);
    render(<NotePage />);

    fireEvent.click(await screen.findByRole('button', { name: '회의 자료 쪽지 열기' }));
    const detail = screen.getByRole('region', { name: '쪽지 데이터 상세 정보' });
    fireEvent.click(await within(detail).findByRole('button', { name: '전달' }));

    expect(screen.getByRole('textbox', { name: '시스템 제목' })).toHaveValue('Fwd: 회의 자료');
    const body = (screen.getByRole('textbox', { name: '데이터 바디 (내용)' }) as HTMLTextAreaElement).value;
    expect(body).toContain('보낸 사람: 김발신');
    expect(body).toContain('날짜: 2026-09-25');
    expect(body).toContain('제목: 회의 자료');
    expect(body.endsWith('원문 본문')).toBe(true);
    // 전달은 받는 사람을 새로 고른다 — 원 발신자를 몰래 넣지 않는다.
    expect(screen.queryByText('총 1명 선택됨')).not.toBeInTheDocument();
    expect(screen.getByRole('textbox', { name: '수신 대상자' })).toHaveValue('');
  });

  it('[DIP B5 F4] 보낸 쪽지도 전달할 수 있고 받은 사람들을 인용하며 Fwd 를 겹쳐 붙이지 않는다', async () => {
    const sent = {
      noteSn: 9, noteSndngSn: 91, noteSj: 'Fwd: 공지', noteCn: '보낸 본문', crtDt: '2026-09-26',
      recipients: [
        { noteRcptnSn: 1, rcverId: 'R1', rcverNm: '김수신', recptnSe: '1', openYn: 'Y' },
        { noteRcptnSn: 2, rcverId: 'R2', recptnSe: '1', openYn: 'N' },
      ],
    };
    mocks.getSentNotes.mockResolvedValue({ list: [sent] });
    mocks.getNote.mockResolvedValueOnce(sent);
    render(<NotePage />);

    fireEvent.click(await screen.findByRole('tab', { name: /보낸 쪽지함/ }));
    fireEvent.click(await screen.findByRole('button', { name: 'Fwd: 공지 쪽지 열기' }));
    const detail = screen.getByRole('region', { name: '쪽지 데이터 상세 정보' });
    fireEvent.click(await within(detail).findByRole('button', { name: '전달' }));

    expect(screen.getByRole('textbox', { name: '시스템 제목' })).toHaveValue('Fwd: 공지');
    const body = (screen.getByRole('textbox', { name: '데이터 바디 (내용)' }) as HTMLTextAreaElement).value;
    expect(body).toContain('받는 사람: 김수신, 알 수 없는 사용자');
    expect(body).not.toContain('R2');
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

  /**
   * [2026-09-05] 종전에는 `{ page: 0, size: 100 }` 한 번만 조회하고 페이저가 없어 101번째 쪽지부터
   * 도달 불가였다. 서버 페이지 계약(page 0-base·size)과 탭 전환 시 1페이지 복귀를 고정한다.
   */
  it('받은 쪽지가 한 페이지를 넘으면 서버 페이지로 넘기고 탭을 바꾸면 1페이지로 돌아간다', async () => {
    const noteAt = (sn: number, subject: string) => ({
      noteSn: sn,
      noteRcptnSn: sn * 10,
      noteSj: subject,
      noteCn: '본문',
      dsptchUserId: 'sender',
      rcverId: 'receiver',
      openYn: 'N',
      crtDt: '2026-09-05',
    });
    mocks.getReceivedNotes.mockImplementation(async ({ page }: { page: number }) => (
      page === 0
        ? { list: [noteAt(1, '첫 페이지 쪽지')], total: 45 }
        : { list: [noteAt(2, '둘째 페이지 쪽지')], total: 45 }
    ));
    render(<NotePage />);

    expect(await screen.findByText('첫 페이지 쪽지')).toBeInTheDocument();
    expect(mocks.getReceivedNotes).toHaveBeenCalledWith({ page: 0, size: 20 });
    expect(screen.getByText('1/3 페이지')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '다음 페이지' }));

    expect(await screen.findByText('둘째 페이지 쪽지')).toBeInTheDocument();
    expect(mocks.getReceivedNotes).toHaveBeenCalledWith({ page: 1, size: 20 });
    expect(screen.queryByText('첫 페이지 쪽지')).not.toBeInTheDocument();
    expect(screen.getByText('2/3 페이지')).toBeInTheDocument();

    // 페이지당 건수를 바꾸면 1페이지부터 다시 조회한다.
    fireEvent.click(screen.getByRole('button', { name: '페이지당 50건' }));
    await waitFor(() => expect(mocks.getReceivedNotes).toHaveBeenCalledWith({ page: 0, size: 50 }));

    // 탭을 바꾸면 이전 탭의 페이지 위치를 끌고 가지 않는다.
    fireEvent.click(screen.getByRole('tab', { name: '보낸 쪽지함' }));
    await waitFor(() => expect(mocks.getSentNotes).toHaveBeenCalledWith({ page: 0, size: 50 }));
  });

  it('다중 수신자(총 길이 20자 초과)를 선택해도 유효성 검증을 통과하고 쉼표 구분자로 발송한다', async () => {
    openComposer();
    fireEvent.click(screen.getByRole('button', { name: /타겟 검색/ }));
    fireEvent.click(screen.getByRole('button', { name: '다중 수신자 선택' }));

    expect(screen.getByText('총 2명 선택됨')).toBeInTheDocument();

    fireEvent.change(screen.getByRole('textbox', { name: '시스템 제목' }), { target: { value: '다중 발송 제목' } });
    fireEvent.change(screen.getByRole('textbox', { name: '데이터 바디 (내용)' }), { target: { value: '다중 발송 본문' } });

    fireEvent.click(screen.getByRole('button', { name: '메시지 전송' }));

    await waitFor(() => {
      expect(mocks.sendNote).toHaveBeenCalledWith({
        rcverId: 'USER_LONG_ID_0000001,USER_LONG_ID_0000002',
        noteSj: '다중 발송 제목',
        noteCn: '다중 발송 본문',
      });
    });
    expect(mocks.toast).toHaveBeenCalledWith('쪽지가 성공적으로 전송되었습니다.', 'success');
  });
});
