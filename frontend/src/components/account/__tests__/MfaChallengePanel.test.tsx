import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MfaChallengePanel } from '../MfaChallengePanel';
import { mfaService } from '@/services/foundation/auth/mfaService';

vi.mock('@/services/foundation/auth/mfaService', () => ({ mfaService: { verify: vi.fn(), prepare: vi.fn(), confirm: vi.fn() } }));
const authenticated = { role: 'ROLE_USER', groups: ['ROLE_USER'], permissions: [], authorizationVersion: 'v2', authenticationStage: 'AUTHENTICATED' as const };

describe('MFA challenge workflow', () => {
  beforeEach(() => vi.clearAllMocks());

  it('preserves a leading zero and completes only after second-factor verification', async () => {
    vi.mocked(mfaService.verify).mockResolvedValue(authenticated);
    const onComplete = vi.fn();
    render(<MfaChallengePanel stage="MFA_REQUIRED" onComplete={onComplete} onCancel={vi.fn()} />);
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '012345' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));
    await waitFor(() => expect(onComplete).toHaveBeenCalledOnce());
    expect(mfaService.verify).toHaveBeenCalledWith({ code: '012345' });
  });

  it('does not send malformed OTP or expose upstream error details', async () => {
    vi.mocked(mfaService.verify).mockRejectedValue(new Error('private challenge value'));
    render(<MfaChallengePanel stage="MFA_REQUIRED" onComplete={vi.fn()} onCancel={vi.fn()} />);
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '123' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));
    expect(await screen.findByRole('alert')).toHaveTextContent('6자리');
    await waitFor(() => expect(screen.getByLabelText('인증앱 코드')).toHaveFocus());
    expect(mfaService.verify).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '123456' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));
    expect(await screen.findByRole('alert')).not.toHaveTextContent('private challenge value');
  });

  it('locks duplicate verification synchronously and retains the entered value after failure', async () => {
    let reject!: (reason: Error) => void;
    vi.mocked(mfaService.verify).mockReturnValue(new Promise((_, failure) => { reject = failure; }));
    render(<MfaChallengePanel stage="MFA_REQUIRED" onComplete={vi.fn()} onCancel={vi.fn()} />);
    const input = screen.getByLabelText('인증앱 코드');
    fireEvent.change(input, { target: { value: '012345' } });
    const form = input.closest('form')!;
    fireEvent.submit(form); fireEvent.submit(form);
    expect(mfaService.verify).toHaveBeenCalledTimes(1);
    expect(screen.getByRole('button', { name: '확인 중…' })).toBeDisabled();
    expect(screen.getByRole('region', { name: '추가 인증' })).toHaveAttribute('aria-busy', 'true');
    await act(async () => reject(new Error('private material')));
    expect(await screen.findByRole('alert')).toHaveTextContent('완료하지 못했습니다');
    expect(input).toHaveValue('012345');
    expect(screen.getByRole('button', { name: '인증 확인' })).toBeEnabled();
  });

  it('recovery requires re-enrollment and one-time codes acknowledgement before navigation', async () => {
    vi.mocked(mfaService.verify).mockResolvedValue({ authenticationStage: 'ENROLLMENT_REQUIRED', mfaChallengeExpiresAt: '2026-12-31T00:00:00Z' });
    vi.mocked(mfaService.prepare).mockResolvedValue({ secret: 'LOCAL-SETUP-KEY', otpauthUri: 'otpauth://totp/fixture', expiresAt: '2026-12-31T00:00:00Z' });
    vi.mocked(mfaService.confirm).mockResolvedValue({ ...authenticated, recoveryCodes: ['recovery-fixture-1', 'recovery-fixture-2'] });
    const onComplete = vi.fn();
    render(<MfaChallengePanel stage="MFA_REQUIRED" onComplete={onComplete} onCancel={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: '분실 시 복구 코드 사용' }));
    fireEvent.change(screen.getByLabelText('복구 코드'), { target: { value: 'r'.repeat(22) } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));
    fireEvent.click(await screen.findByRole('button', { name: '인증앱 등록 준비' }));
    expect(await screen.findByLabelText('인증앱 등록 키')).toHaveTextContent('LOCAL-SETUP-KEY');
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText('인증앱 코드'), { target: { value: '023456' } });
    fireEvent.click(screen.getByRole('button', { name: '인증 확인' }));
    expect(await screen.findByRole('list', { name: '일회용 복구 코드' })).toHaveTextContent('recovery-fixture-1');
    expect(screen.queryByText('LOCAL-SETUP-KEY')).not.toBeInTheDocument();
    expect(onComplete).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: '복구 코드를 보관했습니다' }));
    expect(onComplete).toHaveBeenCalledOnce();
  });
});
