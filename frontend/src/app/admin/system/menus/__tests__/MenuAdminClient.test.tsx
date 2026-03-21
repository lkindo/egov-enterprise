import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MenuAdminClient from '../MenuAdminClient';
import * as menuActions from '@/app/actions/menuActions';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';

// MOCK EVERY UI COMPONENT TO AVOID COMPACTION/SHADCN ISSUES
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick, className }: any) => <button onClick={onClick} className={className}>{children}</button> }));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/select', () => ({
 Select: ({ children, value, onValueChange }: any) => <div>{children}</div>,
 SelectContent: ({ children }: any) => <div>{children}</div>,
 SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
 SelectTrigger: ({ children }: any) => <div>{children}</div>,
 SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));
vi.mock('@/components/ui/label', () => ({ Label: ({ children }: any) => <label>{children}</label> }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: vi.fn() }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: vi.fn() }));
vi.mock('@/app/components/ui/standard-modal', () => ({ 
  StandardModal: ({ children, isOpen, title, footer }: any) => isOpen ? (
    <div data-testid="modal">
      <h2>{title}</h2>
      {children}
      <div data-testid="modal-footer">{footer}</div>
    </div>
  ) : null 
}));
vi.mock('@/app/components/ui/standard-form', () => ({ 
  StandardForm: ({ children, onSubmit }: any) => <form onSubmit={onSubmit}>{children}</form>, 
  FormField: ({ children, label }: any) => <div><label>{label}</label>{children}</div> 
}));
vi.mock('@/app/components/layout/page-header', () => ({ PageHeader: ({ title, actions }: any) => <div><h1>{title}</h1>{actions}</div> }));

vi.mock('lucide-react', () => ({
 Plus: () => <span>ICON_PLUS</span>,
 FolderTree: () => <span>ICON_FOLDER_TREE</span>,
 Settings: () => <span>ICON_SETTINGS</span>,
 Trash2: () => <span>ICON_TRASH</span>,
 ChevronRight: () => <span>ICON_CHEVRON_RIGHT</span>,
 FileCode: () => <span>ICON_FILE_CODE</span>,
 Layers: () => <span>ICON_LAYERS</span>,
 Link: () => <span>ICON_LINK</span>,
 CheckCircle2: () => <span>ICON_CHECK_CIRCLE</span>,
 ChevronsUpDown: () => <span>ICON_CHEVRONS_UP_DOWN</span>,
 ChevronsDownUp: () => <span>ICON_CHEVRONS_DOWN_UP</span>,
 Save: () => <span>ICON_SAVE</span>,
 ListTree: () => <span>ICON_LIST_TREE</span>,
 Info: () => <span>ICON_INFO</span>,
 X: () => <span>ICON_X</span>,
 Search: () => <span>ICON_SEARCH</span>,
 SearchCode: () => <span>ICON_SEARCH_CODE</span>,
 Activity: () => <span>ICON_ACTIVITY</span>,
 Box: () => <span>ICON_BOX</span>,
 Zap: () => <span>ICON_ZAP</span>,
 LayoutGrid: () => <span>ICON_LAYOUT_GRID</span>,
 ShieldCheck: () => <span>ICON_SHIELD_CHECK</span>,
 Network: () => <span>ICON_NETWORK</span>,
 Database: () => <span>ICON_DATABASE</span>,
 Home: () => <span>ICON_HOME</span>,
}));

vi.mock('@/app/actions/menuActions', () => ({ saveMenuAction: vi.fn(), updateMenuOrdersAction: vi.fn(), deleteMenuAction: vi.fn() }));

describe('MenuAdminClient Component', () => {
 const mockInitialMenus = [
 { menuNo: 1, menuNm: 'Main Menu', upperMenuNo: 0, upperMenuId: 0, menuOrdr: 1, progrmFileNm: 'prog1' },
 ];
 const mockPrograms = [{ progrmFileNm: 'prog1', progrmNm: 'Program 1' }];

 beforeEach(() => {
 vi.clearAllMocks();
 vi.mocked(useToast).mockReturnValue({ 
 toast: vi.fn(), 
 success: vi.fn(), 
 error: vi.fn(),
 removeToast: vi.fn(),
 info: vi.fn(),
 warning: vi.fn()
 } as any);
 vi.mocked(useConfirm).mockReturnValue(vi.fn());
 vi.stubGlobal('location', { reload: vi.fn() });
 });

 it('renders "Main Menu"', async () => {
 render(<MenuAdminClient initialMenus={mockInitialMenus} programs={mockPrograms} />);
 expect(screen.getByText('Main Menu')).toBeDefined();
 });

 it('opens create modal', async () => {
 render(<MenuAdminClient initialMenus={mockInitialMenus} programs={mockPrograms} />);
 const btn = screen.getByText(/최상위 메뉴 추가/i);
 fireEvent.click(btn);
 expect(await screen.findByText(/신규 네비게이션 노드 설계/i)).toBeDefined();
 });

 it('handles deletion', async () => {
 const mockConfirmFn = vi.fn().mockResolvedValue(true);
 vi.mocked(useConfirm).mockReturnValue(mockConfirmFn);
 vi.mocked(menuActions.deleteMenuAction).mockResolvedValue({ success: true, message: 'Deleted' });

 render(<MenuAdminClient initialMenus={mockInitialMenus} programs={mockPrograms} />);
 
 // Find trash button
 const trashBtn = screen.getByText('ICON_TRASH').closest('button')!;
 fireEvent.click(trashBtn);

 expect(mockConfirmFn).toHaveBeenCalled();
 await waitFor(() => {
 expect(menuActions.deleteMenuAction).toHaveBeenCalled();
 });
 });
});
