import React, { act, Suspense } from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-27 DIP B5 F9] 게시판 목록의 빈 상태 — 기간만 고른 0건은 '게시글이 아직 없습니다' 가 아니라
 * '선택한 기간에 해당하는 게시글이 없습니다' 다(G15). (준비물은 추천 pending 계약과 같다.)
 */
const mocks = vi.hoisted(() => ({
  params: new Map<string, string>([['bbsId', 'BBS-1']]),
  cancelQueries: vi.fn(),
  getQueryData: vi.fn(),
  invalidateQueries: vi.fn(),
  likeArticle: vi.fn(),
  push: vi.fn(),
  replace: vi.fn(),
  refresh: vi.fn(),
  setQueryData: vi.fn(),
  toast: vi.fn(),
  permissions: ['BOARD_CREATE', 'NOTICE_EDIT', 'FAQ_EDIT'],
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => ({ get: (key: string) => mocks.params.get(key) ?? null, toString: () => new URLSearchParams([...mocks.params]).toString() }),
  usePathname: () => '/admin/community/boards/select-board-list',
  useRouter: () => ({ push: mocks.push, replace: mocks.replace, refresh: mocks.refresh }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'USER', permissions: mocks.permissions, authorizationVersion: 'v1' } }) }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { likePost: mocks.likeArticle } }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav /> }));
vi.mock('@/hooks/api/use-board-list', () => ({
  useBoardList: () => ({
    data: { list: [], total: 0, totalPage: 0 },
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

async function renderList(requiredEditPermissions: string[] = []) {
  const initialData = {
    list: [],
    total: 0,
    totalPage: 0,
    masterInfo: { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST', requiredEditPermissions },
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

describe('BoardListClient empty state (DIP B5 F9 · G15)', () => {
  beforeEach(() => {
    mocks.permissions = ['BOARD_CREATE', 'NOTICE_EDIT', 'FAQ_EDIT'];
    vi.clearAllMocks();
    mocks.params = new Map([['bbsId', 'BBS-1']]);
  });

  it('지정 공지·FAQ에서는 두 추가 권한을 모두 가져야 글쓰기를 제공한다', async () => {
    mocks.permissions = ['BOARD_CREATE', 'NOTICE_EDIT'];
    await renderList(['NOTICE_EDIT', 'FAQ_EDIT']);
    expect(screen.queryByRole('button', { name: '글쓰기' })).not.toBeInTheDocument();
  });

  it('일반 게시판의 기존 작성 권한은 글쓰기를 계속 제공한다', async () => {
    mocks.permissions = ['BOARD_CREATE'];
    await renderList([]);
    expect(screen.getByRole('button', { name: '글쓰기' })).toBeVisible();
  });

  it('조건 없이 0건이면 게시글이 아직 없다고 말한다', async () => {
    await renderList();
    expect(screen.getByText('게시글이 아직 없습니다.')).toBeInTheDocument();
  });

  it('기간만 고른 0건은 조건에 맞는 글이 없다고 말하고 필터 초기화를 준다', async () => {
    mocks.params = new Map([['bbsId', 'BBS-1'], ['startDate', '2026-09-01'], ['endDate', '2026-09-10']]);
    await renderList();

    expect(screen.getByText('선택한 기간에 해당하는 게시글이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('게시글이 아직 없습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/community/boards/select-board-list?bbsId=BBS-1');
  });
});
