import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach } from 'vitest';
import React from 'react';

// 1. Mock Next.js config
vi.mock('next/config', () => ({
  default: () => ({ publicRuntimeConfig: {}, serverRuntimeConfig: {} }),
}));

// 2. Mock Lucide Icons - EXPLICITLY AND MANUALLY (NO PROXY)
vi.mock('lucide-react', () => {
  const R = require('react');
  const Icon = (name: string) => {
      const C = (props: any) => R.createElement('span', { ...props, 'data-testid': `icon-${name.toLowerCase()}` }, name);
      C.displayName = name;
      return C;
  };
  return {
    Plus: Icon('Plus'),
    Trash2: Icon('Trash2'),
    Settings: Icon('Settings'),
    Cpu: Icon('Cpu'),
    Box: Icon('Box'),
    SearchCode: Icon('SearchCode'),
    Link: Icon('Link'),
    Layers: Icon('Layers'),
    ShieldCheck: Icon('ShieldCheck'),
    Zap: Icon('Zap'),
    RefreshCcw: Icon('RefreshCcw'),
    Search: Icon('Search'),
    Activity: Icon('Activity'),
    Terminal: Icon('Terminal'),
    Globe: Icon('Globe'),
    FileCode: Icon('FileCode'),
    CheckCircle2: Icon('CheckCircle2'),
    ShieldAlert: Icon('ShieldAlert'),
    Database: Icon('Database'),
  };
});

// 3. Mock Next.js Navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), prefetch: vi.fn() }),
  useSearchParams: () => ({ get: vi.fn().mockReturnValue('') }),
}));

// 4. Mock UI components directly
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <div data-testid="hub-header"><h2>{title}</h2>{actions}</div>
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: any) => <div data-testid="section-card"><h3>{title}</h3>{children}</div>
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: any) => <div data-testid="page-header"><h1>{title}</h1></div>
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ children, isOpen, title, footer }: any) => isOpen ? (
    <div data-testid="standard-modal">
      <h2>{title}</h2>
      {children}
      <div data-testid="modal-footer">{footer}</div>
    </div>
  ) : null
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data }: any) => <div data-testid="data-table">{data?.length || 0} items</div>
}));

import ProgramAdminClient from '../ProgramAdminClient';

describe('ProgramAdminClient Component', () => {
  const mockInitialData = {
    list: [
      { progrmFileNm: 'PROG_1', progrmKoreanNm: '프로그램_하나', url: '/url/1', progrmStrePath: '/path/1', progrmDc: 'Desc 1' },
    ],
    total: 1
  } as any;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders correctly', () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    expect(screen.getByTestId('hub-header')).toBeInTheDocument();
  });

  it('opens registration modal', async () => {
    render(<ProgramAdminClient initialData={mockInitialData} searchWrd="" />);
    fireEvent.click(screen.getByText(/신규 등록/i));
    expect(screen.getByTestId('standard-modal')).toBeInTheDocument();
    expect(screen.getByText(/신규 프로그램 등록/i)).toBeInTheDocument();
  });
});
