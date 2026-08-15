import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import SecurityGroupClient from '../SecurityGroupClient';

const mocks = vi.hoisted(() => ({
  toast: vi.fn(),
  confirm: vi.fn(),
  list: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
}));

vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/services/foundation/system/GroupAdminService', () => ({
  groupAdminService: {
    getGroupList: mocks.list,
    createGroup: mocks.create,
    updateGroup: mocks.update,
    deleteGroup: mocks.remove,
  },
}));

vi.mock('@/app/components/layout/page-header', () => ({ PageHeader: ({ title }: any) => <h1>{title}</h1> }));
vi.mock('@/components/ui/hub/HubHeader', () => ({
  HubHeader: ({ title, actions }: any) => <header>{title}{actions}</header>,
}));
vi.mock('@/components/ui/hub/HubSectionCard', () => ({
  HubSectionCard: ({ title, children }: any) => <section><h2>{title}</h2>{children}</section>,
}));
vi.mock('@/components/ui/hub/HubMetrics', () => ({
  HubMetricGrid: ({ children }: any) => <div>{children}</div>,
  HubMetricCard: ({ title, value }: any) => <span>{title}: {value}</span>,
}));
vi.mock('@/app/components/ui/standard-modal', () => ({
  StandardModal: ({ isOpen, title, children }: any) => isOpen
    ? <section aria-label={title}>{children}</section>
    : null,
}));
vi.mock('@/app/components/ui/standard-form', () => ({
  FormField: ({ label, children }: any) => <label>{label}{children}</label>,
}));
vi.mock('@/components/common/PagePagination', () => ({
  PagePagination: ({ onPageChange }: any) => (
    <button type="button" onClick={() => onPageChange(2)}>그룹 다음 페이지</button>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRetry }: any) => (
    <div>
      {data.map((item: any, rowIndex: number) => (
        <div key={rowIndex}>
          {columns.map((column: any, index: number) => <div key={index}>{column.accessor(item)}</div>)}
        </div>
      ))}
      <button type="button" onClick={onRetry}>그룹 목록 재시도</button>
    </div>
  ),
}));

const group = {
  groupId: 'GROUP_ADMIN',
  groupNm: '관리자 그룹',
  groupDc: '관리자 접근 정책',
  groupCrtDt: '2026-08-15',
};
const unnamedGroup = {
  groupId: 'GROUP_EMPTY',
  groupNm: '',
  groupDc: '',
};

function renderClient() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <SecurityGroupClient />
    </QueryClientProvider>,
  );
}

describe('SecurityGroupClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.confirm.mockResolvedValue(true);
    mocks.list.mockResolvedValue({ list: [group, unnamedGroup], page: 1, size: 10, total: 12, totalPage: 2 });
    mocks.create.mockResolvedValue(undefined);
    mocks.update.mockResolvedValue(undefined);
    mocks.remove.mockResolvedValue(undefined);
  });

  it('loads server totals and resets paging for search', async () => {
    renderClient();

    expect(await screen.findByText('관리자 그룹')).toBeInTheDocument();
    expect(screen.getByText('전체 보안 그룹: 12')).toBeInTheDocument();
    expect(screen.getByText('규정 설명이 제공되지 않음')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '그룹 다음 페이지' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 1, searchKeyword: '' }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹ID 또는 그룹명 검색' }), {
      target: { value: '관리자' },
    });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 0, searchKeyword: '관리자' }));
    fireEvent.submit(screen.getByRole('button', { name: '그룹 검색' }).closest('form')!);
    fireEvent.click(screen.getByRole('button', { name: '보안 그룹 목록 새로고침' }));
    fireEvent.click(screen.getByRole('button', { name: '그룹 목록 재시도' }));
  });

  it('creates a group from controlled form fields', async () => {
    renderClient();
    await screen.findByText('관리자 그룹');
    fireEvent.click(screen.getByRole('button', { name: /신규 보안 그룹 설정/ }));

    fireEvent.change(screen.getByPlaceholderText('그룹 식별자'), { target: { value: 'GROUP_NEW' } });
    fireEvent.change(screen.getByPlaceholderText('그룹 명칭 입력'), { target: { value: '신규 그룹' } });
    fireEvent.change(screen.getByPlaceholderText('상세 명세 입력...'), { target: { value: '신규 정책' } });
    fireEvent.click(screen.getByRole('button', { name: /신규 그룹 배포/ }));

    await waitFor(() => expect(mocks.create).toHaveBeenCalledWith({
      groupId: 'GROUP_NEW', groupNm: '신규 그룹', groupDc: '신규 정책',
    }));
    expect(mocks.toast).toHaveBeenCalledWith('신규 보안 그룹 아키텍처가 설정되었습니다.', 'success');
  });

  it('updates and permanently deletes the exact selected group', async () => {
    renderClient();
    await screen.findByText('관리자 그룹');

    fireEvent.click(screen.getByRole('button', { name: '관리자 그룹 그룹 수정' }));
    expect(screen.getByRole('region', { name: '보안 그룹 아키텍처 수정' })).toBeInTheDocument();
    expect(screen.getByPlaceholderText('그룹 식별자')).toBeDisabled();
    fireEvent.change(screen.getByPlaceholderText('그룹 명칭 입력'), { target: { value: '수정 관리자' } });
    fireEvent.click(screen.getByRole('button', { name: 'Zap그룹 수정' }));
    await waitFor(() => expect(mocks.update).toHaveBeenCalledWith('GROUP_ADMIN', expect.objectContaining({ groupNm: '수정 관리자' })));

    fireEvent.click(screen.getByRole('button', { name: '관리자 그룹 그룹 삭제' }));
    await waitFor(() => expect(mocks.remove).toHaveBeenCalledWith('GROUP_ADMIN'));
    expect(mocks.confirm).toHaveBeenCalledWith(expect.objectContaining({
      message: expect.stringContaining('관리자 그룹'), variant: 'destructive',
    }));
  });

  it('keeps the group when deletion confirmation is declined and reports service errors', async () => {
    mocks.confirm.mockResolvedValueOnce(false).mockResolvedValueOnce(true);
    mocks.remove.mockRejectedValueOnce(new Error('delete failed'));
    renderClient();
    await screen.findByText('관리자 그룹');

    fireEvent.click(screen.getByRole('button', { name: '관리자 그룹 그룹 삭제' }));
    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    expect(mocks.remove).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole('button', { name: '관리자 그룹 그룹 삭제' }));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 처리 중 시스템 예외가 발생했습니다.', 'error'));
  });
});
