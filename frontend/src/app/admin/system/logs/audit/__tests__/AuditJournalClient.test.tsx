import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditJournalClient, { normalizeExportReason } from '../AuditJournalClient';
import { exportAuditJournalOperation } from '@/types/generated-operations';

/** 민감 작업 감사 원장(2026-10-01 결정 19, 2026-10-20 작업 종류·내보내기). */
const mocks = vi.hoisted(() => ({
  getAuditJournal: vi.fn(),
  getAuditJournalOperations: vi.fn(),
  navigateToDownload: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/services/foundation/system/OperationsRecordAdminService', () => ({
  operationsRecordAdminService: {
    getAuditJournal: mocks.getAuditJournal,
    getAuditJournalOperations: mocks.getAuditJournalOperations,
  },
}));
vi.mock('@/lib/navigation/full-result-download', () => ({ navigateToDownload: mocks.navigateToDownload }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><AuditJournalClient /></QueryClientProvider>);
}

const ROW = {
  id: '7', requestId: 'r-1', stage: 'COMMITTED', operation: 'ADMIN_PASSWORD_RESET', actorId: 'admin',
  occurredAt: '2026-10-01T09:00:00', targetId: 'USR_1', clientIp: '10.0.0.1', description: '민감 작업', httpStatus: null,
};

describe('AuditJournalClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.getAuditJournal.mockResolvedValue({ list: [ROW], total: 1 });
    mocks.getAuditJournalOperations.mockResolvedValue(['ADMIN_PASSWORD_RESET', 'AuditJournalApiController#getAuditJournal']);
  });

  it('작업·단계·행위자·대상·접속 IP 를 보이고 단계는 사람이 읽는 말로 옮긴다', async () => {
    renderClient();
    expect(await screen.findByText('ADMIN_PASSWORD_RESET', { selector: 'code' })).toBeInTheDocument();
    expect(screen.getByText('민감 작업')).toBeInTheDocument();
    expect(screen.getByText('반영')).toBeInTheDocument();
    expect(screen.getByText('USR_1')).toBeInTheDocument();
    expect(screen.getByText('10.0.0.1')).toBeInTheDocument();
    expect(mocks.getAuditJournal).toHaveBeenCalledWith({ actorId: '', page: 1, size: 20 });
  });

  it('행위자 로그인 ID 는 조회할 때 적용하고 첫 페이지로 돌아간다', async () => {
    renderClient();
    await screen.findByText('ADMIN_PASSWORD_RESET', { selector: 'code' });
    fireEvent.change(screen.getByLabelText('행위자 로그인 ID'), { target: { value: ' admin ' } });
    fireEvent.click(screen.getByRole('button', { name: '조회' }));
    await waitFor(() => expect(mocks.getAuditJournal).toHaveBeenLastCalledWith({ actorId: 'admin', page: 1, size: 20 }));
  });

  it('[2026-10-20] 작업 종류는 원장에 남은 작업 이름에서 고르고, 고르면 그 작업만 거른다', async () => {
    renderClient();
    const select = await screen.findByLabelText('작업 종류');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    expect(within(select).getByRole('option', { name: '전체 작업' })).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'ADMIN_PASSWORD_RESET' } });
    await waitFor(() => expect(mocks.getAuditJournal).toHaveBeenLastCalledWith({
      actorId: '', operation: 'ADMIN_PASSWORD_RESET', page: 1, size: 20,
    }));
  });

  it('[2026-10-20] 작업 종류로 0건이면 데이터가 없다고 하지 않고 조건에 맞는 기록이 없다고 말한다', async () => {
    mocks.getAuditJournal.mockResolvedValue({ list: [], total: 0 });
    renderClient();
    const select = await screen.findByLabelText('작업 종류');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    expect(await screen.findByText('기록된 민감 작업이 없습니다.')).toBeInTheDocument();

    fireEvent.change(select, { target: { value: 'ADMIN_PASSWORD_RESET' } });
    expect(await screen.findByText(/선택한 조건에 해당하는 기록이 없습니다/)).toBeInTheDocument();
  });

  it('[2026-10-20] 내보내기는 사유를 받고, 화면과 같은 조건과 사유를 실어 내려받는다', async () => {
    renderClient();
    const select = await screen.findByLabelText('작업 종류');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    fireEvent.change(select, { target: { value: 'ADMIN_PASSWORD_RESET' } });
    await waitFor(() => expect(mocks.getAuditJournal).toHaveBeenLastCalledWith(expect.objectContaining({ operation: 'ADMIN_PASSWORD_RESET' })));
    // 결과 건수를 받기 전에는 내보내기를 열지 않는다(사유 창이 건수를 말한다).
    const exportButton = screen.getByRole('button', { name: /전체 결과 내보내기/ });
    await waitFor(() => expect(exportButton).toBeEnabled());

    fireEvent.click(exportButton);
    const dialog = await screen.findByRole('dialog');
    expect(dialog).toHaveTextContent('감사 원장에 남습니다');

    // 사유가 없으면 내려받지 않고 사유를 요구한다.
    fireEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));
    expect(await within(dialog).findByRole('alert')).toHaveTextContent('2~200자');
    expect(mocks.navigateToDownload).not.toHaveBeenCalled();

    fireEvent.change(within(dialog).getByLabelText('내보내기 사유'), { target: { value: '  월간\n점검  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));
    await waitFor(() => expect(mocks.navigateToDownload).toHaveBeenCalledTimes(1));
    expect(mocks.navigateToDownload).toHaveBeenCalledWith(exportAuditJournalOperation, {
      operation: 'ADMIN_PASSWORD_RESET',
      reason: '월간 점검',
    });
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('감사 원장에 남습니다'), 'success');
  });

  it('[2026-10-20] 결과가 내보내기 상한을 넘으면 사유를 묻기 전에 조건을 좁히라고 알린다', async () => {
    mocks.getAuditJournal.mockResolvedValue({ list: [ROW], total: 100_001 });
    renderClient();
    await screen.findByText('ADMIN_PASSWORD_RESET', { selector: 'code' });

    fireEvent.click(screen.getByRole('button', { name: /전체 결과 내보내기/ }));

    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('상한'), 'error');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.navigateToDownload).not.toHaveBeenCalled();
  });

  it('사유 정규화는 서버와 같다 — 제어 문자는 공백으로, 앞뒤 공백은 지운다', () => {
    expect(normalizeExportReason('\t월간\r\n점검 ')).toBe('월간  점검');
    expect(normalizeExportReason('   ')).toBe('');
  });
});
