import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityRoleClient from '../SecurityRoleClient';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/RoleAdminService', () => ({
  roleAdminService: {
    getRoleList: mocks.list,
    createRole: mocks.create,
    deleteRole: mocks.remove,
  },
}));

vi.mock('@/app/components/layout/page-header', () => ({
  PageHeader: ({ title }: { title: string }) => <h1>{title}</h1>,
}));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: { title: string; actions: React.ReactNode }) => (
    <header>{title}{actions}</header>
  ),
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: { title: string; children: React.ReactNode }) => (
    <section><h2>{title}</h2>{children}</section>
  ),
}));
vi.mock('@/components/ui/hub/HubMetrics', () => ({
  HubMetricGrid: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
  HubMetricCard: ({ title, value }: { title: string; value: React.ReactNode }) => (
    <span>{title}: {value}</span>
  ),
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: { isOpen: boolean; title: string; children: React.ReactNode }) =>
    isOpen ? <section aria-label={title}>{children}</section> : null,
}));
vi.mock('@/app/components/ui/standard-form', () => ({
  FormField: ({ label, children, error, htmlFor }: {
    label: string;
    children: React.ReactNode;
    error?: string;
    htmlFor?: string;
  }) => (
    <div>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p id={`${htmlFor}-error`}>{error}</p> : null}
    </div>
  ),
}));
vi.mock('@/components/common/PagePagination', () => ({
  PagePagination: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <button type="button" onClick={() => onPageChange(2)}>롤 다음 페이지</button>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, pagination }: {
    columns: Array<{ accessor: (role: any) => React.ReactNode }>;
    data: Array<{ roleNm?: string }>;
    pagination?: { onPageChange: (page: number) => void };
  }) => (
    <div>
      {data.map((role, rowIndex) => (
        <div key={role.roleNm ?? rowIndex}>
          {columns.map((column, columnIndex) => <div key={columnIndex}>{column.accessor(role)}</div>)}
        </div>
      ))}
      {/* [2026-08-24 A1 이행] 별도 PagePagination 이 표 내장 페이저로 수렴했다. */}
      <button type="button" onClick={() => pagination?.onPageChange(2)}>롤 다음 페이지</button>
    </div>
  ),
}));

function renderClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SecurityRoleClient />
    </QueryClientProvider>,
  );
}

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
}

describe('SecurityRoleClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.list.mockResolvedValue({
      list: [{ roleId: 'ROLE_ADMIN', roleNm: '관리자 롤' }],
      page: 1,
      size: 10,
      total: 11,
      totalPage: 2,
    });
    mocks.create.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
  });

  it('converts the 1-based UI page to the 0-based API page', async () => {
    renderClient();

    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledWith({ page: 0, size: 10, searchKeyword: '' });
    });

    fireEvent.click(await screen.findByRole('button', { name: '롤 다음 페이지' }));

    await waitFor(() => {
      expect(mocks.list).toHaveBeenCalledWith({ page: 1, size: 10, searchKeyword: '' });
    });
  });

  it('validates required, length, and integer fields before creating a role', async () => {
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));

    const roleId = screen.getByLabelText('보안 롤 식별값(Role Code)');
    fireEvent.click(screen.getByRole('button', { name: /롤 아키텍처 배포/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('롤 ID를 입력해 주세요.')).toBeInTheDocument();
    expect(roleId).toHaveAttribute('aria-invalid', 'true');
    await waitFor(() => expect(roleId).toHaveFocus());

    fireEvent.change(roleId, { target: { value: 'R'.repeat(21) } });
    fireEvent.change(screen.getByLabelText('롤 레이블 명칭'), { target: { value: '신규 롤' } });
    fireEvent.change(screen.getByLabelText('접근 패턴 (URL/Resource Pattern)'), { target: { value: '/api/**' } });
    fireEvent.change(screen.getByLabelText('우선순위 (Sort Order)'), { target: { value: '-1' } });
    fireEvent.click(screen.getByRole('button', { name: /롤 아키텍처 배포/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('롤 ID: 최대 20자까지 입력할 수 있습니다.')).toBeInTheDocument();
    expect(screen.getByText('우선순위는 0 이상의 정수여야 합니다.')).toBeInTheDocument();
  });

  it('같은 tick의 롤 저장은 동기 잠금으로 한 번만 전송한다', async () => {
    const pending = deferred<void>();
    mocks.create.mockReturnValueOnce(pending.promise);
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));
    fireEvent.change(screen.getByLabelText('보안 롤 식별값(Role Code)'), { target: { value: 'ROLE_NEW' } });
    fireEvent.change(screen.getByLabelText('롤 레이블 명칭'), { target: { value: '신규 롤' } });
    fireEvent.change(screen.getByLabelText('접근 패턴 (URL/Resource Pattern)'), { target: { value: '/api/**' } });
    const submit = screen.getByRole('button', { name: /롤 아키텍처 배포/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    const remove = screen.getByRole('button', { name: '관리자 롤 롤 삭제' });
    expect(remove).toBeDisabled();
    fireEvent.click(remove);
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.remove).not.toHaveBeenCalled();
    await act(async () => pending.resolve());
  });

  it('maps a structured server field error inline, preserves values, and focuses that field', async () => {
    const pending = deferred<void>();
    mocks.create.mockReturnValueOnce(pending.promise);
    const serverError = {
      response: { data: { errors: [{ field: 'roleNm', message: '이미 사용 중인 롤 명칭입니다.' }] } },
    };
    renderClient();
    fireEvent.click(await screen.findByRole('button', { name: /신규 보안 롤 설정/ }));
    fireEvent.change(screen.getByLabelText('보안 롤 식별값(Role Code)'), { target: { value: 'ROLE_NEW' } });
    const roleName = screen.getByLabelText('롤 레이블 명칭');
    fireEvent.change(roleName, { target: { value: '입력한 롤 명칭' } });
    fireEvent.change(screen.getByLabelText('접근 패턴 (URL/Resource Pattern)'), { target: { value: '/api/**' } });

    fireEvent.click(screen.getByRole('button', { name: /롤 아키텍처 배포/ }));

    const cancel = screen.getByRole('button', { name: '취소' });
    await waitFor(() => expect(cancel).toBeDisabled());
    await act(async () => pending.reject(serverError));

    expect(await screen.findByText('이미 사용 중인 롤 명칭입니다.')).toBeVisible();
    expect(roleName).toHaveValue('입력한 롤 명칭');
    expect(roleName).toHaveAttribute('aria-invalid', 'true');
    expect(roleName).toHaveAttribute('aria-errormessage', 'roleNm-error');
    await waitFor(() => expect(roleName).toHaveFocus());
    expect(screen.getByRole('region', { name: '신규 세분화 보안 롤 설정' })).toBeInTheDocument();
    expect(cancel).toBeEnabled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('deleteRole 롤 삭제를 동기 잠금하고 pending 제어를 알리며 실패 시 행과 제어를 복구한다', async () => {
    const pending = deferred<void>();
    mocks.remove.mockReturnValueOnce(pending.promise);
    renderClient();
    await screen.findByText('관리자 롤');
    const remove = screen.getByRole('button', { name: '관리자 롤 롤 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '관리자 롤 롤 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: /신규 보안 롤 설정/ })).toBeDisabled();

    await act(async () => pending.reject(new Error('롤 삭제 API 장애')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 처리 중 시스템 예외가 발생했습니다.', 'error'));
    expect(screen.getByText('관리자 롤')).toBeVisible();
    expect(screen.getByRole('button', { name: '관리자 롤 롤 삭제' })).toBeEnabled();
  });
});
