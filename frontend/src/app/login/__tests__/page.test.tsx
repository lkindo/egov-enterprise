import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';
import LoginPage from '../page';

// Mock Modules
const mockLogin = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    login: mockLogin,
  }),
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
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
            'login.idLabel': '사용자 아이디',
            'login.pwLabel': '액세스 키',
            'login.idPlaceholder': '시스템 아이디를 입력하세요',
            'login.pwPlaceholder': '············',
            'login.rememberId': '로그인 상태 유지',
            'login.submit': '시스템 접속하기',
            'login.errorEmpty': '아이디와 패스워드를 입력해주세요',
            'login.errorFailed': '로그인에 실패했습니다',
        };
        return messages[key] || key;
    }
  }),
}));

// Mock UI Components
vi.mock('@/components/ui/card', () => ({
  Card: ({ children }: any) => <div data-testid="card">{children}</div>,
  CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
  CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
  CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
  CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
  CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
}));

vi.mock('@/components/ui/input', () => ({
  Input: ({ id, value, onChange, placeholder, type, className }: any) => (
    <input id={id} value={value} onChange={onChange} placeholder={placeholder} type={type} className={className} />
  ),
}));

vi.mock('@/components/ui/button', () => ({
  Button: ({ children, onClick, type, disabled, className, 'aria-label': ariaLabel }: any) => (
    <button onClick={onClick} type={type} disabled={disabled} className={className} aria-label={ariaLabel}>{children}</button>
  ),
}));

vi.mock('@/components/ui/label', () => ({
  Label: ({ children, htmlFor, className }: any) => <label htmlFor={htmlFor} className={className}>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
  Checkbox: ({ id }: any) => <input type="checkbox" id={id} />,
}));

// Lucide icons are mocked globally in vitest.setup.ts


describe('LoginPage Component', () => {

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders login page correctly', () => {
    render(<LoginPage />);
    expect(screen.getByText('엔터프라이즈')).toBeInTheDocument();
    expect(screen.getByLabelText('Identity_Protocol')).toBeInTheDocument();
    expect(screen.getByLabelText('Access_Sequence')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Initialize_System_Link/i })).toBeInTheDocument();
  });

  it('calls login service with credentials', async () => {
    mockLogin.mockResolvedValueOnce({});
    render(<LoginPage />);
    
    const idInput = screen.getByLabelText('Identity_Protocol');
    const pwInput = screen.getByLabelText('Access_Sequence');
    const submitButton = screen.getByRole('button', { name: /Initialize_System_Link/i });

    fireEvent.change(idInput, { target: { value: 'testuser' } });
    fireEvent.change(pwInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ id: 'testuser', password: 'password123' });
    });
  });

  it('shows error message on login failure', async () => {
    // Mock login failure
    const errorMsg = 'Invalid credentials';
    mockLogin.mockRejectedValueOnce(new Error(errorMsg));
    
    render(<LoginPage />);
    
    const idInput = screen.getByLabelText('Identity_Protocol');
    const pwInput = screen.getByLabelText('Access_Sequence');
    const submitButton = screen.getByRole('button', { name: /Initialize_System_Link/i });

    fireEvent.change(idInput, { target: { value: 'baduser' } });
    fireEvent.change(pwInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    // Wait for the error message to be rendered in the DOM
    await waitFor(() => {
      const errorElement = screen.getByTestId('login-error');
      expect(errorElement).toBeInTheDocument();
      expect(errorElement).toHaveTextContent(`Error: ${errorMsg}`);
    }, { timeout: 2000 });
  });
});
