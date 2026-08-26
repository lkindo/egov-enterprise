import React from 'react';
import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  confirm: vi.fn(),
  createManual: vi.fn(),
  deleteManual: vi.fn(),
  manuals: [] as Array<Record<string, unknown>>,
  refetch: vi.fn(),
  replace: vi.fn(),
  toast: vi.fn(),
  updateManual: vi.fn(),
}));

vi.mock('next/navigation', () => ({
  usePathname: () => '/admin/uss/olh/online-manual',
  useRouter: () => ({ replace: mocks.replace }),
  useSearchParams: () => new URLSearchParams(),
}));

vi.mock('@tanstack/react-query', () => ({
  useQuery: () => ({
    data: { list: mocks.manuals, total: mocks.manuals.length, totalPage: 1 },
    isLoading: false,
    isError: false,
    error: null,
    refetch: mocks.refetch,
    isFetching: false,
  }),
}));

vi.mock('@/services/foundation/user/ManualAdminService', () => ({
  manualAdminService: {
    getManualList: vi.fn(),
    createManual: mocks.createManual,
    updateManual: mocks.updateManual,
    deleteManual: mocks.deleteManual,
  },
}));

vi.mock('@/app/components/ui/toast', () => ({ useToast: () => ({ toast: mocks.toast }) }));
vi.mock('@/app/components/ui/confirm-modal', () => ({ useConfirm: () => mocks.confirm }));
vi.mock('@/lib/hooks/use-debounced-value', () => ({ useDebouncedValue: (value: string) => value }));
vi.mock('@/app/components/patterns/empty-result-message', () => ({ emptyResultMessage: (_value: string, fallback: string) => fallback }));
vi.mock('@/app/components/patterns/work-list-page', () => ({
  WorkListPage: ({ actions, filter, children }: React.PropsWithChildren<{ actions?: React.ReactNode; filter?: React.ReactNode }>) => (
    <main>{actions}{filter}{children}</main>
  ),
}));
vi.mock('@/app/components/ui/standard-data-table', () => ({
  StandardDataTable: ({ columns, data }: { columns: Array<{ accessor: (item: Record<string, unknown>, index: number) => React.ReactNode }>; data: Array<Record<string, unknown>> }) => (
    <div>{data.map((item, index) => <div key={String(item.onlnMnlSn)}>{columns.map((column, columnIndex) => <React.Fragment key={columnIndex}>{column.accessor(item, index)}</React.Fragment>)}</div>)}</div>
  ),
}));

import ManualAdminClient from '../ManualAdminClient';

function renderClient() {
  return render(<ManualAdminClient initialManuals={null} />);
}

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((nextResolve, nextReject) => {
    resolve = nextResolve;
    reject = nextReject;
  });
  return { promise, resolve, reject };
}

async function getManualFields(scope: ReturnType<typeof within>) {
  const submit = scope.getByRole('button', { name: /등록 완료|수정 완료/ });
  return {
    name: scope.getByRole('textbox', { name: /매뉴얼 명칭/ }),
    path: scope.getByRole('textbox', { name: '리소스 경로' }),
    description: scope.getByRole('textbox', { name: '상세 설명' }),
    cancel: scope.getByRole('button', { name: '취소' }),
    submit,
    form: submit.closest('form')!,
  };
}

async function openCreate(user: ReturnType<typeof userEvent.setup>) {
  renderClient();
  await user.click(screen.getByRole('button', { name: /새 매뉴얼 등록/ }));
  return getManualFields(within(await screen.findByRole('dialog')));
}

