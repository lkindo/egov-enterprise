import { act, fireEvent, render, screen, waitFor } from '@testing-library/react';
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
  FormField: ({ label, children, error, htmlFor }: any) => (
    <div>
      <label htmlFor={htmlFor}>{label}</label>
      {children}
      {error ? <p id={`${htmlFor}-error`}>{error}</p> : null}
    </div>
  ),
}));
vi.mock('@/components/common/PagePagination', () => ({
  PagePagination: ({ onPageChange }: any) => (
    <button type="button" onClick={() => onPageChange(2)}>그룹 다음 페이지</button>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data, onRetry, pagination }: any) => (
    <div>
      {data.map((item: any, rowIndex: number) => (
        <div key={rowIndex}>
          {columns.map((column: any, index: number) => <div key={index}>{column.accessor(item)}</div>)}
        </div>
      ))}
      <button type="button" onClick={onRetry}>그룹 목록 재시도</button>
      {/* [2026-08-24 A1 이행] 별도 PagePagination 이 표 내장 페이저로 수렴했다. */}
      <button type="button" onClick={() => pagination?.onPageChange(2)}>그룹 다음 페이지</button>
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

function deferred<T>() {
  let resolve: (value: T) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;
  const promise = new Promise<T>((next, fail) => {
    resolve = next;
    reject = fail;
  });
  return { promise, reject, resolve };
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
    // [2026-08-24 A1 이행] 서버 총계는 지표 카드가 아니라 셸 결과 툴바가 한 곳에서 소유한다(G3).
    expect(screen.getByTestId('work-list-toolbar')).toHaveTextContent('총 12건');
    expect(screen.getByText('규정 설명이 제공되지 않음')).toBeInTheDocument();
    expect(screen.getByText('N/A')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: '그룹 다음 페이지' }));
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 1, size: 10, searchKeyword: '' }));
    fireEvent.change(screen.getByRole('textbox', { name: '그룹ID 또는 그룹명 검색' }), {
      target: { value: '관리자' },
    });
    await waitFor(() => expect(mocks.list).toHaveBeenCalledWith({ page: 0, size: 10, searchKeyword: '관리자' }));
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

  it('같은 tick의 그룹 저장은 동기 잠금으로 한 번만 전송한다', async () => {
    const pending = deferred<void>();
    mocks.create.mockReturnValueOnce(pending.promise);
    renderClient();
    await screen.findByText('관리자 그룹');
    fireEvent.click(screen.getByRole('button', { name: /신규 보안 그룹 설정/ }));
    fireEvent.change(screen.getByPlaceholderText('그룹 식별자'), { target: { value: 'GROUP_NEW' } });
    fireEvent.change(screen.getByPlaceholderText('그룹 명칭 입력'), { target: { value: '신규 그룹' } });
    const submit = screen.getByRole('button', { name: /신규 그룹 배포/ });

    act(() => {
      submit.click();
      submit.click();
    });

    await waitFor(() => expect(mocks.create).toHaveBeenCalledTimes(1));
    expect(submit).toBeDisabled();
    expect(submit).toHaveAttribute('aria-busy', 'true');
    const cancel = screen.getByRole('button', { name: '취소' });
    expect(cancel).toBeDisabled();
    const remove = screen.getByRole('button', { name: '관리자 그룹 그룹 삭제' });
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
      response: { data: { errors: [{ field: 'groupNm', message: '이미 사용 중인 그룹 명칭입니다.' }] } },
    };
    renderClient();
    await screen.findByText('관리자 그룹');
    fireEvent.click(screen.getByRole('button', { name: /신규 보안 그룹 설정/ }));
    fireEvent.change(screen.getByLabelText('도메인 그룹 식별자(Group ID)'), {
      target: { value: 'GROUP_NEW' },
    });
    const groupName = screen.getByLabelText('그룹 레이블 명칭');
    fireEvent.change(groupName, { target: { value: '입력한 그룹 명칭' } });

    fireEvent.click(screen.getByRole('button', { name: /신규 그룹 배포/ }));

    const cancel = screen.getByRole('button', { name: '취소' });
    await waitFor(() => expect(cancel).toBeDisabled());
    await act(async () => pending.reject(serverError));

    expect(await screen.findByText('이미 사용 중인 그룹 명칭입니다.')).toBeVisible();
    expect(groupName).toHaveValue('입력한 그룹 명칭');
    expect(groupName).toHaveAttribute('aria-invalid', 'true');
    expect(groupName).toHaveAttribute('aria-errormessage', 'groupNm-error');
    await waitFor(() => expect(groupName).toHaveFocus());
    expect(screen.getByRole('region', { name: '신규 보안 도메인 그룹 설정' })).toBeInTheDocument();
    expect(cancel).toBeEnabled();
    expect(mocks.toast).not.toHaveBeenCalledWith(expect.any(String), 'error');
  });

  it('blocks invalid group values and moves focus to the first field that needs correction', async () => {
    renderClient();
    await screen.findByText('관리자 그룹');
    fireEvent.click(screen.getByRole('button', { name: /신규 보안 그룹 설정/ }));

    const groupId = screen.getByLabelText('도메인 그룹 식별자(Group ID)');
    fireEvent.click(screen.getByRole('button', { name: /신규 그룹 배포/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('그룹 ID를 입력해 주세요.')).toBeInTheDocument();
    expect(groupId).toHaveAttribute('aria-invalid', 'true');
    expect(groupId).toHaveAttribute('aria-errormessage', 'groupId-error');
    await waitFor(() => expect(groupId).toHaveFocus());

    fireEvent.change(groupId, { target: { value: 'G'.repeat(21) } });
    fireEvent.change(screen.getByLabelText('그룹 레이블 명칭'), { target: { value: '정상 그룹' } });
    fireEvent.click(screen.getByRole('button', { name: /신규 그룹 배포/ }));

    expect(mocks.create).not.toHaveBeenCalled();
    expect(await screen.findByText('그룹 ID: 최대 20자까지 입력할 수 있습니다.')).toBeInTheDocument();
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

  it('그룹 삭제를 동기 잠금하고 pending 제어를 알리며 실패 시 행과 제어를 복구한다', async () => {
    const pending = deferred<void>();
    mocks.remove.mockReturnValueOnce(pending.promise);
    renderClient();
    await screen.findByText('관리자 그룹');
    const remove = screen.getByRole('button', { name: '관리자 그룹 그룹 삭제' });

    act(() => {
      remove.click();
      remove.click();
    });

    await waitFor(() => expect(mocks.remove).toHaveBeenCalledTimes(1));
    const busy = screen.getByRole('button', { name: '관리자 그룹 그룹 삭제 중' });
    expect(busy).toBeDisabled();
    expect(busy).toHaveAttribute('aria-busy', 'true');
    expect(screen.getByRole('button', { name: '관리자 그룹 그룹 수정' })).toBeDisabled();
    expect(screen.getByRole('button', { name: /신규 보안 그룹 설정/ })).toBeDisabled();

    await act(async () => pending.reject(new Error('그룹 삭제 API 장애')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('삭제 처리 중 시스템 예외가 발생했습니다.', 'error'));
    expect(screen.getByText('관리자 그룹')).toBeVisible();
    expect(screen.getByRole('button', { name: '관리자 그룹 그룹 삭제' })).toBeEnabled();
    expect(screen.getByRole('button', { name: '관리자 그룹 그룹 수정' })).toBeEnabled();
  });
});
