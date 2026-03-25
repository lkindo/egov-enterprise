import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import LoginPage from '../page';
import React from 'react';

// Mock dependencies
vi.mock('next/navigation', () => ({
 useRouter: () => ({
 push: vi.fn(),
 }),
 useSearchParams: () => ({
 get: vi.fn().mockReturnValue(null),
 }),
}));

const mockLogin = vi.fn();
vi.mock('@/contexts/AuthContext', () => ({
 useAuth: () => ({
 login: mockLogin,
 user: null,
 }),
}));

vi.mock('@/hooks/useMessage', () => ({
 useMessage: () => ({
 t: (key: string) => {
 const messages: Record<string, string> = {
 'login.title': 'Please sign in to your account',
 'login.idLabel': 'ID',
 'login.pwLabel': 'Password',
 'login.submit': 'Sign In',
 'login.errorEmpty': 'Please enter id and password',
 'login.errorFailed': 'Login failed',
 };
 return messages[key] || key;
 },
 }),
}));

// Mock Lucide icons
vi.mock('lucide-react', () => ({
 User: () => <div data-testid="user-icon" />,
 Lock: () => <div data-testid="lock-icon" />,
 Eye: () => <div data-testid="eye-icon" />,
 EyeOff: () => <div data-testid="eye-off-icon" />,
 LogIn: () => <div data-testid="login-icon" />,
}));

// Mock UI components
vi.mock('@/components/ui/card', () => ({
 Card: ({ children }: any) => <div data-testid="card">{children}</div>,
 CardHeader: ({ children }: any) => <div data-testid="card-header">{children}</div>,
 CardTitle: ({ children }: any) => <div data-testid="card-title">{children}</div>,
 CardDescription: ({ children }: any) => <div data-testid="card-description">{children}</div>,
 CardContent: ({ children }: any) => <div data-testid="card-content">{children}</div>,
 CardFooter: ({ children }: any) => <div data-testid="card-footer">{children}</div>,
}));

vi.mock('@/components/ui/button', () => ({
 Button: ({ children, onClick, type, isLoading, ariaLabel, 'aria-label': ariaLabelProp }: any) => (
 <button onClick={onClick} type={type} disabled={isLoading} aria-label={ariaLabelProp || ariaLabel}>
 {isLoading ? 'Loading...' : children}
 </button>
 ),
}));

vi.mock('@/components/ui/input', () => ({
 Input: ({ onChange, value, id, placeholder, type }: any) => (
 <input id={id} type={type} value={value} placeholder={placeholder} onChange={onChange} />
 ),
}));

vi.mock('@/components/ui/label', () => ({
 Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label>,
}));

vi.mock('@/components/ui/checkbox', () => ({
 Checkbox: ({ id }: any) => <input type="checkbox" id={id} />,
}));

describe('LoginPage', () => {
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

 it('shows error message if fields are empty', async () => {
 render(<LoginPage />);
 const submitButton = screen.getByRole('button', { name: /Sign In/i });
 
 fireEvent.click(submitButton);
 
 expect(screen.getByTestId('login-error')).toHaveTextContent('Please enter id and password');
 expect(mockLogin).not.toHaveBeenCalled();
 });

 it('calls login service with credentials', async () => {
 render(<LoginPage />);
 const idInput = screen.getByLabelText('ID');
 const pwInput = screen.getByLabelText('Password');
 const submitButton = screen.getByRole('button', { name: /Sign In/i });

 fireEvent.change(idInput, { target: { value: 'testuser' } });
 fireEvent.change(pwInput, { target: { value: 'password123' } });
 
 mockLogin.mockResolvedValueOnce({});
 
 fireEvent.click(submitButton);

 await waitFor(() => {
 expect(mockLogin).toHaveBeenCalledWith({ id: 'testuser', password: 'password123' });
 });
 });

 it('shows error message on login failure', async () => {
 render(<LoginPage />);
 const idInput = screen.getByLabelText('ID');
 const pwInput = screen.getByLabelText('Password');
 const submitButton = screen.getByRole('button', { name: /Sign In/i });

 fireEvent.change(idInput, { target: { value: 'baduser' } });
 fireEvent.change(pwInput, { target: { value: 'wrongpass' } });
 
 mockLogin.mockRejectedValueOnce(new Error('Invalid credentials'));
 
 fireEvent.click(submitButton);

 await waitFor(() => {
 expect(screen.getByTestId('login-error')).toHaveTextContent('Invalid credentials');
 });
 });

 it('toggles password visibility when eye icon is clicked', () => {
 render(<LoginPage />);
 const pwInput = screen.getByLabelText('Password');
 const toggleButton = screen.getByLabelText('login.viewPassword');

 expect(pwInput).toHaveAttribute('type', 'password');
 
 fireEvent.click(toggleButton);
 expect(pwInput).toHaveAttribute('type', 'text');
 
 fireEvent.click(screen.getByLabelText('login.hidePassword'));
 expect(pwInput).toHaveAttribute('type', 'password');
 });
});
