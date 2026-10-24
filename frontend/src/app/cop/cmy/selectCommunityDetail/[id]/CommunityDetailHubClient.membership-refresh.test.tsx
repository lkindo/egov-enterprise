import React from 'react';
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/*
 * [2026-10-24] 실제 QueryClient 로 가입 직후의 상태 갱신을 본다(형제 시험은 React Query 를 목으로 바꿔 이 경합을 볼 수 없다).
 * 아직 데이터가 없는 조회가 진행 중이면 TanStack Query 는 무효화해도 새로 받지 않고 그 요청을 재사용한다. 화면을 열자마자 가입하면
 * 가입 전에 나간 조회의 NONE 이 최종 결과가 되어 '승인 대기' 대신 신청 버튼이 다시 보였다(PR #973 run 40071454996 의 E2E flaky).
 */
type Membership = { cmntySn: number; status: 'NONE' | 'REQUESTED' | 'MEMBER' | 'WITHDRAWN'; joinYmd: string | null };
const mocks = vi.hoisted(() => ({
  getMyMembership: vi.fn(),
  joinCommunity: vi.fn(),
  leaveCommunity: vi.fn(),
  toast: vi.fn(),
  confirm: vi.fn(),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: [], authorizationVersion: 'v1' } }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => <header><h1>{title}</h1>{actions}</header>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ children }: { children: React.ReactNode }) => <section>{children}</section>,
}));
vi.mock('@/components/ui/tooltip', () => ({ TooltipProvider: ({ children }: { children: React.ReactNode }) => children }));
vi.mock('@/services/business/user/community/CommunityUserService', () => ({
  communityUserService: {
    getCommunity: vi.fn(),
    joinCommunity: mocks.joinCommunity,
    leaveCommunity: mocks.leaveCommunity,
    getMyMembership: mocks.getMyMembership,
    getCommunityBoards: vi.fn(async () => []),
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

import CommunityDetailHubClient from './CommunityDetailHubClient';

const membership = (status: Membership['status']): Membership => ({ cmntySn: 9, status, joinYmd: null });

function renderDetail() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  render(
    <QueryClientProvider client={client}>
      <CommunityDetailHubClient cmntySn={9} initialData={{ cmntySn: 9, cmntyNm: '커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' } as never} />
    </QueryClientProvider>,
  );
}

describe('CommunityDetailHubClient membership refresh after join', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.joinCommunity.mockResolvedValue(undefined);
  });

  it('가입 전에 나간 첫 상태 조회가 아직 진행 중이어도 가입 뒤 상태를 새로 받아 승인 대기를 보인다', async () => {
    let resolveStale!: (value: Membership) => void;
    mocks.getMyMembership
      .mockReturnValueOnce(new Promise<Membership>((resolve) => { resolveStale = resolve; }))
      .mockResolvedValue(membership('REQUESTED'));
    renderDetail();
    await waitFor(() => expect(mocks.getMyMembership).toHaveBeenCalledTimes(1));

    // 상태를 아직 모르는 동안에도 신청 버튼은 열려 있다(컴포넌트 주석) — 첫 조회 응답 전에 누른다.
    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 가입 신청' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('가입을 신청했습니다. 관리자가 승인하면 회원이 됩니다.', 'success'));
    // 가입 전에 서버가 처리한 첫 조회는 NONE 이다 — 이 응답이 최종 결과가 되면 안 된다.
    await act(async () => { resolveStale(membership('NONE')); });

    expect(await screen.findByRole('status')).toHaveTextContent('가입 승인 대기 중');
    expect(mocks.getMyMembership).toHaveBeenCalledTimes(2);
    expect(screen.queryByRole('button', { name: '커뮤니티 가입 신청' })).toBeNull();
  });
});
