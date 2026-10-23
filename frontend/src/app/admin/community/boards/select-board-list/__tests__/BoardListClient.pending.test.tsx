import React, { act, Suspense } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  likeArticle: vi.fn(),
  push: vi.fn(),
  refresh: vi.fn(),
  setQueryData: vi.fn(),
  toast: vi.fn(),
  // [2026-10-23 ADR-0040 결정 6] 목록의 추천 단추는 추천 권한(BOARD_LIKE)으로 연다 — 시험마다 바꿀 수 있게 둔다.
  user: { role: 'USER', permissions: ['BOARD_LIKE'], authorizationVersion: 'v1' } as Record<string, unknown>,
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => key === 'bbsId' ? 'BBS-1' : null, toString: () => 'bbsId=BBS-1' }),
  usePathname: () => '/admin/community/boards/select-board-list',
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: mocks.user }) }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { likePost: mocks.likeArticle } }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav /> }));
vi.mock('@/hooks/api/use-board-list', () => ({
  useBoardList: () => ({
    data: {
      list: [{ pstSn: 71, pstTtl: '추천할 게시글', userNm: '작성자', inqCnt: 1, likeCnt: 4 }],
      total: 1,
      totalPage: 1,
    },
    isLoading: false,
    isError: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock('../components/BoardListFilters', () => ({ BoardListFilters: () => <div /> }));
vi.mock('../components/BoardPagination', () => ({ BoardPagination: () => <div /> }));
vi.mock('../components/BoardTemplates', () => {
  const Template = ({ list, handleLike, pendingLikePstSn, likesOpen }: any) => {
    const item = list[0];
    const anyPending = typeof pendingLikePstSn === 'number';
    const active = pendingLikePstSn === item.pstSn;
    return (
      <button
        type="button"
        disabled={anyPending}
        aria-busy={active || undefined}
        data-likes-open={String(likesOpen)}
        aria-label={active ? `${item.pstTtl} 추천 처리 중` : `${item.pstTtl} 추천`}
        onClick={(event) => handleLike(event, item.pstSn)}
      >
        {active ? '추천 처리 중…' : `추천 ${item.likeCnt}`}
      </button>
    );
  };
  return {
    HubTemplate: Template,
    GalleryTemplate: Template,
    QnaTemplate: Template,
    CalendarTemplate: Template,
    FaqTemplate: Template,
    WikiTemplate: Template,
    DefaultTemplate: Template,
    BoardSkeleton: () => <div />,
  };
});
vi.mock('@tanstack/react-query', () => ({
  useQueryClient: () => ({
    cancelQueries: mocks.cancelQueries,
    getQueryData: mocks.getQueryData,
    invalidateQueries: mocks.invalidateQueries,
    setQueryData: mocks.setQueryData,
  }),
  useMutation: ({ mutationFn, onMutate, onError, onSettled }: any) => {
    const mutateAsync = async (value: unknown) => {
      const context = await onMutate?.(value);
      try {
        return await mutationFn(value);
      } catch (error) {
        onError?.(error, value, context);
        throw error;
      } finally {
        onSettled?.();
      }
    };
    return {
      isPending: false,
      mutateAsync,
      mutate: (value: unknown) => { void mutateAsync(value).catch(() => undefined); },
    };
  },
}));

import { BoardListClient } from '../BoardListClient';

async function renderList(masterInfo: Record<string, unknown> = { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST' }) {
  const initialData = {
    list: [{ pstSn: 71, pstTtl: '추천할 게시글', userNm: '작성자', inqCnt: 1, likeCnt: 4 }],
    total: 1,
    totalPage: 1,
    masterInfo,
    fetchError: null,
  };
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>loading</div>}>
        <BoardListClient initialData={initialData as any} params={{ bbsId: 'BBS-1' }} />
      </Suspense>,
    );
  });
  return result;
}

describe('BoardListClient like pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getQueryData.mockReturnValue({ list: [] });
    mocks.likeArticle.mockResolvedValue(5);
    mocks.user = { role: 'USER', permissions: ['BOARD_LIKE'], authorizationVersion: 'v1' };
  });

  it('추천을 동기 선점해 같은 tick sink를 한 번만 호출하고 실패를 안내한 뒤 목록을 유지한다', async () => {
    let rejectLike!: (reason?: unknown) => void;
    mocks.likeArticle.mockReturnValueOnce(new Promise((_, reject) => {
      rejectLike = reject;
    }));
    await renderList();
    const like = await screen.findByRole('button', { name: '추천할 게시글 추천' });

    act(() => {
      fireEvent.click(like);
      fireEvent.click(like);
    });

    await waitFor(() => expect(mocks.likeArticle).toHaveBeenCalledTimes(1));
    expect(like).toBeDisabled();
    expect(like).toHaveAttribute('aria-busy', 'true');
    expect(like).toHaveAccessibleName('추천할 게시글 추천 처리 중');
    expect(like).toHaveTextContent('추천 처리 중');

    // 실제 transport 실패 형태 — 종전 서버 액션은 이것을 { success: false } 로 삼켜 사유가 보이지 않았다.
    rejectLike({ response: { status: 409, data: { message: '이미 추천한 게시글입니다.' } } });

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('이미 추천한 게시글입니다.', 'error'));
    expect(like).toBeInTheDocument();
    expect(like).not.toBeDisabled();
    expect(like).not.toHaveAttribute('aria-busy');
  });

  /*
    [2026-10-23 ADR-0040 결정 6·DEC-OPS-185] 추천 단추는 추천 권한(BOARD_LIKE)이 있고 게시판이 사용 중이며 추천을 받을 때만 연다.
    템플릿은 거짓이면 수만 보인다(BoardTemplates.like.test). 단추가 없는데 남은 경로로 요청이 나가지 않는 것도 본다.
  */
  it('추천 권한이 있고 사용 중이며 추천을 받는 게시판이면 추천을 연다', async () => {
    await renderList();
    expect(await screen.findByRole('button', { name: '추천할 게시글 추천' })).toHaveAttribute('data-likes-open', 'true');
  });

  it.each([
    ['추천 권한이 없으면', { role: 'USER', permissions: ['BOARD_READ'], authorizationVersion: 'v1' }, {}],
    ['권한 버전을 모르면', { role: 'USER', permissions: ['BOARD_LIKE'] }, {}],
    ['게시판이 추천을 받지 않으면', null, { rcmdtnUseYn: 'N' }],
    ['사용 안 함 게시판이면', null, { inUse: false }],
  ] as const)('%s 추천을 닫고 요청을 보내지 않는다', async (_case, user, meta) => {
    if (user) mocks.user = { ...user };
    await renderList({ bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST', ...meta });
    const like = await screen.findByRole('button', { name: '추천할 게시글 추천' });
    expect(like).toHaveAttribute('data-likes-open', 'false');

    fireEvent.click(like);
    await act(async () => {});
    expect(mocks.likeArticle).not.toHaveBeenCalled();
  });

});
