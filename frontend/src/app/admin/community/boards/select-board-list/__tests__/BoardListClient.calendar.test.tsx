import React, { act, Suspense } from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

/**
 * [2026-09-26 DIP V6] 캘린더 템플릿의 조회 조건.
 *
 * 달력은 칸을 행사일로 배치한다. 조회도 같은 날짜로, 보이는 달의 첫날~마지막 날을 한 번에 받아야
 * 지난달에 등록한 이달 행사가 사라지지 않고 11번째 일정부터 잘리지 않는다.
 */
const mocks = vi.hoisted(() => ({
  useBoardList: vi.fn(),
  search: 'bbsId=BBS-1&startDate=2026-09-01',
}));

vi.mock('next/navigation', () => ({
  useSearchParams: () => {
    const params = new URLSearchParams(mocks.search);
    return { get: (key: string) => params.get(key), toString: () => params.toString() };
  },
  usePathname: () => '/admin/community/boards/select-board-list',
  useRouter: () => ({ push: vi.fn(), replace: vi.fn(), refresh: vi.fn() }),
}));
vi.mock('next/link', () => ({
  default: ({ children, ...props }: React.AnchorHTMLAttributes<HTMLAnchorElement>) => <a {...props}>{children}</a>,
}));
vi.mock('@/contexts/AuthContext', () => ({ useAuth: () => ({ user: { role: 'USER' } }) }));
vi.mock('@/services/business/user/board/BoardUserService', () => ({ boardUserService: { likePost: vi.fn() } }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav /> }));
vi.mock('@/hooks/api/use-board-list', () => ({ useBoardList: mocks.useBoardList }));
vi.mock('../components/BoardListFilters', () => ({
  BoardListFilters: ({ showPeriod }: { showPeriod?: boolean }) => <div data-testid="filters" data-show-period={String(showPeriod ?? true)} />,
}));
vi.mock('../components/BoardPagination', () => ({ BoardPagination: () => <div data-testid="pagination" /> }));
vi.mock('../components/BoardTemplates', () => {
  const Template = () => <div data-testid="template" />;
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
  useQueryClient: () => ({ cancelQueries: vi.fn(), getQueryData: vi.fn(), invalidateQueries: vi.fn(), setQueryData: vi.fn() }),
  useMutation: () => ({ isPending: false, mutateAsync: vi.fn(), mutate: vi.fn() }),
}));

import { BoardListClient } from '../BoardListClient';

async function renderList(tmpltId: string) {
  const initialData = {
    list: [],
    total: 0,
    totalPage: 0,
    masterInfo: { bbsId: 'BBS-1', bbsTtl: '행사 게시판', tmpltId },
    fetchError: null,
  };
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <BoardListClient initialData={initialData as never} params={{ bbsId: 'BBS-1' }} />
      </Suspense>,
    );
  });
}

describe('캘린더 템플릿 조회 조건 (DIP V6)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.search = 'bbsId=BBS-1&startDate=2026-09-01';
    mocks.useBoardList.mockReturnValue({
      data: { list: [], total: 0, totalPage: 0 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
  });

  it('🚨 보이는 달의 첫날~마지막 날을 행사일 기준으로 한 번에 받는다 — SSR 첫 목록을 쓰지 않는다', async () => {
    await renderList('TMPLT_CALENDAR');

    const [params, initialData] = mocks.useBoardList.mock.calls.at(-1)!;
    expect(params).toMatchObject({
      page: 1,
      size: 100,
      startDate: '2026-09-01',
      endDate: '2026-09-30',
      dateBasis: 'EVENT',
    });
    expect(initialData).toBeUndefined();
  });

  it('달 시작일이 달 중간이어도 그 달 전체를 본다', async () => {
    mocks.search = 'bbsId=BBS-1&startDate=2026-02-14';
    await renderList('TMPLT_CALENDAR');

    expect(mocks.useBoardList.mock.calls.at(-1)![0]).toMatchObject({
      startDate: '2026-02-01',
      endDate: '2026-02-28',
    });
  });

  it('대조군: 일반 목록은 종전 그대로 작성일 기준 10건 페이지다', async () => {
    await renderList('TMPLT_LIST');

    const [params] = mocks.useBoardList.mock.calls.at(-1)!;
    expect(params).toMatchObject({ size: 10, startDate: '2026-09-01' });
    expect(params).not.toHaveProperty('dateBasis');
    expect(params.endDate).toBeUndefined();
  });

  /*
    [2026-10-26 ADR-0043 UX-13] 캘린더는 한 달을 한 번에 받는다 — 쪽 이동은 늘 1쪽이라 뜻이 없고, 기간 선택의 시작일은 보이는 달을
    바꿔 달 이동과 서로 덮었다. 달 이동만 남긴다. 머리의 수는 게시판 전체가 아니라 보이는 달의 일정 수다.
  */
  it('캘린더에서는 쪽 이동과 기간 선택을 두지 않고 머리에 이 달의 일정 수를 말한다', async () => {
    mocks.useBoardList.mockReturnValue({
      data: { list: [], total: 7, totalPage: 1 },
      isLoading: false,
      isError: false,
      error: null,
      refetch: vi.fn(),
    });
    await renderList('TMPLT_CALENDAR');

    expect(screen.queryByTestId('pagination')).toBeNull();
    expect(screen.getByTestId('filters')).toHaveAttribute('data-show-period', 'false');
    expect(screen.getByText(/이 달의 일정/)).toHaveTextContent('이 달의 일정 7건');
  });

  // 달 이동은 달력 안에 있다 — 빈 달을 '게시글 없음' 빈 상태로 바꾸면 다른 달로 갈 길이 없다(캘린더는 기간 선택도 두지 않는다).
  it('일정이 없는 달에도 달력(달 이동)을 그리고 빈 달이라고 말한다', async () => {
    await renderList('TMPLT_CALENDAR');

    expect(screen.getByTestId('template')).toBeInTheDocument();
    expect(screen.getByRole('status')).toHaveTextContent('이 달에 등록된 일정이 없습니다. 이전 달·다음 달로 옮겨 볼 수 있습니다.');
    expect(screen.queryByText('게시글이 아직 없습니다.')).toBeNull();
  });

  it('대조군: 일반 목록은 쪽 이동과 기간 선택을 둔다', async () => {
    await renderList('TMPLT_LIST');

    expect(screen.getByTestId('pagination')).toBeInTheDocument();
    expect(screen.getByTestId('filters')).toHaveAttribute('data-show-period', 'true');
  });
});
