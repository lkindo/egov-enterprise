import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import MenuAdminClient from '../MenuAdminClient';
import * as menuActions from '@/app/actions/menuActions';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';

// MOCK EVERY UI COMPONENT TO AVOID COMPACTION/SHADCN ISSUES
vi.mock('@/components/ui/button', () => ({ Button: ({ children, onClick }: any) => <button onClick={onClick}>{children}</button> }));
vi.mock('@/components/ui/input', () => ({ Input: (props: any) => <input {...props} /> }));
vi.mock('@/components/ui/select', () => ({
  Select: ({ children }: any) => <div>{children}</div>,
  SelectContent: ({ children }: any) => <div>{children}</div>,
  SelectItem: ({ children, value }: any) => <div data-value={value}>{children}</div>,
  SelectTrigger: ({ children }: any) => <div>{children}</div>,
  SelectValue: ({ placeholder }: any) => <div>{placeholder}</div>,
}));
vi.mock('@/components/ui/label', () => ({ Label: ({ children }: any) => <label>{children}</label> }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: vi.fn() }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: vi.fn() }));
vi.mock('@/app/components/ui/standard-modal', () => ({ StandardModal: ({ children, isOpen, title }: any) => isOpen ? <div><h2>{title}</h2>{children}</div> : null }));
vi.mock('@/app/components/ui/standard-form', () => ({ StandardForm: ({ children, onSubmit }: any) => <form onSubmit={onSubmit}>{children}</form>, FormField: ({ children }: any) => <div>{children}</div> }));
vi.mock('@/app/components/layout/page-header', () => ({ PageHeader: ({ title, actions }: any) => <div><h1>{title}</h1>{actions}</div> }));
vi.mock('lucide-react', () => ({
    Plus: () => <span>+</span>,
    FolderTree: () => <span>F</span>,
    Settings: () => <span>S</span>,
    Trash2: () => <span>T</span>,
    ChevronRight: () => <span>{'>'}</span>,
    FileCode: () => <span>C</span>,
    Layers: () => <span>L</span>,
    Link: () => <span>I</span>,
    CheckCircle2: () => <span>V</span>,
    ChevronsUpDown: () => <span>UD</span>,
    ChevronsDownUp: () => <span>DU</span>,
    Save: () => <span>S</span>,
    ListTree: () => <span>LT</span>,
    Info: () => <span>I</span>,
    X: () => <span>X</span>,
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
        removeToast: vi.fn()
    });
    vi.mocked(useConfirm).mockReturnValue(vi.fn());
    vi.stubGlobal('location', { reload: vi.fn() });
  });

  it('renders "Main Menu"', async () => {
    render(<MenuAdminClient initialMenus={mockInitialMenus} programs={mockPrograms} />);
    expect(screen.getByText('Main Menu')).toBeDefined();
  });

  it('opens create modal', async () => {
    render(<MenuAdminClient initialMenus={mockInitialMenus} programs={mockPrograms} />);
    const btn = screen.getByText(/Create Root Domain/i);
    fireEvent.click(btn);
    expect(screen.getByText(/Define New Entity/i)).toBeDefined();
  });

  it('handles deletion', async () => {
    const mockConfirmFn = vi.fn().mockResolvedValue(true);
    vi.mocked(useConfirm).mockReturnValue(mockConfirmFn);
    vi.mocked(menuActions.deleteMenuAction).mockResolvedValue({ success: true, message: 'Deleted' });

    render(<MenuAdminClient initialMenus={mockInitialMenus} programs={mockPrograms} />);
    
    // Find trash button
    const trashBtn = screen.getByText('T').closest('button')!;
    fireEvent.click(trashBtn);

    expect(mockConfirmFn).toHaveBeenCalled();
    await waitFor(() => {
        expect(menuActions.deleteMenuAction).toHaveBeenCalled();
    });
  });
});
