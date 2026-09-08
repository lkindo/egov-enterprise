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
  // [2026-09-08 PD-CMTY-001] 커뮤니티 귀속 게시판.
  getCommunityBoards: vi.fn(),
  boards: undefined as undefined | Array<{ bbsId: string; bbsTtl: string | null; bbsExpln: string | null }>,
  boardsEnabled: undefined as undefined | boolean,
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
  communityUserService: {
    joinCommunity: mocks.joinCommunity,
    getMyMembership: mocks.getMyMembership,
    getCommunityBoards: mocks.getCommunityBoards,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({ invalidateQueries: mocks.invalidateQueries }),
  useQuery: ({ initialData, queryKey, enabled }: { initialData?: unknown; queryKey: unknown[]; enabled?: boolean }) => {
    if (queryKey[0] === 'community-membership') return { data: mocks.membership };
    if (queryKey[0] === 'community-boards') {
      // 회원이 아닐 때 서버가 403 을 줄 것이 확실한 요청을 보내지 않는다 — enabled 를 기록해 단언한다.
      mocks.boardsEnabled = enabled;
      return { data: mocks.boards, isLoading: false, error: undefined };
    }
    return { data: initialData };
  },
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
    mocks.boards = undefined;
    mocks.boardsEnabled = undefined;
    mocks.joinCommunity.mockResolvedValue(undefined);
    mocks.getCommunityBoards.mockResolvedValue([]);
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
    mocks.boards = undefined;
    mocks.boardsEnabled = undefined;
    mocks.joinCommunity.mockResolvedValue(undefined);
    mocks.getCommunityBoards.mockResolvedValue([]);
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
    // 아직 승인되지 않은 시점의 안내다 — 신청 직후에 '이용' 을 약속하지 않는다.
    //   (회원이 되면 무엇이 열리는지는 사이드바 안내가 소유한다.)
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
    /*
      [2026-09-08 PD-CMTY-001] 종전에는 '회원 전용 기능은 아직 제공되지 않습니다' 를 고정했다 —
      회원이 되어도 열리는 것이 없었기 때문이다(GAP-CMTY-001). 이제 회원 전용 게시판이 실제로
      생겼으므로 그 문장은 거짓이 됐다. 약속을 지우는 게 아니라 **지킬 수 있게 된 약속으로**
      바꾼다 — 이 단언이 그 사실을 계속 붙잡는다(다시 미제공으로 되돌리면 red).
    */
    expect(screen.getByText(/회원이 되면 이 커뮤니티에 귀속된 게시판을 이용할 수 있습니다/)).toBeInTheDocument();
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

  /*
    [2026-09-08 PD-CMTY-001] 커뮤니티 귀속 게시판 — 회원 자격이 처음으로 여는 기능.

    그 전까지 이 섹션은 아무 조회도 하지 않고 '아직 제공되지 않습니다' 라고만 말했다
    (GAP-CMTY-001 — cmnty_sn 을 읽는 코드가 저장소 전체에 0). 여기서 고정하는 것은
    "회원에게만 보인다" 와 "회원이 아니면 조회 자체를 하지 않는다" 둘이다.
  */
  describe('커뮤니티 귀속 게시판', () => {
    function renderDetail() {
      return render(
        <CommunityDetailHubClient
          cmntySn={9}
          initialData={{ cmntySn: 9, cmntyNm: '커뮤니티', cmntyIntroCn: '소개', useYn: 'Y' } as any}
        />,
      );
    }

    it('회원이 아니면 목록 대신 사유를 말하고 조회하지 않는다', () => {
      mocks.membership = { cmntySn: 9, status: 'NONE', joinYmd: null };
      renderDetail();

      expect(screen.getByText('이 커뮤니티의 게시판은 승인된 회원만 볼 수 있습니다.')).toBeVisible();
      expect(mocks.boardsEnabled).toBe(false);
    });

    it('승인 대기 중이면 기다리는 중이라고 말한다 — 거절당한 것처럼 읽히지 않게 한다', () => {
      mocks.membership = { cmntySn: 9, status: 'REQUESTED', joinYmd: '20260908' };
      renderDetail();

      expect(screen.getByText('가입 승인을 기다리는 중입니다. 승인되면 이 커뮤니티의 게시판이 보입니다.')).toBeVisible();
      expect(mocks.boardsEnabled).toBe(false);
    });

    it('회원이면 게시판 목록을 그 게시판으로 가는 링크로 보여 준다', () => {
      mocks.membership = { cmntySn: 9, status: 'MEMBER', joinYmd: '20260801' };
      mocks.boards = [{ bbsId: 'BBSMSTR_CMNTY01', bbsTtl: '회원 게시판', bbsExpln: '회원만 씁니다' }];
      renderDetail();

      const link = screen.getByRole('link', { name: /회원 게시판/ });
      expect(link).toHaveAttribute('href', '/admin/community/boards/select-board-list?bbsId=BBSMSTR_CMNTY01');
      expect(mocks.boardsEnabled).toBe(true);
    });

    it('회원인데 게시판이 없으면 없다고 말한다 — 못 본다는 안내와 구분한다', () => {
      mocks.membership = { cmntySn: 9, status: 'MEMBER', joinYmd: '20260801' };
      mocks.boards = [];
      renderDetail();

      expect(screen.getByText('이 커뮤니티에 등록된 게시판이 없습니다.')).toBeVisible();
      expect(screen.queryByText('이 커뮤니티의 게시판은 승인된 회원만 볼 수 있습니다.')).toBeNull();
    });
  });
});
