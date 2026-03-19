import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import UserManageClient from '../UserManageClient';
import * as userActions from '@/app/actions/userActions';
import { useToast } from '@/app/components/ui/toast';
import { useMessage } from '@/hooks/useMessage';

// MOCK UI COMPONENTS
vi.mock('@/components/ui/button', () => ({ 
 Button: ({ children, onClick, type, variant }: any) => <button type={type} onClick={onClick} data-variant={variant}>{children}</button> 
}));
vi.mock('@/components/ui/input', () => ({ 
 Input: (props: any) => <input {...props} /> 
}));
vi.mock('@/components/ui/dialog', () => ({
 Dialog: ({ children, open, onOpenChange }: any) => open ? <div data-testid="dialog">{children}<button onClick={() => onOpenChange(false)}>CloseModal</button></div> : null,
 DialogContent: ({ children }: any) => <div>{children}</div>,
 DialogHeader: ({ children }: any) => <div>{children}</div>,
 DialogTitle: ({ children }: any) => <h2>{children}</h2>,
 DialogFooter: ({ children }: any) => <div>{children}</div>,
}));
vi.mock('@/components/ui/label', () => ({ Label: ({ children, htmlFor }: any) => <label htmlFor={htmlFor}>{children}</label> }));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
vi.mock('@/app/components/ui/toast', () => ({ 
 useToast: vi.fn(() => ({ toast: vi.fn() })) 
}));
vi.mock('@/hooks/useMessage', () => ({ 
 useMessage: vi.fn(() => ({ t: (key: string) => key })) 
}));

// Mock StandardAdminLayout and its sub-components
vi.mock('@/app/components/layout/StandardAdminLayout', () => ({ 
 StandardAdminLayout: ({ children, title, actionButton, data, columns }: any) => (
 <div>
 <h1>{title}</h1>
 {actionButton}
 <table data-testid="user-table">
 <tbody>
 {(data || []).map((item: any, i: number) => (
 <tr key={item.userId || i}>
 {columns.map((c: any) => (
 <td key={c.id}>
 {typeof c.accessor === 'function' ? c.accessor(item) : item[c.accessor]}
 </td>
 ))}
 </tr>
 ))}
 </tbody>
 </table>
 {children}
 </div>
 ) 
}));

vi.mock('lucide-react', () => ({
 Pencil: () => <span>P</span>,
 Trash2: () => <span>T</span>,
 Plus: () => <span>+</span>,
 Mail: () => <span>M</span>,
}));

vi.mock('@/app/actions/userActions', () => ({ 
 createUserAction: vi.fn(), 
 updateUserAction: vi.fn(), 
 deleteUserAction: vi.fn() 
}));

const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
 useRouter: () => ({
 push: vi.fn(),
 refresh: mockRefresh,
 }),
}));

describe('UserManageClient Component', () => {
 const mockInitialData = {
 list: [ // Changed from resultList to list to match implementation
 { userId: 'user1', userNm: 'User One', email: 'user1@test.com', userSttusCode: 'A' },
 { userId: 'user2', userNm: 'User Two', email: 'user2@test.com', userSttusCode: 'P' },
 ],
 total: 2
 };
 const mockInitialParams = { searchKeyword: '', searchCondition: '0', sbscrbSttus: '', page번호: 1 };

 beforeEach(() => {
 vi.clearAllMocks();
 vi.stubGlobal('confirm', vi.fn(() => true));
 });

 it('renders user list correctly', () => {
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 expect(screen.getByText('user1')).toBeDefined();
 expect(screen.getByText('User Two')).toBeDefined();
 });

 it('opens create dialog when newUser button is clicked', () => {
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 const createBtn = screen.getByText(/\+/).closest('button')!;
 fireEvent.click(createBtn);

 expect(screen.getByTestId('dialog')).toBeDefined();
 const titles = screen.getAllByText('admin.user.newUser');
 expect(titles.length).toBeGreaterThan(0);
 });

 it('opens edit dialog with user data when pencil icon is clicked', () => {
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 
 const editBtns = screen.getAllByText('P');
 fireEvent.click(editBtns[0].closest('button')!);

 expect(screen.getByTestId('dialog')).toBeDefined();
 expect(screen.getByText('admin.user.updateUser')).toBeDefined();
 
 const idInput = screen.getByLabelText('admin.user.id') as HTMLInputElement;
 expect(idInput.value).toBe('user1');
 expect(idInput.disabled).toBe(true);
 });

 it('handles user deletion after confirmation', async () => {
 vi.mocked(userActions.deleteUserAction).mockResolvedValue({ success: true, message: 'Deleted' });

 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 
 const deleteBtns = screen.getAllByText('T');
 fireEvent.click(deleteBtns[0].closest('button')!);

 expect(window.confirm).toHaveBeenCalled();
 await waitFor(() => {
 expect(userActions.deleteUserAction).toHaveBeenCalledWith(null, 'user1');
 });
 });

 it('handles user creation submission', async () => {
 vi.mocked(userActions.createUserAction).mockResolvedValue({ success: true, message: 'Created' });
 
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 
 // Open dialog
 fireEvent.click(screen.getByText(/\+/).closest('button')!);

 // Fill form
 fireEvent.change(screen.getByLabelText('admin.user.id'), { target: { value: 'newuser' } });
 fireEvent.change(screen.getByLabelText('admin.user.name'), { target: { value: 'New User' } });
 fireEvent.change(screen.getByLabelText('login.pwLabel'), { target: { value: 'password123' } });

 // Submit
 fireEvent.click(screen.getByText('common.confirm'));

 await waitFor(() => {
 expect(userActions.createUserAction).toHaveBeenCalled();
 expect(mockRefresh).toHaveBeenCalled();
 });
 });
});
