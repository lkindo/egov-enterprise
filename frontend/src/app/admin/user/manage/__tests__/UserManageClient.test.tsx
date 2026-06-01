vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import React from 'react';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import UserManageClient from '../UserManageClient';
import { userAdminService } from '@/services/foundation/system/UserAdminService';

// MOCK UI COMPONENTS
vi.mock('@/components/ui/button', () => ({ 
  Button: ({ children, onClick, type, variant, className }: any) => (
    <button type={type} onClick={onClick} data-variant={variant} className={className}>{children}</button> 
  )
}));
vi.mock('@/components/ui/input', () => ({ 
  Input: (props: any) => <input {...props} /> 
}));
vi.mock('@/components/ui/badge', () => ({ Badge: ({ children, variant, className }: any) => <span className={className}>{children}</span> }));
vi.mock('@/components/ui/table', () => ({
  Table: ({ children }: any) => <table>{children}</table>,
  TableHeader: ({ children }: any) => <thead>{children}</thead>,
  TableBody: ({ children }: any) => <tbody>{children}</tbody>,
  TableRow: ({ children }: any) => <tr>{children}</tr>,
  TableHead: ({ children }: any) => <th>{children}</th>,
  TableCell: ({ children }: any) => <td>{children}</td>,
}));

// Mock Service
vi.mock('@/services/foundation/system/UserAdminService', () => ({
  userAdminService: {
    getUserList: vi.fn(),
  }
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('UserManageClient Component', () => {
  const mockData = {
    list: [
      { esntlId: '1', userId: 'user1', userNm: 'User One', emlAddr: 'user1@test.com', userSttsCd: 'A' },
      { esntlId: '2', userId: 'user2', userNm: 'User Two', emlAddr: 'user2@test.com', userSttsCd: 'P' },
    ],
    total: 2,
    page: 1,
    size: 10,
    totalPage: 1
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(userAdminService.getUserList).mockResolvedValue(mockData);
  });

  it('renders user list correctly from service', async () => {
    renderWithClient(<UserManageClient />);
    
    await waitFor(() => {
      expect(screen.getByText('User One')).toBeDefined();
      expect(screen.getByText('User Two')).toBeDefined();
    });
  });

  it('renders bento-style titles', async () => {
    renderWithClient(<UserManageClient />);
    expect(screen.getAllByText(/Security/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/사용자 관리/i)).toBeDefined();
  });

  it('contains the new creation button', async () => {
    renderWithClient(<UserManageClient />);
    expect(screen.getByText(/사용자 추가/i)).toBeDefined();
  });

  it('shows edit and delete buttons in each row', async () => {
    renderWithClient(<UserManageClient />);
    
    await waitFor(() => {
      const editIcons = screen.getAllByText('Edit2');
      const deleteIcons = screen.getAllByText('Trash2');
      expect(editIcons.length).toBe(2);
      expect(deleteIcons.length).toBe(2);
    });
  });
});
