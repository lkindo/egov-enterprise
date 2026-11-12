import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import EventParticipationClient from '../EventParticipationClient';

/**
 * [V2_152] 행사 참가 화면 계약. 자리 수·마감·내 신청 상태는 서버가 판정한 값을 그대로 보인다. 신청은 확인 없이, 취소는 확인 뒤
 * 보낸다. 마감됐거나 정원이 찬 행사는 신청 버튼이 잠기고, 반려된 신청은 다시 신청하는 버튼 대신 안내를 보인다. 정원이 그 사이 찬
 * 경우의 서버 거부(409)는 서버 문구로 보인다.
 */
const mocks = vi.hoisted(() => ({
  getOpenEvents: vi.fn(),
  apply: vi.fn(),
  cancel: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/services/foundation/operation/eventParticipationService', async () => {
  const actual = await vi.importActual<typeof import('@/services/foundation/operation/eventParticipationService')>(
    '@/services/foundation/operation/eventParticipationService');
  return {
    ...actual,
    eventParticipationService: { getOpenEvents: mocks.getOpenEvents, apply: mocks.apply, cancel: mocks.cancel },
  };
});
vi.mock('@/app/components/layout/page-header', () => ({ PageHeader: ({ title }: { title: string }) => <h1>{title}</h1> }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const open = { evntSn: 1, evntNm: '가을 워크숍', evntBgngYmd: '20261201', evntEndYmd: '20261202', pscpNope: 2, seatsTaken: 1,
  aplyDdlnYmd: '20261130', myStatus: null, acceptingApplications: true };
const mine = { ...open, evntSn: 2, evntNm: '송년회', pscpNope: null, seatsTaken: 3, myStatus: 'APPLIED' };
const full = { ...open, evntSn: 3, evntNm: '마감 행사', seatsTaken: 2, acceptingApplications: false };
const rejected = { ...open, evntSn: 4, evntNm: '반려 행사', myStatus: 'REJECTED' };

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><EventParticipationClient /></QueryClientProvider>);
}

describe('EventParticipationClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getOpenEvents.mockResolvedValue({ list: [open, mine, full, rejected], total: 4 });
    mocks.apply.mockResolvedValue({});
    mocks.cancel.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('자리·마감·내 신청 상태를 서버 값대로 보이고 신청은 확인 없이 보낸다', async () => {
    const user = userEvent.setup();
    renderClient();
    const card = await screen.findByRole('listitem', { name: '가을 워크숍' });
    expect(within(card).getByText('1/2명')).toBeInTheDocument();
    expect(within(card).getByText('2026.11.30')).toBeInTheDocument();
    expect(within(card).getByText('신청 안 함')).toBeInTheDocument();

    await user.click(within(card).getByRole('button', { name: '가을 워크숍 참가 신청' }));
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith(1));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('‘가을 워크숍’ 참가를 신청했습니다.', 'success');
  });

  it('내 신청은 확인 뒤 취소하고, 정원 없는 행사는 정원 없음으로 보인다', async () => {
    const user = userEvent.setup();
    renderClient();
    const card = await screen.findByRole('listitem', { name: '송년회' });
    expect(within(card).getByText('3명 신청 · 정원 없음')).toBeInTheDocument();
    expect(within(card).getByText('승인 대기')).toBeInTheDocument();

    mocks.confirm.mockResolvedValueOnce(false);
    await user.click(within(card).getByRole('button', { name: '송년회 신청 취소' }));
    expect(mocks.cancel).not.toHaveBeenCalled();
    await user.click(within(card).getByRole('button', { name: '송년회 신청 취소' }));
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledWith(2));
  });

  it('마감·정원 초과 행사는 신청 버튼이 잠기고, 반려된 신청은 다시 신청할 수 없다고 안내한다', async () => {
    renderClient();
    const fullCard = await screen.findByRole('listitem', { name: '마감 행사' });
    expect(within(fullCard).getByRole('button', { name: '마감 행사 신청 마감' })).toBeDisabled();
    const rejectedCard = screen.getByRole('listitem', { name: '반려 행사' });
    expect(within(rejectedCard).queryByRole('button')).not.toBeInTheDocument();
    expect(within(rejectedCard).getByText(/반려된 신청입니다/)).toBeInTheDocument();
  });

  it('행사가 한 쪽(20건)을 넘으면 다음 쪽으로 넘겨 뒤 행사에도 신청할 수 있다', async () => {
    const user = userEvent.setup();
    mocks.getOpenEvents.mockImplementation(({ page }: { page: number }) => Promise.resolve(page === 2
      ? { list: [{ ...open, evntSn: 51, evntNm: '스물한째 행사' }], total: 21 }
      : { list: [open], total: 21 }));
    renderClient();
    await screen.findByRole('listitem', { name: '가을 워크숍' });
    expect(mocks.getOpenEvents).toHaveBeenLastCalledWith({ page: 1, size: 20 });

    await user.click(screen.getByRole('link', { name: '2' }));
    const card = await screen.findByRole('listitem', { name: '스물한째 행사' });
    expect(mocks.getOpenEvents).toHaveBeenLastCalledWith({ page: 2, size: 20 });
    await user.click(within(card).getByRole('button', { name: '스물한째 행사 참가 신청' }));
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledWith(51));
  });

  it('정원이 그 사이 찬 거부(409)는 서버 문구로 보인다', async () => {
    const user = userEvent.setup();
    mocks.apply.mockRejectedValueOnce(new Error('정원이 찼습니다.'));
    renderClient();
    const card = await screen.findByRole('listitem', { name: '가을 워크숍' });
    await user.click(within(card).getByRole('button', { name: '가을 워크숍 참가 신청' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('정원이 찼습니다.', 'error'));
  });

  it('가을 워크숍 참가 신청 은 처리 중 잠기고(aria-busy) 두 번 눌러도 한 번만 보내며 실패를 알린다', async () => {
    let rejectCall!: (reason?: unknown) => void;
    mocks.apply.mockReturnValueOnce(new Promise((_, reject) => { rejectCall = reject; }));
    renderClient();
    const card = await screen.findByRole('listitem', { name: '가을 워크숍' });
    const control = within(card).getByRole('button', { name: '가을 워크숍 참가 신청' });
    act(() => {
      fireEvent.click(control);
      fireEvent.click(control);
    });
    await waitFor(() => expect(mocks.apply).toHaveBeenCalledTimes(1));
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    rejectCall(new Error('처리하지 못했습니다'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('처리하지 못했습니다', 'error'));
  });

  it('송년회 신청 취소 은 처리 중 잠기고(aria-busy) 두 번 눌러도 한 번만 보내며 실패를 알린다', async () => {
    let rejectCall!: (reason?: unknown) => void;
    mocks.cancel.mockReturnValueOnce(new Promise((_, reject) => { rejectCall = reject; }));
    renderClient();
    const card = await screen.findByRole('listitem', { name: '송년회' });
    const control = within(card).getByRole('button', { name: '송년회 신청 취소' });
    act(() => {
      fireEvent.click(control);
      fireEvent.click(control);
    });
    await waitFor(() => expect(mocks.cancel).toHaveBeenCalledTimes(1));
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    rejectCall(new Error('처리하지 못했습니다'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('처리하지 못했습니다', 'error'));
  });

});
