import { act, render, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnlinePollAdminClient from '../OnlinePollAdminClient';

type Pagination = { currentPage: number; onPageChange: (page: number) => void; onPageSizeChange: (size: number) => void };

const mocks = vi.hoisted(() => ({
  replace: vi.fn(),
  list: vi.fn(),
  query: '',
  pagination: undefined as Pagination | undefined,
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['POLL_READ', 'POLL_READ_ALL'], authorizationVersion: 'poll-url-test-v1' } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: mocks.replace }),
  usePathname: () => '/admin/survey/polls',
  useSearchParams: () => new URLSearchParams(mocks.query),
}));
vi.mock('@/services/business/user/poll/PollUserService', () => ({
  pollUserService: { getPollList: mocks.list, createPoll: vi.fn() },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ children }: { children: React.ReactNode }) => <main>{children}</main>,
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ pagination }: { pagination: Pagination }) => {
    mocks.pagination = pagination;
    return <div>투표 목록</div>;
  },
}));

function renderClient() {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={queryClient}>
      <OnlinePollAdminClient />
    </QueryClientProvider>,
  );
}

/**
 * [ADR-0036] 온라인 투표 관리의 URL `?page=` 는 다른 목록 화면과 같이 1부터다 — `?page=1`(또는 생략)이 첫 페이지이고,
 * 서버 요청 `page` 와 같은 번호다. 종전에는 이 화면만 0부터라 `?page=1` 이 둘째 페이지였고, 공유한 링크가 한 칸 어긋났다.
 */
describe('OnlinePollAdminClient — URL 페이지 번호(ADR-0036)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.query = '';
    mocks.pagination = undefined;
    mocks.list.mockResolvedValue({ list: [], total: 45 });
  });

  it('page 가 없으면 첫 페이지(page 1)를 조회하고 표도 1페이지를 가리킨다', async () => {
    renderClient();

    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1, kind: 'POLL' })));
    expect(mocks.pagination?.currentPage).toBe(1);
  });

  it('?page=2 는 둘째 페이지다 — 서버에 page 2 를 보내고 표도 2페이지를 가리킨다', async () => {
    mocks.query = 'page=2';
    renderClient();

    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ page: 2 })));
    expect(mocks.list).not.toHaveBeenCalledWith(expect.objectContaining({ page: 3 }));
    expect(mocks.pagination?.currentPage).toBe(2);
  });

  it('?page=0 처럼 1 미만이거나 숫자가 아닌 값은 첫 페이지로 읽는다 — 서버에 page 0 을 보내지 않는다', async () => {
    mocks.query = 'page=0';
    renderClient();

    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith(expect.objectContaining({ page: 1 })));
    expect(mocks.list).not.toHaveBeenCalledWith(expect.objectContaining({ page: 0 }));
  });

  it('표에서 3페이지를 고르면 ?page=3 을 쓰고, 1페이지로 돌아오면 page 를 지운다', async () => {
    renderClient();
    await waitFor(() => expect(mocks.pagination).toBeDefined());

    act(() => mocks.pagination?.onPageChange(3));
    expect(mocks.replace).toHaveBeenLastCalledWith('/admin/survey/polls?page=3', { scroll: false });

    act(() => mocks.pagination?.onPageChange(1));
    expect(mocks.replace).toHaveBeenLastCalledWith('/admin/survey/polls', { scroll: false });
  });
});
