import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPolicyAdminClient from '../LoginPolicyAdminClient';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/services/foundation/system/LoginPolicyAdminService', () => ({
  loginPolicyAdminService: {
    getLoginPolicyList: (...args: unknown[]) => mocks.list(...args),
    saveLoginPolicy: (...args: unknown[]) => mocks.save(...args),
  },
}));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/ui/hub/HubMetrics', () => ({
  HubMetricGrid: ({ children }: { children: ReactNode }) => <div>{children}</div>,
  HubMetricCard: ({ title, value }: { title: string; value: ReactNode }) => <span>{title}: {value}</span>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: { title: string; children: ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));
vi.mock('@/components/ui/hub/HubStatusBadge', () => ({ HubStatusBadge: () => <span /> }));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: {
    columns: Array<{ accessor: (item: Record<string, unknown>) => ReactNode }>;
    data: Array<Record<string, unknown>>;
  }) => (
    <div>{data.map((item, row) => columns.map((column, index) => (
      <div key={`${row}-${index}`}>{column.accessor(item)}</div>
    )))}</div>
  ),
}));
vi.mock('@/components/ui/dialog', () => ({
  Dialog: ({ open, children }: { open: boolean; children: ReactNode }) => open ? <>{children}</> : null,
  DialogContent: ({ children }: { children: ReactNode }) => <section>{children}</section>,
  DialogHeader: ({ children }: { children: ReactNode }) => <header>{children}</header>,
  DialogTitle: ({ children }: { children: ReactNode }) => <h2>{children}</h2>,
  DialogFooter: ({ children }: { children: ReactNode }) => <footer>{children}</footer>,
}));

const policy = {
  userId: 'tester',
  userNm: '테스트 사용자',
  ipAddr: '192.168.0.1',
  dpcnPrmYn: 'N',
  lmtYn: 'N',
  bgngTm: '09:00',
  endTm: '18:00',
  otpUseYn: 'Y',
  regYn: 'Y',
};

function renderClient() {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={queryClient}>
      <LoginPolicyAdminClient />
    </QueryClientProvider>,
  );
}

describe('LoginPolicyAdminClient validation behavior', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.list.mockResolvedValue({ list: [policy], total: 1, totalPage: 1 });
    mocks.save.mockResolvedValue(undefined);
  });

  it('invalid 값을 write하지 않고 summary와 첫 오류 필드로 연결한다', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사용자 로그인 정책 수정' }));
    const startTime = screen.getByRole('textbox', { name: '접속 허용 시작 시간' });
    fireEvent.change(startTime, { target: { value: '24:00' } });

    fireEvent.click(screen.getByRole('button', { name: '정책 동기화 적용' }));

    expect(await screen.findByText('시작 시간은 HH:mm 형식으로 입력해 주세요.')).toBeVisible();
    expect(mocks.save).not.toHaveBeenCalled();
    expect(startTime).toHaveAttribute('aria-invalid', 'true');
    expect(document.querySelector('[data-form-error-summary="true"]')).toHaveTextContent(/입력 오류/);
    await waitFor(() => expect(startTime).toHaveFocus());
  });

  it('structured server field 오류를 inline으로 표시하고 입력값과 모달을 보존한다', async () => {
    const message = '허용되지 않은 접속 제한 IP입니다.';
    mocks.save.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'ipAddr', message }] } },
    });
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: '테스트 사용자 로그인 정책 수정' }));
    const ip = screen.getByRole('textbox', { name: '접속 제한 IP' });
    fireEvent.change(ip, { target: { value: '10.20.30.40' } });

    fireEvent.click(screen.getByRole('button', { name: '정책 동기화 적용' }));

    expect(await screen.findByText(message)).toBeVisible();
    expect(ip).toHaveValue('10.20.30.40');
    expect(ip).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(ip).toHaveFocus());
    expect(screen.getByRole('button', { name: '정책 동기화 적용' })).toBeInTheDocument();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });
});
