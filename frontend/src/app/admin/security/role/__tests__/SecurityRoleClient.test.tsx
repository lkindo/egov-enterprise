import { fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  StandardModal: ({ isOpen, children }: { isOpen: boolean; children: React.ReactNode }) =>
    isOpen ? <section>{children}</section> : null,
}));
vi.mock('@/app/components/ui/standard-form', () => ({
  FormField: ({ label, children }: { label: string; children: React.ReactNode }) => (
    <label>{label}{children}</label>
  ),
}));
vi.mock('@/components/common/PagePagination', () => ({
  PagePagination: ({ onPageChange }: { onPageChange: (page: number) => void }) => (
    <button type="button" onClick={() => onPageChange(2)}>롤 다음 페이지</button>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ data, pagination }: {
    data: Array<{ roleNm?: string }>;
    pagination?: { onPageChange: (page: number) => void };
  }) => (
    <div>
      {data.map((role) => <span key={role.roleNm}>{role.roleNm}</span>)}
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
});
