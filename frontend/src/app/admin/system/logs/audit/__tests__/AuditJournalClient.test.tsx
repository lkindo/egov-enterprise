import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditJournalClient from '../AuditJournalClient';

/** 민감 작업 감사 원장(2026-10-01 결정 19). */
const mocks = vi.hoisted(() => ({ getAuditJournal: vi.fn() }));
vi.mock('@/services/foundation/system/OperationsRecordAdminService', () => ({
  operationsRecordAdminService: { getAuditJournal: mocks.getAuditJournal },
}));

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AuditJournalClient /></QueryClientProvider>);
}

describe('AuditJournalClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuditJournal.mockResolvedValue({
      list: [{
        id: '7', requestId: 'r-1', stage: 'COMMITTED', operation: 'ADMIN_PASSWORD_RESET', actorId: 'admin',
        occurredAt: '2026-10-01T09:00:00', targetId: 'USR_1', clientIp: '10.0.0.1', description: '민감 작업', httpStatus: null,
      }],
      total: 1,
    });
  });

  it('작업·단계·행위자·대상·접속 IP 를 보이고 단계는 사람이 읽는 말로 옮긴다', async () => {
    renderClient();
    expect(await screen.findByText('ADMIN_PASSWORD_RESET')).toBeInTheDocument();
    expect(screen.getByText('반영')).toBeInTheDocument();
    expect(screen.getByText('USR_1')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    expect(mocks.getAuditJournal).toHaveBeenCalledWith({ actorId: '', page: 0, size: 20 });
  });

  it('행위자 로그인 ID 는 조회할 때 적용하고 첫 페이지로 돌아간다', async () => {
    renderClient();
    await screen.findByText('ADMIN_PASSWORD_RESET');
    fireEvent.change(screen.getByLabelText('행위자 로그인 ID'), { target: { value: ' admin ' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.getAuditJournal).toHaveBeenLastCalledWith({ actorId: 'admin', page: 0, size: 20 }));
  });
});
