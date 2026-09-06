import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { CommunityMembersPanel } from '../CommunityMembersPanel';

/**
 * 🏘 커뮤니티 회원 관리 패널 계약 (DEC-OPS-043, GAP-CMTY-001).
 *
 * 가입 신청(REQUESTED)만 승인·반려 버튼을 갖고, 회원(APPROVED)에는 어떤 전이 버튼도 없다(강제 탈퇴 절차가 없으므로
 * 어포던스도 없다 — G10). 승인은 확인 없이 한 번, 반려는 destructive 확인 뒤 한 번 부르며, 처리 중에는 모든 행의 버튼이
 * disabled 이고 처리 중인 버튼만 aria-busy 다. 실패는 토스트로 드러나고 목록은 남는다. 이름이 없으면 esntlId 를 보여 준다.
 */
const mocks = vi.hoisted(() => ({
  getMembers: vi.fn(),
  approveMember: vi.fn(),
  rejectMember: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/services/foundation/system/CommunityAdminService', () => ({
  communityAdminService: {
    getMembers: mocks.getMembers,
    approveMember: mocks.approveMember,
    rejectMember: mocks.rejectMember,
  },
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const community = { cmntySn: 11, cmntyNm: '독서 모임', cmntyIntrcn: '책', useYn: 'Y' as const };

const requested = { cmntySn: 11, userId: 'esntl-1', userNm: '홍길동', status: 'REQUESTED' as const, mbrSttsCd: 'A', mngrYn: 'N', joinYmd: '20260906', useYn: 'Y' };
const orphan = { cmntySn: 11, userId: 'esntl-gone', userNm: null, status: 'REQUESTED' as const, mbrSttsCd: 'A', mngrYn: 'N', joinYmd: null, useYn: 'Y' };
const member = { cmntySn: 11, userId: 'esntl-2', userNm: '김회원', status: 'APPROVED' as const, mbrSttsCd: 'P', mngrYn: 'N', joinYmd: '20260801', useYn: 'Y' };

function page(list: unknown[]) {
  return { list, total: list.length, page: 0, size: 20, totalPage: 1 };
}

function renderPanel(onBack = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CommunityMembersPanel community={community} onBack={onBack} />
    </QueryClientProvider>,
  );
  return { client, onBack };
}

describe('CommunityMembersPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getMembers.mockImplementation((_sn: number, params: { status?: string }) => {
      if (params.status === 'REQUESTED') return Promise.resolve(page([requested, orphan]));
      if (params.status === 'APPROVED') return Promise.resolve(page([member]));
      return Promise.resolve(page([requested, orphan, member]));
    });
    mocks.approveMember.mockResolvedValue(undefined);
    mocks.rejectMember.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('기본 필터는 가입 신청이고, 이름 없는 신청자는 esntlId 로 보여 주며, 회원 행에는 전이 버튼이 없다', async () => {
    const user = userEvent.setup();
    renderPanel();
    const list = await screen.findByRole('list', { name: '회원 목록' });
    expect(mocks.getMembers).toHaveBeenCalledWith(11, { status: 'REQUESTED', page: 0, size: 20 });
    expect(within(list).getByText('홍길동')).toBeInTheDocument();
    expect(within(list).getByText('esntl-gone')).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: '홍길동 가입 승인' })).toBeInTheDocument();
    expect(within(list).getByRole('button', { name: 'esntl-gone 가입 반려' })).toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '회원' }));
    await waitFor(() => expect(mocks.getMembers).toHaveBeenCalledWith(11, { status: 'APPROVED', page: 0, size: 20 }));
    const memberList = await screen.findByRole('list', { name: '회원 목록' });
    await within(memberList).findByText('김회원');
    expect(within(memberList).queryByRole('button', { name: /가입 승인/ })).not.toBeInTheDocument();
    expect(within(memberList).queryByRole('button', { name: /가입 반려/ })).not.toBeInTheDocument();

    await user.click(screen.getByRole('button', { name: '전체' }));
    await waitFor(() => expect(mocks.getMembers).toHaveBeenCalledWith(11, { page: 0, size: 20 }));
  });

  it('승인은 확인 없이 한 번만 부르고 pending 동안 disabled·aria-busy 이며(다른 행도 disabled), 실패는 토스트로 드러내고 행을 남긴다', async () => {
    let rejectApprove: (reason?: unknown) => void = () => undefined;
    mocks.approveMember.mockImplementation(() => new Promise<void>((_resolve, reject) => { rejectApprove = reject; }));
    renderPanel();
    const list = await screen.findByRole('list', { name: '회원 목록' });
    const approveButton = within(list).getByRole('button', { name: '홍길동 가입 승인' });
    fireEvent.dblClick(approveButton);
    fireEvent.click(approveButton);

    expect(mocks.approveMember).toHaveBeenCalledTimes(1);
    expect(mocks.approveMember).toHaveBeenCalledWith(11, 'esntl-1');
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(approveButton).toBeDisabled();
    expect(approveButton).toHaveAttribute('aria-busy', 'true');
    expect(within(list).getByRole('button', { name: 'esntl-gone 가입 승인' })).toBeDisabled();
    expect(within(list).getByRole('button', { name: '홍길동 가입 반려' })).toBeDisabled();
    expect(within(list).getByRole('button', { name: '홍길동 가입 반려' })).not.toHaveAttribute('aria-busy', 'true');

    rejectApprove(new Error('가입 신청 상태가 아니어서 승인할 수 없습니다.'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('가입 신청 상태가 아니어서 승인할 수 없습니다.', 'error'));
    expect(within(list).getByText('홍길동')).toBeInTheDocument();
    await waitFor(() => expect(approveButton).not.toBeDisabled());
    expect(approveButton).not.toHaveAttribute('aria-busy', 'true');
  });

  it('반려는 destructive 확인 뒤 한 번만 부르고 pending 동안 disabled·aria-busy 이며, 실패는 토스트로 드러내고 행을 남긴다', async () => {
    let rejectReject: (reason?: unknown) => void = () => undefined;
    mocks.rejectMember.mockImplementation(() => new Promise<void>((_resolve, reject) => { rejectReject = reject; }));
    renderPanel();
    const list = await screen.findByRole('list', { name: '회원 목록' });
    const rejectButton = within(list).getByRole('button', { name: '홍길동 가입 반려' });
    fireEvent.dblClick(rejectButton);
    fireEvent.click(rejectButton);

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.confirm.mock.calls[0][0]).toMatchObject({ variant: 'destructive', confirmText: '반려' });
    expect(String(mocks.confirm.mock.calls[0][0].message)).toMatch(/다시 신청할 수 있습니다/);
    await waitFor(() => expect(mocks.rejectMember).toHaveBeenCalledTimes(1));
    expect(mocks.rejectMember).toHaveBeenCalledWith(11, 'esntl-1');
    expect(rejectButton).toBeDisabled();
    expect(rejectButton).toHaveAttribute('aria-busy', 'true');
    expect(within(list).getByRole('button', { name: '홍길동 가입 승인' })).toBeDisabled();

    rejectReject(new Error('반려 서버 오류'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('반려 서버 오류', 'error'));
    expect(within(list).getByText('홍길동')).toBeInTheDocument();
    await waitFor(() => expect(rejectButton).not.toBeDisabled());
    expect(rejectButton).not.toHaveAttribute('aria-busy', 'true');
  });

  it('반려 확인을 취소하면 서버를 부르지 않고 버튼이 다시 열린다', async () => {
    mocks.confirm.mockResolvedValueOnce(false);
    renderPanel();
    const list = await screen.findByRole('list', { name: '회원 목록' });
    fireEvent.click(within(list).getByRole('button', { name: '홍길동 가입 반려' }));

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(within(list).getByRole('button', { name: '홍길동 가입 반려' })).not.toBeDisabled());
    expect(mocks.rejectMember).not.toHaveBeenCalled();
  });

  it('성공하면 안내하고 목록을 다시 읽는다', async () => {
    renderPanel();
    const list = await screen.findByRole('list', { name: '회원 목록' });
    fireEvent.click(within(list).getByRole('button', { name: '홍길동 가입 승인' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('홍길동 님의 가입을 승인했습니다.', 'success'));
    await waitFor(() => expect(mocks.getMembers.mock.calls.length).toBeGreaterThanOrEqual(2));

    fireEvent.click(within(list).getByRole('button', { name: 'esntl-gone 가입 반려' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('esntl-gone 님의 가입 신청을 반려했습니다.', 'success'));
  });

  it('처리할 신청이 없으면 빈 상태를 말하고, 돌아가기는 상위에 맡긴다', async () => {
    mocks.getMembers.mockResolvedValue(page([]));
    const { onBack } = renderPanel();
    expect(await screen.findByText('처리할 가입 신청이 없습니다.')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 목록' }));
    expect(onBack).toHaveBeenCalledTimes(1);
  });
});
