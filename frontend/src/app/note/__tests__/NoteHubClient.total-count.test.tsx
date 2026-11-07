import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * 쪽지함이 셸 툴바에 넘기는 총 건수와, 같은 값을 보이는 쪽지함 탭의 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계 상태를 0 으로 시작해 아무 가림 없이 넘겨, 첫 응답 전·쪽지함을 바꾼 직후에는 "총 0건" 을,
 * 다시 읽다 실패하면 이전 보기의 총계를 보였다. 이 화면은 다시 읽는 동안 표를 비우므로, 이 보기의 목록 응답을 받기 전과 실패했을
 * 때는 총 건수를 내지 않는다.
 */
const mocks = vi.hoisted(() => ({
  getReceivedNotes: vi.fn(),
  getSentNotes: vi.fn(),
  getUnreadReceivedCount: vi.fn(),
  // 목록 조회 콜백이 toast 에 의존한다 — 렌더마다 새 함수를 주면 조회가 끝없이 다시 돈다.
  toast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/services/business/user/NoteService', () => ({
  noteService: {
    getReceivedNotes: mocks.getReceivedNotes,
    getSentNotes: mocks.getSentNotes,
    getUnreadReceivedCount: mocks.getUnreadReceivedCount,
  },
}));
vi.mock('next/dynamic', () => ({ default: () => function MockModal() { return null; } }));
vi.mock('@/app/components/ui/recipient-picker', () => ({ RecipientPicker: () => null }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수와 탭(actions)·조회 조건만 그린다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, actions, filter, children }: React.PropsWithChildren<{
    totalCount?: number; actions?: React.ReactNode; filter?: React.ReactNode;
  }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {actions}
      {filter}
      {children}
    </main>
  ),
}));
// 실패 상태에 닿은 뒤에 총 건수를 보도록 표는 오류 여부만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: unknown }) => <div data-testid="table-state">{error ? '오류' : ''}</div>,
}));

const { default: NoteHubClient } = await import('../NoteHubClient');

const totalText = () => screen.getByTestId('shell-total-count');
// 탭 이름 뒤에 붙는 건수 배지의 글자(없으면 빈 문자열). 아이콘 모의가 앞에 이름을 그리므로 탭 이름 뒤만 본다.
const tabCount = (name: '받은 쪽지함' | '보낸 쪽지함') =>
  (screen.getByRole('tab', { name: new RegExp(name) }).textContent ?? '').split(name)[1];

describe('쪽지함 — 셸 툴바와 탭의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getUnreadReceivedCount.mockResolvedValue(0);
  });

  it('목록 응답을 받기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getReceivedNotes.mockReturnValue(new Promise(() => undefined));
    render(<NoteHubClient />);

    await waitFor(() => expect(mocks.getReceivedNotes).toHaveBeenCalled());
    expect(totalText()).toHaveTextContent('없음');
    expect(tabCount('받은 쪽지함')).toBe('');
  });

  it('목록 응답을 받으면 서버가 센 총 건수를 툴바와 탭에 낸다', async () => {
    mocks.getReceivedNotes.mockResolvedValue({ list: [], total: 7 });
    render(<NoteHubClient />);

    await waitFor(() => expect(totalText()).toHaveTextContent('7'));
    expect(tabCount('받은 쪽지함')).toBe('7');
  });

  it('목록 조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getReceivedNotes.mockRejectedValue(new Error('쪽지 조회 실패'));
    render(<NoteHubClient />);

    await waitFor(() => expect(screen.getByTestId('table-state')).toHaveTextContent('오류'));
    expect(totalText()).toHaveTextContent('없음');
    expect(tabCount('받은 쪽지함')).toBe('');
  });

  it('다시 읽다 실패하면 이전에 받은 총 건수를 남기지 않는다', async () => {
    mocks.getReceivedNotes.mockResolvedValueOnce({ list: [], total: 7 });
    render(<NoteHubClient />);
    await waitFor(() => expect(totalText()).toHaveTextContent('7'));

    mocks.getReceivedNotes.mockRejectedValueOnce(new Error('쪽지 조회 실패'));
    fireEvent.click(screen.getByRole('button', { name: '조회' }));

    await waitFor(() => expect(screen.getByTestId('table-state')).toHaveTextContent('오류'));
    expect(totalText()).toHaveTextContent('없음');
    expect(tabCount('받은 쪽지함')).toBe('');
  });

  it('다른 쪽지함으로 바꾸면 그 쪽지함의 응답을 받기 전에는 총 건수를 내지 않고, 받으면 그 수를 낸다', async () => {
    mocks.getReceivedNotes.mockResolvedValue({ list: [], total: 7 });
    let resolveSent!: (value: { list: never[]; total: number }) => void;
    mocks.getSentNotes.mockReturnValue(new Promise((resolve) => { resolveSent = resolve; }));
    render(<NoteHubClient />);
    await waitFor(() => expect(totalText()).toHaveTextContent('7'));

    fireEvent.click(screen.getByRole('tab', { name: /보낸 쪽지함/ }));
    await waitFor(() => expect(mocks.getSentNotes).toHaveBeenCalled());
    expect(totalText()).toHaveTextContent('없음');
    expect(tabCount('보낸 쪽지함')).toBe('');

    resolveSent({ list: [], total: 3 });
    await waitFor(() => expect(totalText()).toHaveTextContent('3'));
    expect(tabCount('보낸 쪽지함')).toBe('3');
  });
});
