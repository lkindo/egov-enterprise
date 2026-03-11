import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import ProgramAdminClient from '../ProgramAdminClient';
import * as programActions from '@/app/actions/programActions';
import { useToast } from '@/app/components/ui/toast';
import { useConfirm } from '@/app/components/ui/confirm-modal';

// MOCK UI COMPONENTS
vi.mock('@/components/ui/button', () => ({ 
    Button: ({ children, onClick, type }: any) => <button type={type} onClick={onClick}>{children}</button> 
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
            <h2>{title}</h2>
            <button onClick={onClose}>Close</button>
            {children}
        </div>
    ) : null 
}));
vi.mock('@/app/components/ui/standard-form', () => ({ 
    StandardForm: ({ children, onSubmit }: any) => <form data-testid="standard-form" onSubmit={onSubmit}>{children}</form>, 
    FormField: ({ children }: any) => <div>{children}</div> 
}));
vi.mock('@/app/components/layout/page-header', () => ({ 
    PageHeader: ({ title, actions }: any) => <div><h1>{title}</h1>{actions}</div> 
}));
vi.mock('@/app/components/ui/ultimate-data-grid', () => ({ 
    UltimateDataGrid: ({ data, columns }: any) => (
        <table data-testid="data-grid">
            <thead>
                <tr>{columns.map((c: any) => <th key={c.id}>{c.header}</th>)}</tr>
            </thead>
            <tbody>
                {data.map((item: any, i: number) => (
                    <tr key={i}>
                        {columns.map((c: any) => <td key={c.id}>{c.accessor(item)}</td>)}
                    </tr>
                ))}
            </tbody>
        </table>
    ) 
}));
vi.mock('@/app/components/ui/standard-search-filter', () => ({ 
    SmartSearchPanel: ({ onSearch }: any) => (
        <div>
            <button onClick={() => onSearch({ searchWrd: 'test' })}>Search</button>
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
        content: [
            { progrmFileNm: 'PROG_1', progrmNm: 'Program One', url: '/url/1', progrmStrePath: '/path/1', progrmDc: 'Desc 1' },
            { progrmFileNm: 'PROG_2', progrmNm: 'Program Two', url: '/url/2', progrmStrePath: '/path/2', progrmDc: 'Desc 2' },
        ],
        totalElements: 2
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders the program list correctly', () => {
        render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        expect(screen.getByText('PROG_1')).toBeDefined();
        expect(screen.getByText('PROG_2')).toBeDefined();
        expect(screen.getByText('2 Units')).toBeDefined();
    });

    it('opens the deployment modal when "Deploy New Logic" is clicked', () => {
        render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        const deployBtn = screen.getByText(/Deploy New Logic/i);
        fireEvent.click(deployBtn);

        expect(screen.getByText(/Deploy System Entity/i)).toBeDefined();
        expect(screen.getByTestId('modal')).toBeDefined();
    });

    it('opens the edit modal with correct data when settings icon is clicked', () => {
        render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        
        // Find ST icons (Settings) and click the first one
        const settingsBtns = screen.getAllByText('ST');
        fireEvent.click(settingsBtns[0].closest('button')!);

        expect(screen.getByText(/Alter Logic Blueprint/i)).toBeDefined();
        const input = screen.getByPlaceholderText('E.g. SYSTEM_LOG_V1') as HTMLInputElement;
        expect(input.value).toBe('PROG_1');
        expect(input.disabled).toBe(true);
    });

    it('handles program deletion after confirmation', async () => {
        const mockConfirm = vi.fn().mockResolvedValue(true);
        vi.mocked(useConfirm).mockReturnValue(mockConfirm);
        vi.mocked(programActions.deleteProgramAction).mockResolvedValue({ success: true, message: 'Deleted successfully' });

        render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        
        const trashBtns = screen.getAllByText('T');
        fireEvent.click(trashBtns[0].closest('button')!);

        expect(mockConfirm).toHaveBeenCalled();
        await waitFor(() => {
            expect(programActions.deleteProgramAction).toHaveBeenCalledWith(null, 'PROG_1');
        });
    });

    it('handles saving a new program', async () => {
        vi.mocked(programActions.saveProgramAction).mockResolvedValue({ success: true, message: 'Saved successfully' });
        
        render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
        
        // Open modal
        fireEvent.click(screen.getByText(/Deploy New Logic/i));

        // Fill form
        fireEvent.change(screen.getByPlaceholderText('E.g. SYSTEM_LOG_V1'), { target: { value: 'NEW_PROG' } });
        fireEvent.change(screen.getByPlaceholderText('E.g. AUDIT TRAIL ENGINE'), { target: { value: 'New Program Name' } });

        // Submit form
        const submitBtn = screen.getByText(/Persist Logic Framework/i);
        fireEvent.click(submitBtn);

        await waitFor(() => {
            expect(programActions.saveProgramAction).toHaveBeenCalled();
        });
    });
});
