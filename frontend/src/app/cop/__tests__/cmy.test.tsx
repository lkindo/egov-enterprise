vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import CommunityHubClient from '../cmy/selectCommunityList/CommunityHubClient';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Mock UI Components
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, highlight }: any) => <div>{title} {highlight}</div>
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: any) => <div><h2>{title}</h2>{children}</div>
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data }: any) => (
    <table>
      <tbody>
        {data.map((item: any) => (
          <tr key={item.cmmntyId}><td>{item.cmmntyNm}</td></tr>
        ))}
      </tbody>
    </table>
  )
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: () => null
}));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { retry: false }
  }
});

const renderWithClient = (ui: React.ReactElement) => {
  return render(
    <QueryClientProvider client={queryClient}>
      {ui}
    </QueryClientProvider>
  );
};

describe('CommunityHubClient', () => {
  const mockInitialData = {
    list: [
      {
        cmmntyId: 'CMM_0001',
        cmmntyNm: '개발자 커뮤니티',
        cmmntyIntrcn: '개발 관련 논의',
        frstRegisterNm: '테스트님',
        createdDate: '2024-05-01'
      }
    ],
    total: 1,
    totalPage: 1
  };

  it('renders list of communities from initialData', async () => {
    renderWithClient(<CommunityHubClient initialData={mockInitialData} />);
    
    await waitFor(() => {
      expect(screen.getByText('개발자 커뮤니티')).toBeDefined();
    });
  });
});
