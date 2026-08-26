import { act, render, screen, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import LoginPage from '../page';
import { resolveInternalRedirect } from '../LoginClient';

const LOGIN_ERROR_COPY = '로그인에 실패했습니다. 아이디 또는 비밀번호를 확인해주세요.';

// Mock Modules
const mockLogin = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
    user: null,
    loading: false,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
  }),
  useSearchParams: () => ({
    get: vi.fn().mockReturnValue('/admin/work-hub'),
  }),
}));

const { mockReducedMotion } = vi.hoisted(() => ({
  mockReducedMotion: vi.fn(() => false),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, initial, animate: _animate, transition: _transition, exit: _exit, ...props }: any) => (
      <div data-motion-initial={JSON.stringify(initial)} {...props}>{children}</div>
    ),
    form: ({ children, initial, animate: _animate, transition: _transition, exit: _exit, ...props }: any) => (
      <form data-motion-initial={JSON.stringify(initial)} {...props}>{children}</form>
    ),
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
  useReducedMotion: mockReducedMotion,
}));

// Mock sonner
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('LoginPage Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    mockReducedMotion.mockReturnValue(false);
  });

  afterEach(() => {
    vi.restoreAllMocks();
    document.querySelector('[data-login-test-shell]')?.remove();
  });

  it('renders login page correctly', () => {
    render(<LoginPage />);
    expect(screen.getByText(/엔터프라이즈/i)).toBeDefined();
    expect(screen.getByText(/아이디/i)).toBeDefined();
    expect(screen.getAllByText(/비밀번호/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /로그인/i })).toBeDefined();
    expect(screen.getByRole('textbox', { name: '아이디' })).toHaveAttribute('aria-required', 'true');
    expect(screen.getByRole('textbox', { name: '아이디' })).toHaveAttribute('maxlength', '20');
    expect(screen.getByLabelText('비밀번호')).toHaveAttribute('aria-required', 'true');
  });

  it('필수 자격증명이 비어 있으면 인증 요청 없이 첫 오류로 이동하고 필드별 안내를 제공한다', async () => {
    render(<LoginPage />);
    const idInput = screen.getByRole('textbox', { name: '아이디' });

    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));

    expect(mockLogin).not.toHaveBeenCalled();
    expect(await screen.findByText('아이디를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByText('비밀번호를 입력해 주세요.')).toBeInTheDocument();
    expect(screen.getByTestId('login-validation-summary')).toHaveTextContent('입력 오류 2개');
    expect(idInput).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(idInput).toHaveFocus());
  });

  it('아이디 20자 상한을 넘으면 값을 보존하고 인증 요청을 차단한다', async () => {
    render(<LoginPage />);
    const idInput = screen.getByRole('textbox', { name: '아이디' });
    fireEvent.change(idInput, { target: { value: 'u'.repeat(21) } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password' } });

    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));

    expect(mockLogin).not.toHaveBeenCalled();
    expect(await screen.findByText('아이디: 최대 20자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(idInput).toHaveValue('u'.repeat(21));
    await waitFor(() => expect(idInput).toHaveFocus());
  });

  it('calls login service once and locks the form for same-tick duplicate submits', async () => {
    mockLogin.mockImplementationOnce(() => new Promise(() => undefined));
    render(<LoginPage />);
    
    const idInput = screen.getByPlaceholderText(/아이디를 입력하세요.../i);
    const pwInput = screen.getByPlaceholderText(/비밀번호를 입력하세요/i);
    const submitButton = screen.getByRole('button', { name: /로그인/i });

    fireEvent.change(idInput, { target: { value: 'testuser' } });
    fireEvent.change(pwInput, { target: { value: 'password123' } });
    const form = submitButton.closest('form');
    expect(form).not.toBeNull();
    act(() => {
      fireEvent.submit(form!);
      fireEvent.submit(form!);
    });

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ id: 'testuser', password: 'password123' });
      expect(mockLogin).toHaveBeenCalledTimes(1);
    });
    expect(submitButton).toBeDisabled();
    expect(form).toHaveAttribute('inert');
  });

  it('shows error message on login failure', async () => {
    const privateError = 'connect ECONNREFUSED http://internal-auth:8080/users/42';
    mockLogin.mockRejectedValueOnce(new Error(privateError));
    
    render(<LoginPage />);
    
    const idInput = screen.getByPlaceholderText(/아이디를 입력하세요.../i);
    const pwInput = screen.getByPlaceholderText(/비밀번호를 입력하세요/i);
    const submitButton = screen.getByRole('button', { name: /로그인/i });

    fireEvent.change(idInput, { target: { value: 'baduser' } });
    fireEvent.change(pwInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      const alert = screen.getByTestId('login-error');
      expect(alert).toHaveTextContent(LOGIN_ERROR_COPY);
      // The card is translucent over a darkened backdrop. A 10% destructive tint
      // lowers this small text below 4.5:1; the bounded 5% tint keeps the semantic
      // error surface while preserving the AA contrast pair.
      expect(alert).toHaveClass('text-destructive-emphasis', 'bg-destructive/5');
      expect(alert).not.toHaveClass('bg-destructive/10');
      expect(screen.queryByText(privateError, { exact: false })).not.toBeInTheDocument();
    });
  });

  it('restores focus only after the failed-login form is no longer inert', async () => {
    let rejectLogin: ((reason?: unknown) => void) | undefined;
    mockLogin.mockImplementationOnce(() => new Promise<void>((_, reject) => {
      rejectLogin = reject;
    }));
    const nativeFocus = HTMLElement.prototype.focus;
    vi.spyOn(HTMLInputElement.prototype, 'focus').mockImplementation(function focusWhenInteractive(
      this: HTMLInputElement,
      options?: FocusOptions,
    ) {
      if (this.closest('[inert]')) return;
      nativeFocus.call(this, options);
    });

    render(<LoginPage />);
    const idInput = screen.getByRole('textbox', { name: '아이디' });
    fireEvent.change(idInput, { target: { value: 'baduser' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'wrongpass' } });
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));

    const progress = await screen.findByRole('status');
    const form = progress.closest('[data-login-card]')?.querySelector('form');
    expect(progress).toHaveFocus();
    expect(form).toHaveAttribute('inert');

    await act(async () => {
      rejectLogin?.(new Error('synthetic login rejection'));
      await Promise.resolve();
    });

    expect(await screen.findByTestId('login-error')).toBeVisible();
    await waitFor(() => {
      expect(form).not.toHaveAttribute('inert');
      expect(idInput).toHaveFocus();
    });
  });

  it('isolates visible application chrome while the login dialog is mounted and restores it on unmount', () => {
    const shell = document.createElement('div');
    shell.setAttribute('data-login-test-shell', 'true');
    shell.innerHTML = [
      '<a href="#main" data-sidebar-modal-background="skip-link" data-testid="shell-skip">본문 바로가기</a>',
      '<header data-testid="shell-header"></header>',
      '<aside data-testid="shell-sidebar"></aside>',
      '<footer data-testid="shell-footer"></footer>',
    ].join('');
    document.body.append(shell);
    const { unmount } = render(<LoginPage />);

    for (const landmark of ['shell-skip', 'shell-header', 'shell-sidebar', 'shell-footer']) {
      const element = screen.getByTestId(landmark) as HTMLElement & { inert: boolean };
      expect(element).toHaveAttribute('aria-hidden', 'true');
      expect(element).toHaveAttribute('inert');
    }
    expect(screen.getByRole('dialog', { name: '엔터프라이즈' })).toHaveAttribute('aria-modal', 'true');

    unmount();
    for (const landmark of ['shell-skip', 'shell-header', 'shell-sidebar', 'shell-footer']) {
      const element = screen.getByTestId(landmark) as HTMLElement & { inert: boolean };
      expect(element).not.toHaveAttribute('aria-hidden');
      expect(element).not.toHaveAttribute('inert');
    }
    shell.remove();
  });

  it('does not inert the shell main element that contains the login dialog', () => {
    const { unmount } = render(
      <>
        <header data-sidebar-modal-background="header" data-testid="nested-shell-header" />
        <main data-sidebar-modal-background="main" data-testid="login-containing-main">
          <LoginPage />
        </main>
      </>,
    );

    const containingMain = screen.getByTestId('login-containing-main');
    expect(containingMain).not.toHaveAttribute('aria-hidden');
    expect(containingMain).not.toHaveAttribute('inert');
    expect(screen.getByRole('dialog', { name: '엔터프라이즈' })).toBeVisible();
    expect(screen.getByRole('textbox', { name: '아이디' })).toHaveFocus();
    expect(screen.getByTestId('nested-shell-header')).toHaveAttribute('inert');

    unmount();
  });

  it('moves initial focus into the dialog and traps forward and reverse Tab navigation', async () => {
    const user = userEvent.setup();
    render(<LoginPage />);

    const idInput = screen.getByRole('textbox', { name: '아이디' });
    const submit = screen.getByRole('button', { name: /로그인/ });
    expect(idInput).toHaveFocus();

    await user.tab({ shift: true });
    expect(submit).toHaveFocus();
    await user.tab();
    expect(idInput).toHaveFocus();
  });

  it('announces submission progress and makes the covered form inert', async () => {
    mockLogin.mockImplementationOnce(() => new Promise(() => undefined));
    render(<LoginPage />);

    fireEvent.change(screen.getByRole('textbox', { name: '아이디' }), { target: { value: 'testuser' } });
    fireEvent.change(screen.getByLabelText('비밀번호'), { target: { value: 'password123' } });
    fireEvent.click(screen.getByRole('button', { name: /로그인/ }));

    const progress = await screen.findByRole('status');
    const form = progress.closest('[data-login-card]')?.querySelector('form');
    expect(progress).toHaveTextContent('로그인 정보를 확인하는 중');
    expect(progress).toHaveFocus();
    expect(form).toHaveAttribute('inert');
    expect(form).toHaveAttribute('aria-hidden', 'true');
  });

  it('does not start entrance animations when reduced motion is requested', () => {
    mockReducedMotion.mockReturnValue(true);
    const { container } = render(<LoginPage />);

    const animatedNodes = [...container.querySelectorAll('[data-motion-initial]')];
    expect(animatedNodes.length).toBeGreaterThan(0);
    for (const node of animatedNodes) {
      expect(node).toHaveAttribute('data-motion-initial', 'false');
    }
  });

  it.each([
    ['https://evil.example/path', '/admin/work-hub'],
    ['//evil.example/path', '/admin/work-hub'],
    ['/\\evil.example/path', '/admin/work-hub'],
    ['/%0A/evil.example', '/admin/work-hub'],
    ['/%0D/evil.example', '/admin/work-hub'],
    ['/%09/evil.example', '/admin/work-hub'],
    ['/\n/evil.example', '/admin/work-hub'],
    ['/\r/evil.example', '/admin/work-hub'],
    ['/\t/evil.example', '/admin/work-hub'],
    ['/%2e%2e//evil.example', '/admin/work-hub'],
    ['/.%2e//evil.example', '/admin/work-hub'],
    ['/a/..//evil.example', '/admin/work-hub'],
    ['/admin/work-hub?tab=my#pending', '/admin/work-hub'],
  ])('only accepts a canonical same-origin redirect path: %j', (rawRedirect, expected) => {
    expect(resolveInternalRedirect(rawRedirect)).toBe(expected);
  });
});
