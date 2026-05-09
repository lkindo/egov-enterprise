import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import LoginPage from '../page';

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

vi.mock('@/hooks/useMessage', () => ({
  useMessage: () => ({
    t: (key: string) => {
        const messages: Record<string, string> = {
            'login.title': '엔터프라이즈',
            'login.idLabel': '아이디',
            'login.pwLabel': '비밀번호',
            'login.idPlaceholder': '아이디를 입력하세요...',
            'login.pwPlaceholder': '비밀번호를 입력하세요',
            'login.rememberId': '로그인 상태 유지',
            'login.submit': '로그인',
            'login.errorEmpty': '아이디와 패스워드를 입력해주세요',
            'login.errorFailed': '로그인에 실패했습니다',
        };
        return messages[key] || key;
    }
  }),
}));

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }: any) => <div {...props}>{children}</div>,
    form: ({ children, ...props }: any) => <form {...props}>{children}</form>,
  },
  AnimatePresence: ({ children }: any) => <>{children}</>,
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
  });

  it('renders login page correctly', () => {
    render(<LoginPage />);
    expect(screen.getByText(/엔터프라이즈/i)).toBeDefined();
    expect(screen.getByText(/아이디/i)).toBeDefined();
    expect(screen.getAllByText(/비밀번호/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: /로그인/i })).toBeDefined();
  });

  it('calls login service with credentials', async () => {
    mockLogin.mockResolvedValueOnce({});
    render(<LoginPage />);
    
    const idInput = screen.getByLabelText(/아이디/i);
    const pwInput = screen.getByLabelText(/비밀번호/i);
    const submitButton = screen.getByRole('button', { name: /로그인/i });

    fireEvent.change(idInput, { target: { value: 'testuser' } });
    fireEvent.change(pwInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ id: 'testuser', password: 'password123' });
    });
  });

  it('shows error message on login failure', async () => {
    const errorMsg = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMsg));
    
    render(<LoginPage />);
    
    const idInput = screen.getByLabelText(/아이디/i);
    const pwInput = screen.getByLabelText(/비밀번호/i);
    const submitButton = screen.getByRole('button', { name: /로그인/i });

    fireEvent.change(idInput, { target: { value: 'baduser' } });
    fireEvent.change(pwInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toBeDefined();
      expect(screen.getByText(new RegExp(errorMsg, 'i'))).toBeDefined();
    });
  });
});
