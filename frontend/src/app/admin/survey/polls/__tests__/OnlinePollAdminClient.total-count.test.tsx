import type { PropsWithChildren, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import OnlinePollAdminClient from '../OnlinePollAdminClient';

/**
 * 온라인 투표 목록이 셸 툴바에 넘기는 총 건수와 진행중·조회된 건수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `data?.total || 0` 으로 만들고 오류일 때만 비워, 첫 응답 전에는 툴바가 "총 0건" 을
 * 보이고 읽어 줬다. 같은 툴바의 '진행중 N건 · 조회된 N건 기준' 도 받지 않은 목록으로 세어 0건이라 했고, 실패해도 그랬다
 * (불러오는 중·실패를 '데이터 없음' 으로 말한다). 받은 목록이 없으면 두 표기를 모두 비운다.
 */
const mocks = vi.hoisted(() => ({ list: vi.fn() }));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { permissions: ['POLL_READ', 'POLL_READ_ALL'], authorizationVersion: 'poll-total-test-v1' } }),
}));
vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/survey/polls',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/services/business/user/poll/PollUserService', () => ({
  pollUserService: { getPollList: mocks.list, createPoll: vi.fn() },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ success: vi.fn(), error: vi.fn() }) }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸 툴바에 넘기는 두 표기만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, toolbarActions, children }: PropsWithChildren<{ totalCount?: number; toolbarActions?: ReactNode }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      <div data-testid="shell-toolbar-actions">{toolbarActions}</div>
      {children}
    </main>
  ),
}));
vi.mock('@/app/components/patterns/keyword-filter', () => ({ KeywordFilter: () => null }));
// 실패 시험이 실패 상태에 닿은 뒤에 보게, 표가 받은 오류만 드러낸다.
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ error }: { error?: unknown }) => <div data-testid="table-error">{error ? '조회 실패' : ''}</div>,
}));

const ACTIVE = { pollSn: 1, pollNm: '진행 투표', pollBgngYmd: '20000101', pollEndYmd: '29991231', pollDsuseYn: 'N' };
const CLOSED = { pollSn: 2, pollNm: '끝난 투표', pollBgngYmd: '20000101', pollEndYmd: '20000102', pollDsuseYn: 'N' };

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <OnlinePollAdminClient />
    </QueryClientProvider>,
  );
}

describe('온라인 투표 — 셸 툴바의 총 건수와 진행중·조회된 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('조회가 끝나기 전에는 총 건수도 진행중·조회된 건수도 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.list.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.list).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar-actions')).toBeEmptyDOMElement();
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 두 표기를 내지 않는다', async () => {
    mocks.list.mockResolvedValue({ list: [ACTIVE, CLOSED], total: 45 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(screen.getByTestId('shell-toolbar-actions')).toBeEmptyDOMElement();
      expect(mocks.list).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수와 받은 페이지의 진행중·조회된 건수를 낸다', async () => {
    mocks.list.mockResolvedValue({ list: [ACTIVE, CLOSED], total: 45 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('45'));
    expect(screen.getByTestId('shell-toolbar-actions')).toHaveTextContent('진행중 1건 · 조회된 2건 기준');
  });

  it('조회가 실패하면 두 표기를 내지 않는다', async () => {
    mocks.list.mockRejectedValue(new Error('투표 조회 실패'));
    renderList();

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('조회 실패'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar-actions')).toBeEmptyDOMElement();
  });
});
