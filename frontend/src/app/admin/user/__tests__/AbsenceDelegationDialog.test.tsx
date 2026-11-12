import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { AbsenceDelegationDialog } from '../AbsenceDelegationDialog';

/**
 * [V2_151] 부재 대리결재 지정 창 계약. 대리결재자는 esntlId 로 보낸다(이름·로그인 ID 가 아니다). 대리결재자·기간이 없거나 기간이
 * 거꾸로면 보내지 않고, 서버 거부(본인·잠긴 계정·연쇄·순환)는 서버 문구를 그대로 보인다.
 */
const mocks = vi.hoisted(() => ({ updateDelegation: vi.fn(), toast: vi.fn() }));

vi.mock('@/services/foundation/system/UserAbsenceAdminService', () => ({
  userAbsenceAdminService: { updateDelegation: mocks.updateDelegation },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/lib/date/today-ymd', () => ({ getTodayYmd: () => '20261112' }));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ title, children }: { title: string; children: React.ReactNode }) => <div role="dialog" aria-label={title}>{children}</div>,
}));
vi.mock('@/app/components/ui/user-picker', () => ({
  UserPicker: ({ isOpen, onSelect }: { isOpen: boolean; onSelect: (user: { esntlId: string; userNm: string; userId: string }) => void }) =>
    isOpen ? <button type="button" onClick={() => onSelect({ esntlId: 'E-DELEGATE', userNm: '이대리', userId: 'lee-login' })}>이대리 고르기</button> : null,
}));

const target = { userId: 'kim-login', esntlId: 'E-ABSENT', userNm: '김부재' };

function renderDialog(onClose = vi.fn()) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(<QueryClientProvider client={client}><AbsenceDelegationDialog target={target as never} onClose={onClose} /></QueryClientProvider>);
  return onClose;
}

describe('AbsenceDelegationDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.updateDelegation.mockResolvedValue(undefined);
  });

  it('대리결재자를 고르지 않으면 보내지 않는다', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findAllByText('대리결재자를 골라 주세요.')).not.toHaveLength(0);
    expect(mocks.updateDelegation).not.toHaveBeenCalled();
  });

  it('종료일이 시작일보다 앞서면 보내지 않는다', async () => {
    const user = userEvent.setup();
    renderDialog();
    await user.click(screen.getByRole('button', { name: '대리결재자 고르기' }));
    await user.click(screen.getByRole('button', { name: '이대리 고르기' }));
    await user.clear(screen.getByLabelText('부재 종료일'));
    await user.type(screen.getByLabelText('부재 종료일'), '2026-11-10');
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findAllByText('부재 종료일은 시작일과 같거나 그 뒤여야 합니다.')).not.toHaveLength(0);
    expect(mocks.updateDelegation).not.toHaveBeenCalled();
  });

  it('원결재자와 대리결재자를 esntlId 로, 기간을 yyyyMMdd 로 보내고 닫는다', async () => {
    const user = userEvent.setup();
    const onClose = renderDialog();
    await user.click(screen.getByRole('button', { name: '대리결재자 고르기' }));
    await user.click(screen.getByRole('button', { name: '이대리 고르기' }));
    await user.click(screen.getByRole('button', { name: '저장' }));
    await waitFor(() => expect(mocks.updateDelegation).toHaveBeenCalledWith('E-ABSENT', {
      sbtAprvrId: 'E-DELEGATE', absnBgngYmd: '20261112', absnEndYmd: '20261112',
    }));
    expect(onClose).toHaveBeenCalled();
  });

  it('서버 거부(순환 지정 등)는 서버 문구를 그대로 보이고 창을 닫지 않는다', async () => {
    const user = userEvent.setup();
    mocks.updateDelegation.mockRejectedValueOnce(new Error('대리결재자가 같은 기간에 이 사용자에게 결재를 맡겼습니다.'));
    const onClose = renderDialog();
    await user.click(screen.getByRole('button', { name: '대리결재자 고르기' }));
    await user.click(screen.getByRole('button', { name: '이대리 고르기' }));
    await user.click(screen.getByRole('button', { name: '저장' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('대리결재자가 같은 기간에 이 사용자에게 결재를 맡겼습니다.');
    expect(onClose).not.toHaveBeenCalled();
  });
});
