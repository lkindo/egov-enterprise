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
