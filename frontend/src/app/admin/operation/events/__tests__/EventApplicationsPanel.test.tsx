import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EventApplicationsPanel } from '../EventApplicationsPanel';

/**
 * [V2_152] 행사 신청자 패널 계약. 승인·반려 버튼은 행사 수정 권한(EVENT_UPDATE)이 있을 때만 보인다. 승인은 신청(APPLIED)에만,
 * 반려는 신청·승인에 있고 확인을 거친다. 결정은 목록에서 읽은 신청 버전으로 보낸다. 목록 조회 거부(403)는 서버 문구로 보인다.
 */
const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  getApplications: vi.fn(),
  approve: vi.fn(),
  reject: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/services/foundation/operation/eventParticipationService', async () => {
  const actual = await vi.importActual<typeof import('@/services/foundation/operation/eventParticipationService')>(
    '@/services/foundation/operation/eventParticipationService');
  return {
    ...actual,
    eventParticipationService: { getApplications: mocks.getApplications, approve: mocks.approve, reject: mocks.reject },
  };
});
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

const applied = { evntAplySn: 31, evntSn: 7, aplcntId: 'esntl-1', aplcntNm: '홍신청', aplySttsCd: 'APPLIED', version: 2 };
const approved = { evntAplySn: 32, evntSn: 7, aplcntId: 'esntl-2', aplcntNm: '김승인', aplySttsCd: 'APPROVED', version: 5 };
const cancelled = { evntAplySn: 33, evntSn: 7, aplcntId: 'esntl-3', aplcntNm: '이취소', aplySttsCd: 'CANCELLED', version: 1 };

function renderPanel() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><EventApplicationsPanel evntSn={7} eventName="가을 워크숍" /></QueryClientProvider>);
}

describe('EventApplicationsPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['EVENT_READ', 'EVENT_UPDATE'];
    mocks.getApplications.mockResolvedValue({ list: [applied, approved, cancelled], total: 3 });
    mocks.approve.mockResolvedValue(undefined);
    mocks.reject.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  it('수정 권한이 없으면 신청자만 보이고 승인·반려 버튼이 없다', async () => {
    mocks.permissions = ['EVENT_READ'];
    renderPanel();
    expect(await screen.findByText(/홍신청/)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /승인$/ })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /반려$/ })).not.toBeInTheDocument();
  });

  it('승인은 신청에만 있고 읽은 버전으로 보낸다 — 반려는 확인 뒤 보낸다', async () => {
    const user = userEvent.setup();
    renderPanel();
    const region = await screen.findByRole('region', { name: '가을 워크숍 신청자' });
    await within(region).findByRole('button', { name: '홍신청 승인' });
    expect(within(region).queryByRole('button', { name: '김승인 승인' })).not.toBeInTheDocument();
    expect(within(region).queryByRole('button', { name: /이취소/ })).not.toBeInTheDocument();

    await user.click(within(region).getByRole('button', { name: '홍신청 승인' }));
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledWith(7, 31, 2));
    expect(mocks.confirm).not.toHaveBeenCalled();

    await user.click(within(region).getByRole('button', { name: '김승인 반려' }));
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledWith(7, 32, 5));
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
  });

  it('목록 조회가 거부되면 서버 문구와 다시 시도를 보인다', async () => {
    mocks.getApplications.mockRejectedValueOnce(new Error('접근 권한이 없습니다.'));
    renderPanel();
    expect(await screen.findByText('접근 권한이 없습니다.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '다시 시도' })).toBeInTheDocument();
  });

  it('홍신청 승인 은 처리 중 잠기고(aria-busy) 두 번 눌러도 한 번만 보내며 실패를 알린다', async () => {
    let rejectCall!: (reason?: unknown) => void;
    mocks.approve.mockReturnValueOnce(new Promise((_, reject) => { rejectCall = reject; }));
    renderPanel();
    const region = await screen.findByRole('region', { name: '가을 워크숍 신청자' });
    const control = await within(region).findByRole('button', { name: '홍신청 승인' });
    act(() => {
      fireEvent.click(control);
      fireEvent.click(control);
    });
    await waitFor(() => expect(mocks.approve).toHaveBeenCalledTimes(1));
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    rejectCall(new Error('처리하지 못했습니다'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('처리하지 못했습니다', 'error'));
  });

  it('김승인 반려 은 처리 중 잠기고(aria-busy) 두 번 눌러도 한 번만 보내며 실패를 알린다', async () => {
    let rejectCall!: (reason?: unknown) => void;
    mocks.reject.mockReturnValueOnce(new Promise((_, reject) => { rejectCall = reject; }));
    renderPanel();
    const region = await screen.findByRole('region', { name: '가을 워크숍 신청자' });
    const control = await within(region).findByRole('button', { name: '김승인 반려' });
    act(() => {
      fireEvent.click(control);
      fireEvent.click(control);
    });
    await waitFor(() => expect(mocks.reject).toHaveBeenCalledTimes(1));
    expect(control).toBeDisabled();
    expect(control).toHaveAttribute('aria-busy', 'true');
    rejectCall(new Error('처리하지 못했습니다'));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('처리하지 못했습니다', 'error'));
  });

});
