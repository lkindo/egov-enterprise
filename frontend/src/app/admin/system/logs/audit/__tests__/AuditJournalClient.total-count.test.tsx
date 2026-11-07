import type { PropsWithChildren, ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider, onlineManager } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditJournalClient from '../AuditJournalClient';

/**
 * 민감 작업 감사 원장이 셸 툴바에 넘기는 총 건수와, 같은 총 건수를 쓰는 전체 결과 내보내기.
 *
 * [2026-11-08 화면 용어 원장 후속] 총계를 `data?.total ?? 0` 으로 만들고 오류일 때만 비워, 첫 응답 전(또는 오프라인으로
 * 조회가 멈춘 동안)에는 툴바가 "총 0건" 을 보이고 aria-live 로 읽어 줬다 — 불러오는 중을 '데이터 없음' 으로 말한다.
 * 내보내기 단추는 `isLoading` 으로만 잠가, 오프라인 정지(isLoading false)에서는 열려 대화상자가 "지금 조건에 맞는 0건" 이라고
 * 말하고 상한 검사도 0건으로 통과했다.
 */
const mocks = vi.hoisted(() => ({ getAuditJournal: vi.fn(), getAuditJournalOperations: vi.fn() }));

vi.mock('@/services/foundation/system/OperationsRecordAdminService', () => ({
  operationsRecordAdminService: {
    getAuditJournal: mocks.getAuditJournal,
    getAuditJournalOperations: mocks.getAuditJournalOperations,
  },
}));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: vi.fn() }) }));
// 셸과 표의 계약은 각자의 시험이 본다. 여기서는 이 화면이 셸에 넘기는 총 건수와 내보내기 단추만 본다.
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ totalCount, actions, children }: PropsWithChildren<{ totalCount?: number; actions?: ReactNode }>) => (
    <main>
      <output data-testid="shell-total-count">{totalCount === undefined ? '없음' : String(totalCount)}</output>
      {actions}
      {children}
    </main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({ StandardDataTable: () => <div /> }));

function renderList() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={client}>
      <AuditJournalClient />
    </QueryClientProvider>,
  );
}

const exportButton = () => screen.getByRole('button', { name: /전체 결과 내보내기/ });

describe('민감 작업 감사 원장 — 셸 툴바의 총 건수', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuditJournalOperations.mockResolvedValue([]);
  });

  it('조회가 끝나기 전에는 총 건수를 내지 않는다 — 0건이라고 말하지 않는다', async () => {
    mocks.getAuditJournal.mockReturnValue(new Promise(() => undefined));
    renderList();

    await waitFor(() => expect(mocks.getAuditJournal).toHaveBeenCalledTimes(1));
    expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음');
  });

  // 오프라인이면 TanStack v5 는 조회를 멈추고(fetchStatus 'paused') isLoading 이 false 다 — 받은 값이 없으면 0건이 아니다.
  it('오프라인으로 조회가 멈춰 받은 값이 없을 때도 총 건수를 내지 않는다', async () => {
    mocks.getAuditJournal.mockResolvedValue({ list: [], total: 7 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
      expect(mocks.getAuditJournal).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  // 같은 총 건수를 쓰는 내보내기도 받은 값이 없으면 열리지 않는다 — 대화상자가 "0건" 을 말하지 않고 상한 검사가 0건으로 통과하지 않는다.
  it('오프라인으로 조회가 멈춰 받은 값이 없으면 전체 결과 내보내기를 잠근다', async () => {
    mocks.getAuditJournal.mockResolvedValue({ list: [], total: 7 });
    onlineManager.setOnline(false);
    try {
      renderList();
      await waitFor(() => expect(exportButton()).toBeDisabled());
      fireEvent.click(exportButton());
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
      expect(mocks.getAuditJournal).not.toHaveBeenCalled();
    } finally {
      onlineManager.setOnline(true);
    }
  });

  it('조회가 끝나면 서버가 센 총 건수를 내고 내보내기를 연다', async () => {
    mocks.getAuditJournal.mockResolvedValue({ list: [], total: 7 });
    renderList();

    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('7'));
    expect(exportButton()).toBeEnabled();
  });

  it('조회가 실패하면 총 건수를 내지 않는다', async () => {
    mocks.getAuditJournal.mockRejectedValue(new Error('감사 원장 조회 실패'));
    renderList();

    await waitFor(() => expect(mocks.getAuditJournal).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(screen.getByTestId('shell-total-count')).toHaveTextContent('없음'));
  });
});
