import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaSettings } from '../MfaSettings';
import { mfaService } from '@/services/foundation/auth/mfaService';

vi.mock('@/services/foundation/auth/mfaService', () => ({ mfaService: {
  status: vi.fn(), start: vi.fn(), reauthenticate: vi.fn(), regenerate: vi.fn(), disable: vi.fn(), recoverAccount: vi.fn(),
} }));
const auth = vi.hoisted(() => ({ permissions: ['MFA_RECOVER'], logout: vi.fn(), enterMfaChallenge: vi.fn() }));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { permissions: auth.permissions }, logout: auth.logout, enterMfaChallenge: auth.enterMfaChallenge }) }));

describe('MFA account management', () => {
  beforeEach(() => {
    vi.resetAllMocks(); auth.permissions = ['MFA_RECOVER'];
    vi.mocked(mfaService.status).mockResolvedValue({ enabled: true, required: false, available: true, recoveryCodesRemaining: 4 });
  });

  it('enters the restricted challenge state and cancels through ordinary logout', async () => {
    vi.mocked(mfaService.status).mockResolvedValue({ enabled: false, required: false, available: true, recoveryCodesRemaining: 0 });
    vi.mocked(mfaService.start).mockResolvedValue({ secret: 'FIXTURE-KEY', otpauthUri: 'otpauth://totp/fixture', expiresAt: '2026-12-31T00:00:00Z' });
    render(<MfaSettings />);
    fireEvent.change(await screen.findByLabelText('현재 비밀번호'), { target: { value: 'test-password' } });
    fireEvent.click(screen.getByRole('button', { name: '인증앱 등록' }));
    expect(await screen.findByLabelText('인증앱 등록 키')).toHaveTextContent('FIXTURE-KEY');
    expect(auth.enterMfaChallenge).toHaveBeenCalledOnce();
    // Keep navigation pending so this component test only observes the logout boundary.
    auth.logout.mockReturnValueOnce(new Promise<void>(() => {}));
    fireEvent.click(screen.getByRole('button', { name: '취소하고 다시 로그인' }));
    expect(auth.logout).toHaveBeenCalledOnce();
  });

  it('does not offer disabling for a protected account or recovery approval without permission', async () => {
    auth.permissions = [];
    vi.mocked(mfaService.status).mockResolvedValue({ enabled: true, required: true, available: true, recoveryCodesRemaining: 4 });
    render(<MfaSettings />);
    expect(await screen.findByText(/이 계정은 추가 인증이 필수/)).toBeVisible();
    expect(screen.queryByRole('button', { name: /추가 인증 해제/ })).not.toBeInTheDocument();
    expect(screen.queryByLabelText('대상 계정 고유 ID')).not.toBeInTheDocument();
  });

  it('requires fresh proof before regenerating and retains one-time codes until acknowledgement', async () => {
    vi.mocked(mfaService.reauthenticate).mockResolvedValue({ expiresAt: '2026-12-31T00:00:00Z' });
    vi.mocked(mfaService.regenerate).mockResolvedValue({ role: 'ROLE_USER', permissions: [], groups: [], authorizationVersion: 'v2', authenticationStage: 'AUTHENTICATED', recoveryCodes: ['r'.repeat(22)] });
    const locked = vi.fn();
    render(<MfaSettings onCloseLockChange={locked} />);
    fireEvent.change(await screen.findByLabelText('현재 비밀번호'), { target: { value: 'test-password' } });
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: '복구 코드 재발급' }));
    expect(await screen.findByRole('list', { name: '일회용 복구 코드' })).toHaveTextContent('r'.repeat(22));
    expect(mfaService.reauthenticate).toHaveBeenCalledWith('test-password', '012345');
    expect(vi.mocked(mfaService.reauthenticate).mock.invocationCallOrder[0]).toBeLessThan(vi.mocked(mfaService.regenerate).mock.invocationCallOrder[0]);
    await waitFor(() => expect(locked).toHaveBeenLastCalledWith(true));
  });

  it('blocks free-text personal details before requesting recent proof', async () => {
    render(<MfaSettings />);
    fireEvent.change(await screen.findByLabelText('현재 비밀번호'), { target: { value: 'test-password' } });
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '012345' } });
    fireEvent.change(screen.getByLabelText('대상 계정 고유 ID'), { target: { value: 'opaque-target' } });
    fireEvent.change(screen.getByLabelText('본인 확인 승인 참조번호'), { target: { value: 'person@example.test' } });
    fireEvent.click(screen.getByRole('button', { name: '본인 확인 완료 계정 복구 승인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('승인 참조번호');
    await waitFor(() => expect(screen.getByLabelText('본인 확인 승인 참조번호')).toHaveFocus());
    expect(mfaService.reauthenticate).not.toHaveBeenCalled();
    expect(mfaService.recoverAccount).not.toHaveBeenCalled();
  });

  it('blocks duplicate management submissions while recent proof is pending and exposes a recoverable failure', async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(mfaService.reauthenticate).mockReturnValue(new Promise((_, failure) => { reject = failure; }));
    render(<MfaSettings />);
    fireEvent.change(await screen.findByLabelText('현재 비밀번호'), { target: { value: 'test-password' } });
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '012345' } });
    const button = screen.getByRole('button', { name: '복구 코드 재발급' });
    fireEvent.click(button);
    fireEvent.submit(button.closest('form')!);
    expect(mfaService.reauthenticate).toHaveBeenCalledTimes(1);
    expect(button).toBeDisabled();
    expect(button.closest('form')).toHaveAttribute('aria-busy', 'true');
    await act(async () => reject(new Error('unavailable')));
    expect(await screen.findByRole('alert')).toHaveTextContent('완료하지 못했습니다');
    expect(button).toBeEnabled();
    expect(mfaService.regenerate).not.toHaveBeenCalled();
  });

  it('a failed recent proof cannot reach recovery approval or leak upstream details', async () => {
    vi.mocked(mfaService.reauthenticate).mockRejectedValue(new Error('private proof material'));
    render(<MfaSettings />);
    fireEvent.change(await screen.findByLabelText('현재 비밀번호'), { target: { value: 'test-password' } });
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '012345' } });
    fireEvent.change(screen.getByLabelText('대상 계정 고유 ID'), { target: { value: 'opaque-target' } });
    fireEvent.change(screen.getByLabelText('본인 확인 승인 참조번호'), { target: { value: 'CASE-123' } });
    fireEvent.click(screen.getByRole('button', { name: '본인 확인 완료 계정 복구 승인' }));
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private proof material');
    expect(mfaService.recoverAccount).not.toHaveBeenCalled();
  });
});
