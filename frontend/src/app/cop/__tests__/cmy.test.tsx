vi.mock('next/config', () => ({
  default: () => ({
    publicRuntimeConfig: {},
    serverRuntimeConfig: {},
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: { id: 'test-user', userNm: '테스트' },
    loading: false,
    login: vi.fn(),
    logout: vi.fn(),
    checkAuth: vi.fn(),
  }),
}));

const { getCommunityListMock } = vi.hoisted(() => ({
  getCommunityListMock: vi.fn(),
}));

vi.mock('@/services/business/community/communityService', () => ({
  communityService: {
    getCommunityList: getCommunityListMock,
  },
}));

import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, it, expect, vi } from 'vitest';
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
  StandardDataTable: ({ columns, data }: any) => (
    <table>
      <tbody>
        {data.map((item: any) => (
          <tr key={item.cmntySn}>
            {columns.map((column: any, index: number) => (
              <td key={`${item.cmntySn}-${index}`}>{column.accessor(item)}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  )
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: () => null
}));

const renderWithClient = (ui: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

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
        cmntySn: 101,
        cmntyNm: '개발자 커뮤니티',
        cmntyIntroCn: '개발 관련 논의',
        frstRegisterNm: '테스트님',
        crtDt: '2024-05-01',
        frstRgtrId: 'test-user',
        useYn: 'Y',
      },
      {
        cmntySn: 102,
        cmntyNm: '보안 커뮤니티',
        cmntyIntroCn: '',
        frstRegisterNm: '다른 관리자',
        crtDt: '2024-06-01',
        frstRgtrId: 'other-user',
        useYn: 'Y',
      }
    ],
    total: 2,
    totalPage: 1
  };

  beforeEach(() => {
    getCommunityListMock.mockReset();
    getCommunityListMock.mockResolvedValue(mockInitialData);
  });

  it('renders community details from initialData', () => {
    renderWithClient(<CommunityHubClient initialData={mockInitialData} />);

    expect(screen.getByText('개발자 커뮤니티')).toBeInTheDocument();
    expect(screen.getByText('개발 관련 논의', { exact: false })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: '개발자 커뮤니티 상세 보기' }).closest('a'))
      .toHaveAttribute('href', '/cop/cmy/selectCommunityDetail/101');
    expect(screen.getByText('등록된 소개 정보가 없습니다.', { exact: false })).toBeInTheDocument();
  });

  it('filters the current page to communities managed by the signed-in user', () => {
    renderWithClient(<CommunityHubClient initialData={mockInitialData} />);

    fireEvent.click(screen.getByRole('button', { name: /관리 중인 공간/ }));

    expect(screen.getByText('개발자 커뮤니티')).toBeInTheDocument();
    expect(screen.queryByText('보안 커뮤니티')).not.toBeInTheDocument();
  });

  it('uses the one-based pageIndex contract when searching', async () => {
    renderWithClient(<CommunityHubClient initialData={mockInitialData} />);

    fireEvent.change(screen.getByPlaceholderText('커뮤니티 검색...'), {
      target: { value: '보안' },
    });

    await waitFor(() => {
      expect(getCommunityListMock).toHaveBeenCalledWith({
        pageIndex: 1,
        searchKeyword: '보안',
      });
    });
  });
});
