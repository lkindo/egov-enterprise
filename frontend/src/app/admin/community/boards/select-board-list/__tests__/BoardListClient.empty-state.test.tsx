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

async function renderList(requiredEditPermissions: string[] = [], inUse = true) {
  const initialData = {
    list: [],
    total: 0,
    totalPage: 0,
    masterInfo: { bbsTtl: '테스트 게시판', tmpltId: 'TMPLT_LIST', requiredEditPermissions, inUse },
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

  // [2026-10-23 ADR-0040 결정 1] 사용 안 함 게시판의 목록은 조회 대행 권한자에게만 열린다 — 이용자 화면과 구별되게 알린다.
  it('사용 안 함 게시판이면 운영자에게만 열려 있다고 알리고, 사용 중이면 알리지 않는다', async () => {
    await renderList([], false);
    expect(screen.getByRole('note')).toHaveTextContent('사용 안 함 게시판입니다. 이용자에게 닫혀 있고, 운영자는 글을 정리할 수 있습니다.');
  });

  it('사용 중인 게시판에는 사용 안 함 표지가 없다', async () => {
    await renderList();
    expect(screen.queryByText(/사용 안 함 게시판입니다/)).toBeNull();
  });

  // [2026-10-26 ADR-0043 UX-15] 글쓰기는 링크 하나다(종전 Link > button 은 초점이 두 번 걸렸다). 부재 단언은 역할을 가리지 않고 이름으로
  //   본다 — 역할만 바뀌어 부재가 저절로 성립하지 않게 한다.
  const writeEntry = () => screen.queryByText('글쓰기')?.closest('a, button') ?? null;

  it('지정 공지·FAQ에서는 두 추가 권한을 모두 가져야 글쓰기를 제공한다', async () => {
    mocks.permissions = ['BOARD_CREATE', 'NOTICE_EDIT'];
    await renderList(['NOTICE_EDIT', 'FAQ_EDIT']);
    expect(writeEntry()).toBeNull();
  });

  it('일반 게시판의 기존 작성 권한은 글쓰기를 계속 제공한다', async () => {
    mocks.permissions = ['BOARD_CREATE'];
    await renderList([]);
    const write = screen.getByRole('link', { name: '글쓰기' });
    expect(write).toBeVisible();
    expect(write).toHaveAttribute('href', '/admin/community/boards/insert-board-article?bbsId=BBS-1');
    expect(write.querySelector('button')).toBeNull();
  });

  // [2026-10-26 ADR-0043 NAV-03] 서버가 사용 안 함 게시판의 새 글을 거부한다(ADR-0040 결정 1) — 열어 두면 막다른 길이다.
  it('사용 안 함 게시판에서는 작성 권한이 있어도 글쓰기를 두지 않는다', async () => {
    mocks.permissions = ['BOARD_CREATE'];
    await renderList([], false);
    expect(writeEntry()).toBeNull();
  });

  it('조건 없이 0건이면 게시글이 아직 없다고 말한다', async () => {
    await renderList();
    expect(screen.getByText('게시글이 아직 없습니다.')).toBeInTheDocument();
    expect(screen.getByText(/게시글이 등록되어 있습니다/)).toHaveTextContent('총 0개의 게시글이 등록되어 있습니다.');
  });

  it('기간만 고른 0건은 조건에 맞는 글이 없다고 말하고 필터 초기화를 준다', async () => {
    mocks.params = new Map([['bbsId', 'BBS-1'], ['startDate', '2026-09-01'], ['endDate', '2026-09-10']]);
    await renderList();

    // [2026-10-26 ADR-0043 UX-15] 조건이 걸린 수는 게시판 전체가 아니라 검색 결과다.
    expect(screen.getByText(/검색 결과/)).toHaveTextContent('검색 결과 0건');
    expect(screen.queryByText(/게시글이 등록되어 있습니다/)).toBeNull();

    expect(screen.getByText('선택한 기간에 해당하는 게시글이 없습니다.')).toBeInTheDocument();
    expect(screen.queryByText('게시글이 아직 없습니다.')).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: '필터 초기화' }));
    expect(mocks.replace).toHaveBeenCalledWith('/admin/community/boards/select-board-list?bbsId=BBS-1');
  });
});
