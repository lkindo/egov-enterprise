import React, { act } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  joinCommunity: vi.fn(),
  toast: vi.fn(),
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
  communityUserService: { joinCommunity: mocks.joinCommunity },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@tanstack/react-query', () => ({
  useQuery: ({ initialData }: { initialData: unknown }) => ({ data: initialData }),
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
 * 없는 절차를 약속하지 않는다.
 *
 * ── 실측 ────────────────────────────────────────────────────────────────────
 * 가입은 `CommunityUser` 에 `mbrSttsCd='A'`(Requested) 행을 만든다. 그런데 저장소 전체에서
 * 이 값을 **읽거나 다른 상태로 옮기는 코드가 없다** — 승인 엔드포인트도, 승인 화면도,
 * 회원 목록 API 도 없다(`CommunityUserRepository.findByIdCmntySn` 은 main 소스 호출자 0건).
 *
 * 그런데 화면은 '관리자 승인 후 이용할 수 있습니다' 라고 말했고, 사이드바는 '가입 승인 필요 /
 * 내부 임직원 전용' 이라는 보안 정책을 표방했다(그 임직원 게이트도 없다 — 가입 API 는 인증
 * 사용자면 통과한다). 오지 않을 승인을 기다리라고 하면 사용자는 신청이 누락된 줄 알고 다시
 * 누르고, 서버는 409 를 돌려준다.
 *
 * 절차를 만드는 것은 별건이다(승인 API·화면 신설). 이 계약은 **그 절차가 생기기 전까지
 * 화면이 있다고 말하지 않는 것**을 고정한다.
 */
describe('커뮤니티 가입 — 없는 승인 절차를 약속하지 않는다', () => {
  beforeEach(() => {
    vi.clearAllMocks();
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

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('가입을 신청했습니다.', 'success'));
    const said = mocks.toast.mock.calls.map((call) => String(call[0])).join(' ');
    expect(said).not.toMatch(/승인 후 이용/);
  });

  it('집행되지 않는 보안 정책을 표방하지 않고 실제 상태를 말한다', () => {
    renderDetail();

    expect(screen.queryByText(/내부 임직원 전용/)).not.toBeInTheDocument();
    expect(screen.queryByText(/가입 승인 필요/)).not.toBeInTheDocument();
    expect(screen.getByText(/승인 처리 화면은 아직 없습니다/)).toBeInTheDocument();
  });
});
