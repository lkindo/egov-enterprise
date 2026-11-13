import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityOperatorPanel } from '../CommunityOperatorPanel';

/**
 * 커뮤니티 운영자 패널 계약(GAP-CMTY-001, DEC-OPS-416).
 *
 * 가입 신청은 승인·반려, 일반 회원은 운영자 지정·탈퇴 처리, 운영자는 해제만 갖는다(운영자는 먼저 해제해야 탈퇴시킬 수 있다).
 * 반려·탈퇴·해제는 확인을 거치고, 서버 거부(마지막 운영자 409 등)는 서버 문구 그대로 토스트로 보인다. 소개 저장은 읽은 버전을
 * 함께 보내고 이름이 비면 서버에 보내지 않는다.
 */
const mocks = vi.hoisted(() => ({
  getMembers: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  withdraw: vi.fn(),
  designate: vi.fn(),
  updateProfile: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/services/business/community/communityOperatorService', () => ({
  communityOperatorService: {
    getMembers: mocks.getMembers,
    approve: mocks.approve,
    reject: mocks.reject,
    withdraw: mocks.withdraw,
    designate: mocks.designate,
    updateProfile: mocks.updateProfile,
  },
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const requested = { userId: 'esntl-1', userNm: '홍신청', status: 'REQUESTED', mbrSttsCd: 'A', mngrYn: 'N' };
const member = { userId: 'esntl-2', userNm: '김회원', status: 'APPROVED', mbrSttsCd: 'P', mngrYn: 'N' };
const operator = { userId: 'esntl-3', userNm: '박운영', status: 'APPROVED', mbrSttsCd: 'P', mngrYn: 'Y' };

const page = (list: unknown[]) => ({ list, total: list.length });

function renderPanel(community = { cmntyNm: '독서 모임', cmntyIntroCn: '책을 읽는다', version: 4 }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CommunityOperatorPanel cmntySn={11} community={community} />
    </QueryClientProvider>,
  );
  return client;
}

describe('CommunityOperatorPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMembers.mockImplementation((_sn: number, params: { status?: string }) => {
      if (params.status === 'A') return Promise.resolve(page([requested]));
      if (params.status === 'P') return Promise.resolve(page([member, operator]));
      return Promise.resolve(page([requested, member, operator]));
    });
    for (const fn of [mocks.approve, mocks.reject, mocks.withdraw, mocks.designate, mocks.updateProfile]) fn.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('가입 신청만 승인·반려를 갖고, 승인은 확인 없이 그 커뮤니티로 한 번 보낸다', async () => {
    const user = userEvent.setup();
    renderPanel();
    const list = await screen.findByRole('list', { name: '운영 회원 목록' });
    expect(within(list).queryByRole('button', { name: /운영자 지정/ })).not.toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: '홍신청 가입 승인' }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith(11, 'esntl-1'));
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.toast).toHaveBeenCalledWith('홍신청 님의 가입을 승인했습니다.', 'success');
  });

  it('반려는 확인을 거치고, 취소하면 보내지 않는다', async () => {
    const user = userEvent.setup();
    mocks.confirm.mockResolvedValueOnce(false);
    renderPanel();
    const list = await screen.findByRole('list', { name: '운영 회원 목록' });
    await user.click(within(list).getByRole('button', { name: '홍신청 가입 반려' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.reject).not.toHaveBeenCalled();

    await user.click(within(list).getByRole('button', { name: '홍신청 가입 반려' }));
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith(11, 'esntl-1'));
  });

  it('일반 회원은 운영자 지정·탈퇴 처리를, 운영자는 해제만 갖는다 — 운영자에게 탈퇴 처리 버튼이 없다', async () => {
    const user = userEvent.setup();
    renderPanel();
    await screen.findByRole('list', { name: '운영 회원 목록' });
    await user.click(screen.getByRole('button', { name: '회원' }));
    const list = await screen.findByRole('list', { name: '운영 회원 목록' });
    await within(list).findByRole('button', { name: '김회원 운영자 지정' });

    expect(within(list).getByRole('button', { name: '김회원 운영자 지정' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: '김회원 탈퇴 처리' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: '박운영 운영자 해제' })).toBeInTheDocument();
    expect(within(list).queryByRole('button', { name: '박운영 탈퇴 처리' })).not.toBeInTheDocument();

    await user.click(within(list).getByRole('button', { name: '김회원 운영자 지정' }));
    await waitFor(() => expect(mocks.designate).toHaveBeenCalledWith(11, 'esntl-2', true));
    await user.click(within(list).getByRole('button', { name: '김회원 탈퇴 처리' }));
    await waitFor(() => expect(mocks.withdraw).toHaveBeenCalledWith(11, 'esntl-2'));
  });

  it('마지막 운영자 해제 거부(409)는 서버 문구를 그대로 보인다', async () => {
    const user = userEvent.setup();
    mocks.designate.mockRejectedValueOnce(new Error('마지막 운영자는 해제할 수 없습니다. 다른 회원을 먼저 운영자로 지정하세요.'));
    renderPanel();
    await screen.findByRole('list', { name: '운영 회원 목록' });
    await user.click(screen.getByRole('button', { name: '회원' }));
    const list = await screen.findByRole('list', { name: '운영 회원 목록' });
    await user.click(await within(list).findByRole('button', { name: '박운영 운영자 해제' }));
    await waitFor(() => expect(mocks.designate).toHaveBeenCalledWith(11, 'esntl-3', false));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      expect.stringContaining('마지막 운영자는 해제할 수 없습니다'), 'error'));
  });

  it('소개 저장은 이름·소개와 읽은 버전을 보내고, 이름이 비면 보내지 않는다', async () => {
    const user = userEvent.setup();
    renderPanel();
    const name = screen.getByLabelText(/커뮤니티 이름/);
    await user.clear(name);
    await user.click(screen.getByRole('button', { name: '소개 저장' }));
    expect(mocks.updateProfile).not.toHaveBeenCalled();

    await user.type(name, '새 이름');
    await user.click(screen.getByRole('button', { name: '소개 저장' }));
    await waitFor(() => expect(mocks.updateProfile).toHaveBeenCalledWith(11, {
      cmntyNm: '새 이름', cmntyIntroCn: '책을 읽는다', version: 4,
    }));
  });

  it('홍신청 가입 승인 은 처리 중 잠기고(aria-busy) 두 번 눌러도 한 번만 보내며 실패를 알린다', async () => {
    let rejectCall!: (reason?: unknown) => void;
    mocks.approve.mockReturnValueOnce(new Promise((_, reject) => { rejectCall = reject; }));
    renderPanel();
    
    const list = await screen.findByRole('list', { name: '운영 회원 목록' });
    const control = await within(list).findByRole('button', { name: '홍신청 가입 승인' });
    act(() => {
      fireEvent.click(control);
      fireEvent.click(control);
    });
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledTimes(1));
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    rejectCall(new Error('처리하지 못했습니다'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('처리하지 못했습니다', 'error'));
    await waitFor(() => expect(control).not.toBeDisabled());
  });

  it('홍신청 가입 반려 은 처리 중 잠기고(aria-busy) 두 번 눌러도 한 번만 보내며 실패를 알린다', async () => {
    let rejectCall!: (reason?: unknown) => void;
    mocks.reject.mockReturnValueOnce(new Promise((_, reject) => { rejectCall = reject; }));
    renderPanel();
    
    const list = await screen.findByRole('list', { name: '운영 회원 목록' });
    const control = await within(list).findByRole('button', { name: '홍신청 가입 반려' });
    act(() => {
      fireEvent.click(control);
      fireEvent.click(control);
    });
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    rejectCall(new Error('처리하지 못했습니다'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('처리하지 못했습니다', 'error'));
    await waitFor(() => expect(control).not.toBeDisabled());
  });

  it('김회원 탈퇴 처리 은 처리 중 잠기고(aria-busy) 두 번 눌러도 한 번만 보내며 실패를 알린다', async () => {
    let rejectCall!: (reason?: unknown) => void;
    mocks.withdraw.mockReturnValueOnce(new Promise((_, reject) => { rejectCall = reject; }));
    renderPanel();
    fireEvent.click(await screen.findByRole('button', { name: '회원' }));
    const list = await screen.findByRole('list', { name: '운영 회원 목록' });
    const control = await within(list).findByRole('button', { name: '김회원 탈퇴 처리' });
    act(() => {
      fireEvent.click(control);
      fireEvent.click(control);
    });
    await waitFor(() => expect(mocks.withdraw).toHaveBeenCalledTimes(1));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    rejectCall(new Error('처리하지 못했습니다'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('처리하지 못했습니다', 'error'));
    await waitFor(() => expect(control).not.toBeDisabled());
  });

});
