import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { PasswordChangeGate } from '../PasswordChangeGate';

/**
 * 임시 비밀번호 관문(2026-10-01 결정 18).
 *
 * 서버가 비밀번호 변경 밖의 API 를 거부하므로, 앱을 그대로 그리면 오류만 보인다. 관문은 앱 대신 이유와
 * 변경 폼을 보이고, 바꾸면 다시 로그인하게 한다.
 */
const mocks = vi.hoisted(() => ({
  user: null as null | { id: string; name: string; passwordChangeRequired?: true },
  logout: vi.fn(),
  changePassword: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user, logout: mocks.logout }) }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/services/business/user/userService', () => ({ userService: { changePassword: mocks.changePassword } }));

describe('PasswordChangeGate', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.logout.mockResolvedValue(undefined);
    Object.defineProperty(window, 'location', { configurable: true, value: { ...window.location, replace: vi.fn() } });
  });

  it('변경 의무가 없으면 앱을 그대로 그린다', () => {
    mocks.user = { id: 'user1', name: '사용자' };
    render(<PasswordChangeGate><p>업무 화면</p></PasswordChangeGate>);
    expect(screen.getByText('업무 화면')).toBeInTheDocument();
  });

  it('임시 비밀번호면 앱 대신 이유와 변경 폼만 보인다', () => {
    mocks.user = { id: 'user1', name: '사용자', passwordChangeRequired: true };
    render(<PasswordChangeGate><p>업무 화면</p></PasswordChangeGate>);
    expect(screen.queryByText('업무 화면')).not.toBeInTheDocument();
    expect(screen.getByRole('heading', { name: '비밀번호를 바꿔 주세요' })).toBeInTheDocument();
    expect(screen.getByText(/관리자가 초기화한 임시 비밀번호/)).toBeInTheDocument();
  });

  it('바꾸면 다시 로그인하게 하고, 미루면 로그아웃한다', async () => {
    mocks.user = { id: 'user1', name: '사용자', passwordChangeRequired: true };
    mocks.changePassword.mockResolvedValue(undefined);
    render(<PasswordChangeGate><p>업무 화면</p></PasswordChangeGate>);
    fireEvent.change(screen.getByLabelText('현재 비밀번호'), { target: { value: 'Temp1234!' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호'), { target: { value: 'NewPassw0rd!' } });
    fireEvent.change(screen.getByLabelText('새 비밀번호 확인'), { target: { value: 'NewPassw0rd!' } });
    fireEvent.click(screen.getByRole('button', { name: '비밀번호 변경' }));

    await waitFor(() => expect(mocks.changePassword).toHaveBeenCalledWith('Temp1234!', 'NewPassw0rd!'));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
    expect(window.location.replace).toHaveBeenCalledWith('/login');

    vi.clearAllMocks();
    mocks.logout.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: '로그아웃' }));
    await waitFor(() => expect(mocks.logout).toHaveBeenCalledTimes(1));
  });
});
