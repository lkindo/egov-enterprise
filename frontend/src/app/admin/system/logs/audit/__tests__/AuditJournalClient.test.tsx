import { fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import AuditJournalClient, { normalizeExportReason } from '../AuditJournalClient';

/** 민감 작업 감사 원장(2026-10-01 결정 19, 2026-10-20 작업 종류·내보내기). */
const mocks = vi.hoisted(() => ({
  getAuditJournal: vi.fn(),
  getAuditJournalOperations: vi.fn(),
  exportAuditJournal: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/services/foundation/system/OperationsRecordAdminService', () => ({
  operationsRecordAdminService: {
    getAuditJournal: mocks.getAuditJournal,
    getAuditJournalOperations: mocks.getAuditJournalOperations,
    exportAuditJournal: mocks.exportAuditJournal,
  },
}));
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
    mocks.exportAuditJournal.mockResolvedValue(new Blob(['xlsx']));
    // jsdom 에는 객체 URL 이 없다 — 내려받기 앵커만 확인한다.
    URL.createObjectURL = vi.fn(() => 'blob:audit');
    URL.revokeObjectURL = vi.fn();
  });

  async function openExportDialog() {
    renderClient();
    const select = await screen.findByLabelText('작업 종류');
    await waitFor(() => expect(within(select).getAllByRole('option')).toHaveLength(3));
    fireEvent.change(select, { target: { value: 'ADMIN_PASSWORD_RESET' } });
    await waitFor(() => expect(mocks.getAuditJournal).toHaveBeenLastCalledWith(expect.objectContaining({ operation: 'ADMIN_PASSWORD_RESET' })));
    const exportButton = screen.getByRole('button', { name: /전체 결과 내보내기/ });
    await waitFor(() => expect(exportButton).toBeEnabled());
    fireEvent.click(exportButton);
    return screen.findByRole('dialog');
  }

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

  it('[2026-10-20] 내보내기는 사유를 받고, 화면과 같은 조건과 사유를 실어 파일로 받는다', async () => {
    const dialog = await openExportDialog();
    expect(dialog).toHaveTextContent('감사 원장에 남습니다');
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});

    // 사유가 없으면 받지 않고, 오류 요약과 칸의 오류를 보이며 사유 칸으로 초점을 옮긴다.
    fireEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));
    expect(await within(dialog).findAllByText(/2~200자로 입력하세요/)).not.toHaveLength(0);
    const reasonField = within(dialog).getByLabelText('내보내기 사유');
    await waitFor(() => expect(reasonField).toHaveFocus());
    expect(reasonField).toHaveAttribute('aria-invalid', 'true');
    expect(mocks.exportAuditJournal).not.toHaveBeenCalled();

    fireEvent.change(reasonField, { target: { value: '  월간\n점검  ' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));
    await waitFor(() => expect(mocks.exportAuditJournal).toHaveBeenCalledTimes(1));
    expect(mocks.exportAuditJournal).toHaveBeenCalledWith({ operation: 'ADMIN_PASSWORD_RESET', reason: '월간 점검' });
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('감사 원장에 남습니다'), 'success');
    await waitFor(() => expect(screen.queryByRole('dialog')).not.toBeInTheDocument());
    click.mockRestore();
  });

  it('[2026-10-20] 서버가 거부하면 그 이유를 보이고 입력한 사유를 남긴다', async () => {
    mocks.exportAuditJournal.mockRejectedValue({
      isAxiosError: true,
      response: { status: 400, data: { message: '사유가 감사 기준에 맞지 않습니다.', errors: [{ field: 'reason', message: '사유를 다시 적어 주세요.' }] } },
    });
    const dialog = await openExportDialog();
    const reasonField = within(dialog).getByLabelText('내보내기 사유');
    fireEvent.change(reasonField, { target: { value: '월간 점검' } });
    fireEvent.click(within(dialog).getByRole('button', { name: '내보내기' }));

    expect(await within(dialog).findAllByText('사유를 다시 적어 주세요.')).not.toHaveLength(0);
    expect(within(dialog).getByText(/입력한 사유는 유지됩니다/)).toBeInTheDocument();
    expect(reasonField).toHaveValue('월간 점검');
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });

  it('[2026-10-20] 받는 동안 두 번 눌러도 한 번만 요청하고 단추를 잠근다', async () => {
    let resolve: (blob: Blob) => void = () => {};
    mocks.exportAuditJournal.mockReturnValue(new Promise<Blob>((done) => { resolve = done; }));
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {});
    const dialog = await openExportDialog();
    fireEvent.change(within(dialog).getByLabelText('내보내기 사유'), { target: { value: '월간 점검' } });
    // 단추의 비활성화와 따로, 폼 제출 자체를 두 번 보내도 잠금이 한 번만 요청하게 한다(Enter 연타·보조 기술 제출).
    const form = within(dialog).getByRole('form', { name: '감사 원장 내보내기' });
    fireEvent.submit(form);
    fireEvent.submit(form);
    await waitFor(() => expect(within(dialog).getByRole('button', { name: /내보내는 중/ })).toBeDisabled());
    expect(mocks.exportAuditJournal).toHaveBeenCalledTimes(1);
    resolve(new Blob(['xlsx']));
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1));
    click.mockRestore();
  });

  it('[2026-10-20] 결과가 내보내기 상한을 넘으면 사유를 묻기 전에 조건을 좁히라고 알린다', async () => {
    mocks.getAuditJournal.mockResolvedValue({ list: [ROW], total: 100_001 });
    renderClient();
    await screen.findByText('ADMIN_PASSWORD_RESET', { selector: 'code' });

    fireEvent.click(screen.getByRole('button', { name: /전체 결과 내보내기/ }));

    expect(mocks.toast).toHaveBeenCalledWith(expect.stringContaining('상한'), 'error');
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(mocks.exportAuditJournal).not.toHaveBeenCalled();
  });

  it('사유 정규화는 서버와 같다 — 제어 문자는 공백으로, 앞뒤 공백은 지운다', () => {
    expect(normalizeExportReason('\t월간\r\n점검 ')).toBe('월간  점검');
    expect(normalizeExportReason('   ')).toBe('');
  });
});
