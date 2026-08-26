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
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => key === 'bbsId' ? 'BBS-1' : null, toString: () => 'bbsId=BBS-1' }),
  usePathname: () => '/admin/community/boards/select-board-list',
  useRouter: () => ({ push: mocks.push, refresh: mocks.refresh }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'USER' } }) }));
vi.mock('@/app/actions/boardActions', () => ({ likeBoardArticle: mocks.likeArticle }));
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
  const Template = ({ list, handleLike, pendingLikePstSn }: any) => {
    const item = list[0];
    const anyPending = typeof pendingLikePstSn === 'number';
    const active = pendingLikePstSn === item.pstSn;
    return (
      <button
        type="button"
        disabled={anyPending}
        aria-busy={active || undefined}
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

async function renderList() {
  const initialData = {
    list: [{ pstSn: 71, pstTtl: '추천할 게시글', userNm: '작성자', inqCnt: 1, likeCnt: 4 }],
    total: 1,
    totalPage: 1,
    masterInfo: { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST' },
    fetchError: null,
  };
  const dataPromise = Promise.resolve(initialData);
  let result!: ReturnType<typeof render>;
  await act(async () => {
    result = render(
      <Suspense fallback={<div>loading</div>}>
        <BoardListClient dataPromise={dataPromise} params={{ bbsId: 'BBS-1' }} />
      </Suspense>,
    );
    await dataPromise;
  });
  return result;
}

describe('BoardListClient like pending contract', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getQueryData.mockReturnValue({ list: [] });
    mocks.likeArticle.mockResolvedValue({ success: true });
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

    rejectLike(new Error('추천 서버 오류'));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('추천 서버 오류', 'error'));
    expect(like).toBeInTheDocument();
    expect(like).not.toBeDisabled();
    expect(like).not.toHaveAttribute('aria-busy');
  });
});
