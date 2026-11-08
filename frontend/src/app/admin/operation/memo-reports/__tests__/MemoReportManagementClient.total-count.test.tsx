import type { PropsWithChildren, ReactNode } from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import MemoReportManagementClient from '../MemoReportManagementClient';

/**
 * 메모 보고 목록이 셸 툴바에 넘기는 총 건수와 현재 페이지 미열람 수.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `reportsData?.total ?? 0` 으로 만들고 오류일 때만 비워, 첫 응답 전에는 툴바가
 * "총 0건" 을 보이고 읽어 줬다. 같은 툴바의 '현재 페이지 미열람 N건' 도 받지 않은 목록으로 세어 0건이라 했고, 실패해도 그랬다
 * (불러오는 중·실패를 '데이터 없음' 으로 말한다). 받은 목록이 없으면 두 수를 모두 비운다.
 */
const mocks = vi.hoisted(() => ({ getReceivedReports: vi.fn() }));

vi.mock('next/navigation', () => ({
  useRouter: () => ({ replace: vi.fn() }),
  usePathname: () => '/admin/operation/memo-reports',
  useSearchParams: () => new URLSearchParams(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { role: 'ROLE_USER', esntlId: 'USR_B', permissions: ['MEMO_RPT_READ'], authorizationVersion: 'v1' } }),
}));
vi.mock('@/services/business/memoreport/memoReportService', () => ({
  memoReportService: { getReceivedReports: mocks.getReceivedReports, getMyReports: vi.fn(), getMemoReports: vi.fn(), getMemoReport: vi.fn() },
}));
vi.mock('@/services/foundation/file/FileService', () => ({ fileService: { downloadFile: vi.fn() } }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => vi.fn() }));
vi.mock('@/app/components/ui/user-picker', () => ({ UserPicker: () => null }));
vi.mock('@/app/components/ui/standard-modal', () => ({ StandardModal: () => null }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸 툴바에 넘기는 두 수만 본다.
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

const UNREAD = { memoRptSn: 5, rptTtl: '3분기 운영 보고', userId: 'USR_A', rptrId: 'USR_B', memoRptYmd: '20260828' };
const READ = { ...UNREAD, memoRptSn: 6, rptTtl: '4분기 운영 보고', rptrInqDt: '2026-10-01T09:00:00' };

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <MemoReportManagementClient />
    </QueryClientProvider>,
  );
}

describe('메모 보고 — 셸 툴바의 총 건수와 미열람 수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.localStorage.clear();
  });

  it('조회가 끝나기 전에는 총 건수도 미열람 수도 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getReceivedReports.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getReceivedReports).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar-actions')).toBeEmptyDOMElement();
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 두 수를 내지 않는다', async () => {
    mocks.getReceivedReports.mockResolvedValue({ list: [UNREAD, READ], total: 7 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(screen.getByTestId('shell-toolbar-actions')).toBeEmptyDOMElement();
      expect(mocks.getReceivedReports).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수와 받은 페이지의 미열람 수를 낸다', async () => {
    mocks.getReceivedReports.mockResolvedValue({ list: [UNREAD, READ], total: 7 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
    expect(screen.getByTestId('shell-toolbar-actions')).toHaveTextContent('현재 페이지 미열람 1건');
  });

  it('조회가 실패하면 두 수를 내지 않는다', async () => {
    mocks.getReceivedReports.mockRejectedValue(new Error('메모 보고 조회 실패'));
    renderList();

    await waitFor(() => expect(screen.getByTestId('table-error')).toHaveTextContent('조회 실패'));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
    expect(screen.getByTestId('shell-toolbar-actions')).toBeEmptyDOMElement();
  });
});
