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
    get: vi.fn().mockReturnValue('/'),
  }),
}));

vi.mock('@/hooks/useMessage', () => ({
  useMessage: () => ({
    t: (key: string) => {
        const messages: Record<string, string> = {
            'login.title': '로그인',
            'login.idLabel': 'ID',
            'login.pwLabel': 'Password',
            'login.idPlaceholder': 'Username',
            'login.pwPlaceholder': 'Password',
            'login.rememberId': 'ID 저장',
            'login.submit': 'Sign In',
            'login.errorEmpty': 'Please enter id and password',
            'login.errorFailed': 'Invalid credentials',
            'login.viewPassword': 'View Password',
            'login.hidePassword': 'Hide Password'
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
    expect(screen.getByText('전자정부 엔터프라이즈')).toBeInTheDocument();
    expect(screen.getByLabelText('ID')).toBeInTheDocument();
    expect(screen.getByLabelText('Password')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Sign In/i })).toBeInTheDocument();
  });

  it('calls login service with credentials', async () => {
    mockLogin.mockResolvedValueOnce({});
    render(<LoginPage />);
    
    const idInput = screen.getByLabelText('ID');
    const pwInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(idInput, { target: { value: 'testuser' } });
    fireEvent.change(pwInput, { target: { value: 'password123' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockLogin).toHaveBeenCalledWith({ id: 'testuser', password: 'password123' });
    });
  });

  it('shows error message on login failure', async () => {
    mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
    render(<LoginPage />);
    
    const idInput = screen.getByLabelText('ID');
    const pwInput = screen.getByLabelText('Password');
    const submitButton = screen.getByRole('button', { name: /Sign In/i });

    fireEvent.change(idInput, { target: { value: 'baduser' } });
    fireEvent.change(pwInput, { target: { value: 'wrongpass' } });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid credentials');
    });
  });
});
