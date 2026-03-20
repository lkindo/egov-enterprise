import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProgramAdminClient from '../ProgramAdminClient';
import * as programActions from '@/app/actions/programActions';
import { useConfirm } from '@/app/components/ui/confirm-modal';

// MOCK UI COMPONENTS
vi.mock('@/components/ui/button', () => ({ 
  Button: ({ children, onClick, type, className }: any) => (
    <button type={type} onClick={onClick} className={className}>{children}</button>
  ) 
}));
vi.mock('@/components/ui/input', () => ({ 
  Input: (props: any) => <input {...props} onChange={(e) => props.onChange?.(e)} /> 
}));
vi.mock('@/app/components/ui/toast', () => ({ 
  useToast: vi.fn(() => ({ toast: vi.fn() })) 
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ 
  useConfirm: vi.fn(() => vi.fn()) 
}));
vi.mock('@/app/components/ui/standard-modal', () => ({ 
  StandardModal: ({ children, isOpen, title, onClose }: any) => isOpen ? (
    <div data-testid="modal">
      <h2 data-testid="modal-title">{title}</h2>
      <button onClick={onClose}>닫기</button>
      {children}
    </div>
  ) : null 
}));
vi.mock('@/app/components/ui/standard-form', () => ({ 
  StandardForm: ({ children, onSubmit }: any) => <form data-testid="standard-form" onSubmit={onSubmit}>{children}</form>, 
  FormField: ({ children }: any) => <div>{children}</div> 
}));
vi.mock('@/app/components/layout/page-header', () => ({ 
  PageHeader: ({ title, actions }: any) => <div data-testid="page-header"><h1>{title}</h1>{actions}</div> 
}));

// Match the actual component's usage
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

vi.mock('@/app/components/ui/standard-search-filter', () => ({ 
  StandardSearchFilter: ({ onSearch }: any) => (
    <div data-testid="search-filter">
      <button onClick={() => onSearch({ searchWrd: 'test' })}>검색</button>
    </div>
  )
}));

vi.mock('lucide-react', () => ({
  Plus: () => <span>+</span>,
  Code: () => <span>C</span>,
  Globe: () => <span>G</span>,
  Trash2: () => <span>T</span>,
  Edit: () => <span>E</span>,
  Terminal: () => <span>TR</span>,
  Layers: () => <span>L</span>,
  Cpu: () => <span>CP</span>,
  Activity: () => <span>A</span>,
  FileCode: () => <span>FC</span>,
  Link: () => <span>LN</span>,
  ShieldCheck: () => <span>SC</span>,
  Search: () => <span>S</span>,
  Settings: () => <span>ST</span>,
  ChevronRight: () => <span>{'>'}</span>,
}));

vi.mock('@/app/actions/programActions', () => ({ 
  saveProgramAction: vi.fn(), 
  deleteProgramAction: vi.fn() 
}));

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

describe('ProgramAdminClient Component', () => {
  const mockInitialData = {
    list: [
      { progrmFileNm: 'PROG_1', progrmNm: 'Program One', url: '/url/1', progrmStrePath: '/path/1', progrmDc: 'Desc 1' },
      { progrmFileNm: 'PROG_2', progrmNm: 'Program Two', url: '/url/2', progrmStrePath: '/path/2', progrmDc: 'Desc 2' },
    ],
    total: 2
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders the program list correctly', () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    expect(screen.getAllByText('PROG_1').length).toBeGreaterThan(0);
    expect(screen.getAllByText('PROG_2').length).toBeGreaterThan(0);
    // Look for the count and unit together in the h4 heading
    const countElements = screen.getAllByText((_content, element) => {
      const hasText = (node: Element) => node.textContent?.replace(/\s+/g, ' ').trim() === '2 개';
      return element?.tagName.toLowerCase() === 'h4' && hasText(element);
    });
    expect(countElements.length).toBeGreaterThan(0);
  });

  it('opens the registration modal when "신규 프로그램 등록" is clicked', async () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    
    const header = screen.getByTestId('page-header');
    const deployBtn = within(header).getByText(/신규 프로그램 등록/i);
    fireEvent.click(deployBtn);

    const modal = await screen.findByTestId('modal');
    expect(within(modal).getByText('신규 프로그램 등록')).toBeDefined();
  });

  it('opens the edit modal with correct data when settings icon is clicked', async () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);

    const settingsBtns = screen.getAllByText('ST');
    fireEvent.click(settingsBtns[0]);

    const modal = await screen.findByTestId('modal');
    expect(within(modal).getByText('프로그램 정보 수정')).toBeDefined();
    
    const input = within(modal).getByPlaceholderText('예: SYSTEM_LOG_V1') as HTMLInputElement;
    expect(input.value).toBe('PROG_1');
    expect(input.disabled).toBe(true);
  });

  it('handles program deletion after confirmation', async () => {
    const mockConfirm = vi.fn().mockResolvedValue(true);
    vi.mocked(useConfirm).mockReturnValue(mockConfirm);
    vi.mocked(programActions.deleteProgramAction).mockResolvedValue({ success: true, message: 'Deleted successfully' });

    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    
    const trashBtns = screen.getAllByText('T');
    fireEvent.click(trashBtns[0]);

    expect(mockConfirm).toHaveBeenCalled();
    await waitFor(() => {
      expect(programActions.deleteProgramAction).toHaveBeenCalledWith(null, 'PROG_1');
    });
  });

  it('handles saving a new program', async () => {
    vi.mocked(programActions.saveProgramAction).mockResolvedValue({ success: true, message: 'Saved successfully' });
    
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    
    const header = screen.getByTestId('page-header');
    fireEvent.click(within(header).getByText(/신규 프로그램 등록/i));

    const modal = await screen.findByTestId('modal');

    const nameInput = within(modal).getByPlaceholderText('예: 감사 로그 관리');
    fireEvent.change(nameInput, { target: { value: 'New Program Name' } });

    const submitBtn = within(modal).getByText('등록하기');
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(programActions.saveProgramAction).toHaveBeenCalled();
    });
  });
});
