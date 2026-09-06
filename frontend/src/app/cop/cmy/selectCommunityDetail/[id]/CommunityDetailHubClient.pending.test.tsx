import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  joinCommunity: vi.fn(),
  getMyMembership: vi.fn(),
  toast: vi.fn(),
  invalidateQueries: vi.fn(),
  // [2026-09-06 DEC-OPS-043] useQuery 목은 queryKey 로 갈라 답한다 — 상세는 initialData, 내 멤버십은 여기 값.
  membership: undefined as undefined | { cmntySn: number; status: 'NONE' | 'REQUESTED' | 'MEMBER' | 'UNKNOWN'; joinYmd: string | null },
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
vi.mock('@/services/business/community/communityService', () => ({ communityService: { getCommunity: vi.fn() } }));
vi.mock('@/services/business/user/community/CommunityUserService', () => ({
  communityUserService: { joinCommunity: mocks.joinCommunity, getMyMembership: mocks.getMyMembership },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData, queryKey }: { initialData?: unknown; queryKey: unknown[] }) => (
    queryKey[0] === 'community-membership' ? { data: mocks.membership } : { data: initialData }
  ),
  useMutation: ({ mutationFn, onSuccess, onError }: any) => {
    const mutateAsync = async () => {
      try {
        const result = await mutationFn();
        onSuccess?.(result);
        return result;
      } catch (error) {
        onError?.(error);
        throw error;
      }
    };
    return {
      isPending: false,
      mutateAsync,
      mutate: () => { void mutateAsync().catch(() => undefined); },
    };
  },
}));

import CommunityDetailHubClient from './CommunityDetailHubClient';

describe('CommunityDetailHubClient join pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membership = undefined;
    mocks.joinCommunity.mockResolvedValue(undefined);
  });

  it('가입 신청을 같은 tick에 한 번만 보내고 실패를 안내한 뒤 상세 화면에서 재시도할 수 있다', async () => {
    let rejectJoin!: (reason?: unknown) => void;
    mocks.joinCommunity.mockReturnValueOnce(new Promise<void>((_, reject) => {
      rejectJoin = reject;
    }));
    render(
      <CommunityDetailHubClient
        cmntySn={9}
        initialData={{ cmntySn: 9, cmntyNm: '보존할 커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' } as any}
      />,
    );
    const join = screen.getByRole('button', { name: '커뮤니티 가입 신청' });

    act(() => {
      fireEvent.click(join);
      fireEvent.click(join);
    });

    expect(mocks.joinCommunity).toHaveBeenCalledTimes(1);
    expect(join).toBeDisabled();
    expect(join).toHaveAttribute('aria-busy', 'true');
    expect(join).toHaveAccessibleName('커뮤니티 가입 신청 중');
    expect(join).toHaveTextContent('신청 중');

    rejectJoin(new Error('가입 신청 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('가입 신청 서버 오류', 'error'));
    expect(screen.getByRole('heading', { name: '보존할 커뮤니티' })).toBeInTheDocument();
    expect(join).not.toBeDisabled();
    expect(join).not.toHaveAttribute('aria-busy');
  });
});

/**
 * 화면은 실제 절차만 말한다.
 *
 * ── 이력 ────────────────────────────────────────────────────────────────────
 * 2026-08-28 까지 가입은 `mbrSttsCd='A'` 행을 만들 뿐 그것을 읽거나 옮기는 코드가 저장소 전체에 없었고,
 * 그런데도 화면은 '관리자 승인 후 이용할 수 있습니다' 를 말했다. 그때 이 계약은 **없는 절차를 약속하지
 * 않는 것**을 고정했다.
 *
 * [2026-09-06 DEC-OPS-043] 승인·반려 API 와 관리자 화면('커뮤니티 관리 → 회원 관리')이 생겼다. 계약의
 * 방향은 같다 — 화면이 하는 말이 실제 절차와 일치해야 한다. 이제는 (1) 승인 절차를 말하되 회원이 되어도
 * 열리는 기능이 없으므로 '이용할 수 있다' 고는 말하지 않고, (2) 집행되지 않는 '내부 임직원 전용' 은 여전히
 * 표방하지 않으며, (3) 서버가 알려 준 멤버십 상태에 따라 신청 버튼을 상태 표시로 바꾼다(신청 중·회원에게
 * 다시 신청 버튼을 열어 두면 409 만 받는다).
 */
describe('커뮤니티 가입 — 화면은 실제 승인 절차만 말한다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.membership = undefined;
    mocks.joinCommunity.mockResolvedValue(undefined);
  });

  const renderDetail = () => render(
    <CommunityDetailHubClient
      cmntySn={9}
      initialData={{ cmntySn: 9, cmntyNm: '커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' } as any}
    />,
  );

  it('성공 안내가 오지 않을 승인을 기다리라고 하지 않는다', async () => {
    renderDetail();

    fireEvent.click(screen.getByRole('button', { name: '커뮤니티 가입 신청' }));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('가입을 신청했습니다. 관리자가 승인하면 회원이 됩니다.', 'success'));
    const said = mocks.toast.mock.calls.map((call) => String(call[0])).join(' ');
    // 회원이 되어도 열리는 기능이 아직 없다 — '이용' 을 약속하지 않는다.
    expect(said).not.toMatch(/이용/);
    // 신청 뒤 멤버십 상태를 다시 읽어 버튼을 상태 표시로 바꾼다.
    expect(mocks.invalidateQueries).toHaveBeenCalledWith({ queryKey: ['community-membership', 9] });
  });

  it('집행되지 않는 보안 정책을 표방하지 않고 실제 절차를 말한다', () => {
    renderDetail();

    expect(screen.queryByText(/내부 임직원 전용/)).not.toBeInTheDocument();
    expect(screen.queryByText(/가입 승인 필요/)).not.toBeInTheDocument();
    expect(screen.queryByText(/승인 처리 화면은 아직 없습니다/)).not.toBeInTheDocument();
    expect(screen.getByText(/관리자가 검토해 승인하거나 반려합니다/)).toBeInTheDocument();
    expect(screen.getByText(/회원 전용 기능은 아직 제공되지 않습니다/)).toBeInTheDocument();
  });

  it('승인 대기 중이면 신청 버튼 대신 상태를 보여 준다', () => {
    mocks.membership = { cmntySn: 9, status: 'REQUESTED', joinYmd: '20260906' };
    renderDetail();

    expect(screen.queryByRole('button', { name: /커뮤니티 가입 신청/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('가입 승인 대기 중');
    expect(screen.getByText(/관리자가 승인하면 회원이 됩니다/)).toBeInTheDocument();
  });

  it('회원이면 회원 상태를 보여 주고 신청 버튼을 열지 않는다', () => {
    mocks.membership = { cmntySn: 9, status: 'MEMBER', joinYmd: '20260801' };
    renderDetail();

    expect(screen.queryByRole('button', { name: /커뮤니티 가입 신청/ })).not.toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('회원');
    expect(screen.getByText(/이 커뮤니티의 회원입니다/)).toBeInTheDocument();
  });

  it('멤버십을 아직 모르거나(NONE) 조회 전이면 신청 버튼을 연다 — 조회 실패 하나로 가입 경로를 닫지 않는다', () => {
    mocks.membership = { cmntySn: 9, status: 'NONE', joinYmd: null };
    renderDetail();
    expect(screen.getByRole('button', { name: '커뮤니티 가입 신청' })).not.toBeDisabled();
  });
});
