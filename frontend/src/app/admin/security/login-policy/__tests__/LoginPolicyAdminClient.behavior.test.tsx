import type { ReactNode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import LoginPolicyAdminClient from '../LoginPolicyAdminClient';

const mocks = vi.hoisted(() => ({
  list: vi.fn(),
  save: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
  confirm: vi.fn(),
  toast: vi.fn(),
}));

vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));

vi.mock('@/services/foundation/system/LoginPolicyAdminService', () => ({
  loginPolicyAdminService: {
    getLoginPolicyList: (...args: unknown[]) => mocks.list(...args),
    saveLoginPolicy: (...args: unknown[]) => mocks.save(...args),
    createLoginPolicy: (...args: unknown[]) => mocks.create(...args),
    deleteLoginPolicy: (...args: unknown[]) => mocks.remove(...args),
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
    mocks.create.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
    mocks.confirm.mockResolvedValue(true);
  });

  /*
    [2026-09-08] 신규 등록 경로.

    목록(searchLoginPolicies)은 **전체 사용자**를 좌측 조인으로 돌려주고 regYn 이 정책 존재
    여부다. 그런데 화면에 등록 경로가 없어, 정책이 없는 사용자를 골라 저장하면 서버
    updateLoginPolicy 가 404 를 냈다 — 새 사용자에게 IP 제한·OTP 를 걸 방법이 없었다.
  */
  it('정책이 없는 사용자는 등록 경로로 저장한다', async () => {
    mocks.list.mockResolvedValue({
      list: [{ ...policy, userId: 'newbie', userNm: '신규 사용자', regYn: 'N' }],
      total: 1,
      totalPage: 1,
    });
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '신규 사용자 로그인 정책 수정' }));
    // 화면이 그 사실을 먼저 말한다 — 저장하고 나서 알게 하지 않는다.
    expect(screen.getByText(/아직 로그인 정책이 없습니다/)).toBeVisible();

    fireEvent.click(screen.getByRole('button', { name: '정책 동기화 적용' }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(mocks.create.mock.calls[0][0]).toBe('newbie');
    expect(mocks.save).not.toHaveBeenCalled();
  });

  /*
    [2026-09-08] 정책 해제.

    ⚠ 정책을 **비우는 것**(lmtYn='N'·ipAddr='')과 **지우는 것**은 다르다. 비우면 행이 남아
    목록에 regYn='Y'(정책 보유)로 계속 표시되고, 지워야 regYn='N' 이 된다 — 화면에는 정책을
    완전히 해제할 방법이 없었다.
  */
  it('정책 해제는 중복 실행을 막고 진행을 드러내며 실패 사유를 그대로 알린다', async () => {
    let reject: (error: unknown) => void = () => undefined;
    mocks.remove.mockReturnValue(new Promise((_resolve, next) => { reject = next; }));
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '테스트 사용자 로그인 정책 해제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    // 무엇이 사라지는지 확인 본문이 밝힌다.
    expect(mocks.confirm.mock.calls[0][0].message).toContain('2단계 인증');

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('tester'));
    const pending = screen.getByRole('button', { name: '테스트 사용자 로그인 정책 해제' });
    expect(pending).toBeDisabled();
    expect(pending).toHaveAttribute('aria-busy', 'true');
    fireEvent.click(pending);
    expect(mocks.remove).toHaveBeenCalledTimes(1);

    reject({ response: { data: { message: '정책을 해제하지 못했습니다.' } } });
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith(
      expect.stringContaining('정책을 해제하지 못했습니다.'),
      'error',
    ));
  });

  it('정책이 없는 사용자에게는 해제를 노출하지 않는다 — 지울 것이 없는 삭제 버튼은 거짓 어포던스다', async () => {
    mocks.list.mockResolvedValue({
      list: [{ ...policy, userId: 'newbie', userNm: '신규 사용자', regYn: 'N' }],
      total: 1,
      totalPage: 1,
    });
    renderClient();

    await screen.findByRole('button', { name: '신규 사용자 로그인 정책 수정' });
    expect(screen.queryByRole('button', { name: '신규 사용자 로그인 정책 해제' })).toBeNull();
  });

  it('정책이 있는 사용자는 수정 경로로 저장한다', async () => {
    renderClient();

    fireEvent.click(await screen.findByRole('button', { name: '테스트 사용자 로그인 정책 수정' }));
    expect(screen.queryByText(/아직 로그인 정책이 없습니다/)).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '정책 동기화 적용' }));

    await waitFor(() => expect(mocks.save).toHaveBeenCalledTimes(1));
    expect(mocks.create).not.toHaveBeenCalled();
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
