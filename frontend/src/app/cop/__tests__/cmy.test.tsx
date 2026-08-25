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

  it('서버가 실제로 읽는 파라미터로 조회한다(page/size/searchCnd/searchWrd)', async () => {
    renderWithClient(<CommunityHubClient initialData={mockInitialData} />);

    // [2026-08-24 A1 이행] 조회 조건이 WorkListPage 조회 조건 영역으로 올라가면서
    //   placeholder 의 말줄임표가 사라졌다. 검사 의도(1-base pageIndex 계약)는 그대로다.
    fireEvent.change(screen.getByPlaceholderText('커뮤니티 검색'), {
      target: { value: '보안' },
    });

    /*
     * [2026-08-25 실측 수정] 종전 단언은 `{ pageIndex, searchKeyword }` 였다. 그러나
     * CommunityApiController 는 Spring `Pageable`(page 0-based / size)과 `searchCnd`·`searchWrd`
     * 를 읽는다 — 두 값 모두 서버에 닿지 않았고, 이 테스트는 **동작하지 않는 계약을 green 으로
     * 고정하고 있었다**(클라이언트가 자기 관례를 스스로 확인한 셈이다).
     * 서버는 이름 검색을 `searchCnd === '0'` 분기로만 지원한다.
     */
    await waitFor(() => {
      expect(getCommunityListMock).toHaveBeenCalledWith({
        page: 0,
        size: 10,
        searchCnd: '0',
        searchWrd: '보안',
      });
    });
  });
});
