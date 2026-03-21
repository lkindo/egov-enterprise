import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
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
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children }: any) => <span>{children}</span> }));
vi.mock('@/app/components/ui/toast', () => ({ 
 useToast: vi.fn(() => ({ toast: vi.fn() })) 
}));
vi.mock('@/hooks/useMessage', () => ({ 
 useMessage: vi.fn(() => ({ t: (key: string) => key })) 
}));

vi.mock('lucide-react', () => ({
 Pencil: () => <span>ICON_PENCIL</span>,
 Trash2: () => <span>ICON_TRASH</span>,
 Plus: () => <span>ICON_PLUS</span>,
 Mail: () => <span>ICON_MAIL</span>,
 Users: () => <span>ICON_USERS</span>,
 ShieldCheck: () => <span>ICON_SHIELD_CHECK</span>,
 Clock: () => <span>ICON_CLOCK</span>,
 Search: () => <span>ICON_SEARCH</span>,
 Settings2: () => <span>ICON_SETTINGS2</span>,
 Filter: () => <span>ICON_FILTER</span>,
 UserCheck: () => <span>ICON_USER_CHECK</span>,
 UserX: () => <span>ICON_USER_X</span>,
 UserPlus: () => <span>ICON_USER_PLUS</span>,
 Fingerprint: () => <span>ICON_FINGERPRINT</span>,
 Zap: () => <span>ICON_ZAP</span>,
 LayoutGrid: () => <span>ICON_LAYOUT_GRID</span>,
 SearchCode: () => <span>ICON_SEARCH_CODE</span>,
 ShieldAlert: () => <span>ICON_SHIELD_ALERT</span>,
 Settings: () => <span>ICON_SETTINGS</span>,
 MoreHorizontal: () => <span>ICON_MORE_HORIZONTAL</span>,
 Home: () => <span>ICON_HOME</span>,
 ChevronRight: () => <span>ICON_CHEVRON_RIGHT</span>,
}));

vi.mock('@/app/components/ui/standard-modal', () => ({ 
  StandardModal: ({ children, isOpen, title, onClose, footer }: any) => isOpen ? (
    <div data-testid="dialog">
      <h2>{title}</h2>
      <button onClick={onClose}>CloseModal</button>
      {children}
      <div data-testid="modal-footer">{footer}</div>
    </div>
  ) : null 
}));

vi.mock('@/app/components/ui/standard-form', () => ({ 
  FormField: ({ children, label }: any) => (
    <div>
      <label>
        {label}
        {children}
      </label>
    </div>
  )
}));

vi.mock('@/app/components/ui/standard-data-table', () => ({ 
  StandardDataTable: ({ data, columns }: any) => (
    <table data-testid="data-table">
      <thead>
        <tr>{columns.map((c: any, i: number) => <th key={i}>{c.header}</th>)}</tr>
      </thead>
      <tbody>
        {data.map((item: any, i: number) => (
          <tr key={i}>
            {columns.map((c: any, j: number) => <td key={j}>{c.accessor(item)}</td>)}
          </tr>
        ))}
      </tbody>
    </table>
  ) 
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
 list: [
 { userId: 'user1', userNm: 'User One', email: 'user1@test.com', userSttusCode: 'A' },
 { userId: 'user2', userNm: 'User Two', email: 'user2@test.com', userSttusCode: 'P' },
 ],
 total: 2
 };
 const mockInitialParams = { searchKeyword: '', searchCondition: '0', sbscrbSttus: '', pageIndex: 1 };

 beforeEach(() => {
 vi.clearAllMocks();
 vi.stubGlobal('confirm', vi.fn(() => true));
 });

 it('renders user list correctly', () => {
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 expect(screen.getAllByText('user1').length).toBeGreaterThan(0);
 expect(screen.getAllByText('User Two').length).toBeGreaterThan(0);
 });

 it('opens create dialog when newUser button is clicked', async () => {
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 const createBtn = screen.getByText(/신규 멤버 프로비저닝/i);
 fireEvent.click(createBtn);

 const dialog = await screen.findByTestId('dialog');
 expect(dialog).toBeDefined();
 expect(within(dialog).getByText('신규 아이덴티티 프로비저닝')).toBeDefined();
 });

 it('opens edit dialog with user data when pencil icon is clicked', async () => {
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 
 const editBtns = screen.getAllByText('ICON_SETTINGS');
 fireEvent.click(editBtns[0].closest('button')!);

 const dialog = await screen.findByTestId('dialog');
 expect(dialog).toBeDefined();
 expect(within(dialog).getByText('사용자 아키텍트 명세 수정')).toBeDefined();
 
 const idInput = within(dialog).getByLabelText(/사용자 고유 식별 명칭/i) as HTMLInputElement;
 expect(idInput.value).toBe('user1');
 expect(idInput.readOnly).toBe(true);
 });

 it('handles user deletion after confirmation', async () => {
 vi.mocked(userActions.deleteUserAction).mockResolvedValue({ success: true, message: 'Deleted' });

 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 
 const deleteBtns = screen.getAllByText('ICON_TRASH');
 fireEvent.click(deleteBtns[0].closest('button')!);

 // The confirm modal is called internally by useConfirm
 await waitFor(() => {
   expect(userActions.deleteUserAction).toHaveBeenCalledWith(null, 'user1');
 });
 });

 it('handles user creation submission', async () => {
 vi.mocked(userActions.createUserAction).mockResolvedValue({ success: true, message: 'Created' });
 
 render(<UserManageClient initialData={mockInitialData} initialParams={mockInitialParams} />);
 
 // Open dialog
 fireEvent.click(screen.getByText(/신규 멤버 프로비저닝/i));

 const dialog = await screen.findByTestId('dialog');

 // Fill form
 fireEvent.change(within(dialog).getByLabelText(/사용자 고유 식별 명칭/i), { target: { value: 'newuser' } });
 fireEvent.change(within(dialog).getByLabelText(/사용자 성명/i), { target: { value: 'New User' } });
 fireEvent.change(within(dialog).getByLabelText(/인증 크리덴셜/i), { target: { value: 'password123' } });

 // Submit
 fireEvent.click(within(dialog).getByText('PROVISION_MEMBER'));

 await waitFor(() => {
 expect(userActions.createUserAction).toHaveBeenCalled();
 expect(mockRefresh).toHaveBeenCalled();
 });
 });
});
