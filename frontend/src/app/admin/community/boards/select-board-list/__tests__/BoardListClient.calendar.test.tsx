import React, { act, Suspense } from 'react';
import { render } from '@testing-library/react';
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
vi.mock('@/app/actions/boardActions', () => ({ likeBoardArticle: vi.fn() }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/layout/DynamicBreadcrumb', () => ({ DynamicBreadcrumb: () => <nav /> }));
vi.mock('@/hooks/api/use-board-list', () => ({ useBoardList: mocks.useBoardList }));
vi.mock('../components/BoardListFilters', () => ({ BoardListFilters: () => <div /> }));
vi.mock('../components/BoardPagination', () => ({ BoardPagination: () => <div /> }));
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
  const dataPromise = Promise.resolve(initialData as never);
  await act(async () => {
    render(
      <Suspense fallback={null}>
        <BoardListClient dataPromise={dataPromise} params={{ bbsId: 'BBS-1' }} />
      </Suspense>,
    );
    await dataPromise;
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
      pageUnit: 100,
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
    expect(params).toMatchObject({ pageUnit: 10, startDate: '2026-09-01' });
    expect(params).not.toHaveProperty('dateBasis');
    expect(params.endDate).toBeUndefined();
  });
});
