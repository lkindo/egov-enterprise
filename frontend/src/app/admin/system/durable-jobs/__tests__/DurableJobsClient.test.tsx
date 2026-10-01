import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import DurableJobsClient from '../DurableJobsClient';

/**
 * 후속 작업 상태(2026-10-01 결정 19).
 *
 * 실패한 작업만, DWORK_RETRY 가 있을 때만 다시 처리하고, 확인을 거치며 같은 작업을 두 번 보내지 않는다.
 */
const mocks = vi.hoisted(() => ({
  permissions: [] as string[],
  getDurableJobs: vi.fn(),
  retryDurableJob: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));
vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({ user: { id: 'ops', name: '운영자', groups: [], permissions: mocks.permissions, authorizationVersion: 'v1' } }),
}));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/services/foundation/system/OperationsRecordAdminService', () => ({
  operationsRecordAdminService: { getDurableJobs: mocks.getDurableJobs, retryDurableJob: mocks.retryDurableJob },
}));

const JOBS = {
  list: [
    { id: '11', type: 'NOTIFICATION_DELIVERY', status: 'FAILED', attempts: 8, availableAt: '2026-10-01T01:00:00', completedAt: null },
    { id: '12', type: 'FILE_DELETE', status: 'SUCCEEDED', attempts: 1, availableAt: '2026-10-01T01:00:00', completedAt: '2026-10-01T01:00:05' },
  ],
  total: 2,
  totalPages: 1,
};

function renderClient() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(<QueryClientProvider client={client}><DurableJobsClient /></QueryClientProvider>);
}

describe('DurableJobsClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.permissions = ['DWORK_READ'];
    mocks.getDurableJobs.mockResolvedValue(JOBS);
  });

  it('작업 종류와 상태를 사람이 읽는 말로 보이고, 재처리 권한이 없으면 버튼을 두지 않는다', async () => {
    renderClient();
    expect(await screen.findByText('알림 전달')).toBeInTheDocument();
    expect(screen.getByText('첨부 파일 삭제')).toBeInTheDocument();
    expect(screen.getByText('실패')).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /다시 처리/ })).toBeNull();
  });

  it('실패한 작업만 확인 뒤 한 번 다시 처리하고, 처리 중에는 다시 누를 수 없다', async () => {
    mocks.permissions = ['DWORK_READ', 'DWORK_RETRY'];
    mocks.confirm.mockResolvedValue(true);
    let release: () => void = () => {};
    mocks.retryDurableJob.mockReturnValue(new Promise<void>((resolve) => { release = resolve; }));
    renderClient();
    const buttons = await screen.findAllByRole('button', { name: /다시 처리/ });
    expect(buttons).toHaveLength(1);

    fireEvent.click(buttons[0]);
    fireEvent.click(buttons[0]);
    await waitFor(() => expect(mocks.retryDurableJob).toHaveBeenCalledTimes(1));
    expect(mocks.retryDurableJob).toHaveBeenCalledWith('11');
    expect(mocks.confirm).toHaveBeenCalledTimes(1);
    await waitFor(() => expect(screen.getByRole('button', { name: /다시 처리/ })).toBeDisabled());
    expect(screen.getByRole('button', { name: /다시 처리/ })).toHaveAttribute('aria-busy', 'true');

    release();
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('작업을 다시 처리 대기로 돌렸습니다.', 'success'));
  });

  it('재처리 실패는 사유를 알리고, 확인을 취소하면 보내지 않는다', async () => {
    mocks.permissions = ['DWORK_READ', 'DWORK_RETRY'];
    mocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mocks.retryDurableJob.mockRejectedValue(new Error('이미 처리 중인 작업입니다.'));
    renderClient();
    const button = await screen.findByRole('button', { name: /다시 처리/ });

    fireEvent.click(button);
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.retryDurableJob).not.toHaveBeenCalled();

    fireEvent.click(button);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(expect.any(String), 'error'));
    expect(screen.getByRole('button', { name: /다시 처리/ })).not.toBeDisabled();
  });
});