describe('ManualAdminClient form validation', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.manuals = [];
    mocks.confirm.mockResolvedValue(true);
    mocks.createManual.mockResolvedValue(1);
    mocks.deleteManual.mockResolvedValue(undefined);
    mocks.updateManual.mockResolvedValue(undefined);
  });

  it('공백 매뉴얼 명칭을 write sink로 보내지 않고 summary와 첫 오류 이동을 제공한다', async () => {
    const user = userEvent.setup();
    const fields = await openCreate(user);
    await user.type(fields.name, '   ');

    fireEvent.submit(fields.form);

    expect(mocks.createManual).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/매뉴얼 명칭.*입력/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('매뉴얼 명칭 max+1을 차단하고 해당 입력으로 이동한다', async () => {
    const user = userEvent.setup();
    const fields = await openCreate(user);
    fireEvent.change(fields.name, { target: { value: '가'.repeat(101) } });

    fireEvent.submit(fields.form);

    expect(mocks.createManual).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/100/)).not.toHaveLength(0);
    expect(document.querySelector('[data-form-error-summary="true"]')).toBeInTheDocument();
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('리소스 경로 max+1을 차단한다', async () => {
    const user = userEvent.setup();
    const fields = await openCreate(user);
    await user.type(fields.name, '운영 매뉴얼');
    fireEvent.change(fields.path, { target: { value: 'a'.repeat(1001) } });

    fireEvent.submit(fields.form);

    expect(mocks.createManual).not.toHaveBeenCalled();
    expect(await screen.findAllByText(/1000/)).not.toHaveLength(0);
    await waitFor(() => expect(fields.path).toHaveFocus());
  });

  it('수정 서버 필드 오류를 매뉴얼 명칭에 연결하고 입력값을 보존한다', async () => {
    mocks.manuals = [{
      onlnMnlSn: 7,
      onlnMnlNm: '기존 매뉴얼',
      onlnMnlDfn: '/manual/existing',
      onlnMnlExpln: '기존 설명',
      onlnMnlSeCd: 'GNR',
    }];
    mocks.updateManual.mockRejectedValueOnce({
      response: { data: { errors: [{ field: 'onlnMnlNm', message: '이미 사용 중인 매뉴얼 명칭입니다.' }] } },
    });
    const user = userEvent.setup();
    renderClient();
    await user.click(await screen.findByRole('button', { name: '기존 매뉴얼 수정' }));
    const fields = await getManualFields(within(await screen.findByRole('dialog')));

    fireEvent.submit(fields.form);

    expect(await screen.findAllByText('이미 사용 중인 매뉴얼 명칭입니다.')).not.toHaveLength(0);
    expect(fields.name).toHaveValue('기존 매뉴얼');
    expect(fields.path).toHaveValue('/manual/existing');
    await waitFor(() => expect(fields.name).toHaveFocus());
  });

  it('일반 서버 오류는 실제 메시지를 안내하고 입력값을 보존한다', async () => {
    mocks.createManual.mockRejectedValueOnce(new Error('매뉴얼 서버에 연결할 수 없습니다.'));
    const user = userEvent.setup();
    const fields = await openCreate(user);
    await user.type(fields.name, '보존할 매뉴얼');
    await user.type(fields.description, '보존할 설명');

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('매뉴얼 서버에 연결할 수 없습니다.', 'error'));
    expect(fields.name).toHaveValue('보존할 매뉴얼');
    expect(fields.description).toHaveValue('보존할 설명');
  });

  it('저장 pending 중 동기 재제출해도 write sink를 한 번만 호출한다', async () => {
    let resolveCreate!: (value: number) => void;
    mocks.createManual.mockReturnValueOnce(new Promise<number>((resolve) => { resolveCreate = resolve; }));
    const user = userEvent.setup();
    const fields = await openCreate(user);
    await user.type(fields.name, '중복 방지 매뉴얼');

    act(() => {
      fireEvent.submit(fields.form);
      fireEvent.submit(fields.form);
    });

    await waitFor(() => expect(mocks.createManual).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    resolveCreate(1);
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('새 매뉴얼을 등록했습니다.', 'success'));
  });

  it('수정 저장 pending 동안 delete를 막고 취소와 입력 상태를 보존한다', async () => {
    mocks.manuals = [{
      onlnMnlSn: 7,
      onlnMnlNm: '교차 잠금 매뉴얼',
      onlnMnlDfn: '/manual/cross-lock',
      onlnMnlExpln: '기존 설명',
      onlnMnlSeCd: 'GNR',
    }];
    const pending = deferred<void>();
    mocks.updateManual.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    renderClient();
    const editButton = await screen.findByRole('button', { name: '교차 잠금 매뉴얼 수정' });
    const deleteButton = screen.getByRole('button', { name: '교차 잠금 매뉴얼 삭제' });
    const createButton = screen.getByRole('button', { name: /새 매뉴얼 등록/ });
    await user.click(editButton);
    const fields = await getManualFields(within(await screen.findByRole('dialog')));
    await user.clear(fields.name);
    await user.type(fields.name, '수정 중 보존 매뉴얼');

    fireEvent.submit(fields.form);

    await waitFor(() => expect(mocks.updateManual).toHaveBeenCalledTimes(1));
    expect(fields.submit).toBeDisabled();
    expect(fields.submit).toHaveAttribute('aria-busy', 'true');
    expect(fields.cancel).toBeDisabled();
    expect(editButton).toBeDisabled();
    expect(deleteButton).toBeDisabled();
    expect(createButton).toBeDisabled();
    act(() => {
      deleteButton.click();
      fields.cancel.click();
    });
    expect(mocks.confirm).not.toHaveBeenCalled();
    expect(mocks.deleteManual).not.toHaveBeenCalled();
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => pending.reject(new Error('매뉴얼 수정 교차 오류')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('매뉴얼 수정 교차 오류', 'error'));
    expect(fields.name).toHaveValue('수정 중 보존 매뉴얼');
    expect(fields.cancel).toBeEnabled();
    expect(deleteButton).toBeEnabled();
    expect(createButton).toBeEnabled();
  });

  it('삭제 pending 동안 edit/update를 막고 모달 입력과 취소 상태를 보존한다', async () => {
    mocks.manuals = [{
      onlnMnlSn: 7,
      onlnMnlNm: '삭제 교차 매뉴얼',
      onlnMnlDfn: '/manual/delete-cross',
      onlnMnlExpln: '삭제 중 보존 설명',
      onlnMnlSeCd: 'GNR',
    }];
    const pending = deferred<void>();
    mocks.deleteManual.mockReturnValueOnce(pending.promise);
    const user = userEvent.setup();
    renderClient();
    const editButton = await screen.findByRole('button', { name: '삭제 교차 매뉴얼 수정' });
    const deleteButton = screen.getByRole('button', { name: '삭제 교차 매뉴얼 삭제' });
    const createButton = screen.getByRole('button', { name: /새 매뉴얼 등록/ });
    await user.click(editButton);
    const fields = await getManualFields(within(await screen.findByRole('dialog')));
    await user.clear(fields.description);
    await user.type(fields.description, '삭제 중에도 보존할 설명');

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.deleteManual).toHaveBeenCalledTimes(1));
    const pendingDelete = screen.getByRole('button', { name: '삭제 교차 매뉴얼 삭제 중…' });
    expect(pendingDelete).toBeDisabled();
    expect(pendingDelete).toHaveAttribute('aria-busy', 'true');
    expect(editButton).toBeDisabled();
    expect(createButton).toBeDisabled();
    expect(fields.submit).toBeDisabled();
    expect(fields.cancel).toBeDisabled();
    fireEvent.submit(fields.form);
    fields.cancel.click();
    await waitFor(() => expect(mocks.updateManual).not.toHaveBeenCalled());
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    await act(async () => pending.reject(new Error('매뉴얼 삭제 교차 오류')));

    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('매뉴얼 삭제 교차 오류', 'error'));
    expect(fields.description).toHaveValue('삭제 중에도 보존할 설명');
    expect(fields.submit).toBeEnabled();
    expect(fields.cancel).toBeEnabled();
    expect(createButton).toBeEnabled();
  });

  it('삭제는 같은 tick 중복 실행을 막고 pending·실패를 안내한다', async () => {
    mocks.manuals = [{
      onlnMnlSn: 7,
      onlnMnlNm: '삭제 대상 매뉴얼',
      onlnMnlDfn: '/manual/delete',
      onlnMnlExpln: '삭제 대상',
      onlnMnlSeCd: 'GNR',
    }];
    const pending = deferred<void>();
    mocks.deleteManual.mockReturnValueOnce(pending.promise);
    renderClient();
    const deleteButton = await screen.findByRole('button', { name: '삭제 대상 매뉴얼 삭제' });

    act(() => {
      deleteButton.click();
      deleteButton.click();
    });

    await waitFor(() => expect(mocks.confirm).toHaveBeenCalledTimes(1));
    await waitFor(() => expect(mocks.deleteManual).toHaveBeenCalledTimes(1));
    const pendingButton = screen.getByRole('button', { name: '삭제 대상 매뉴얼 삭제 중…' });
    expect(pendingButton).toBeDisabled();
    expect(pendingButton).toHaveAttribute('aria-busy', 'true');
    await act(async () => pending.reject(new Error('매뉴얼 삭제 서버 오류')));
    await waitFor(() => expect(mocks.toast).toHaveBeenCalledWith('매뉴얼 삭제 서버 오류', 'error'));
  });
});
